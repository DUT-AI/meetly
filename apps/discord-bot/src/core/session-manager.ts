import {
  AudioPlayer,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Guild, GuildMember, TextBasedChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { storageClient } from '../storage/minio-client';
import { AudioMixer } from './audio-mixer';
import { VoiceReceiverManager } from './voice-receiver';

// Standard 3-byte Opus silence frame (48kHz stereo, 20ms)
const OPUS_SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class OpusSilenceStream extends Readable {
  _read() {
    this.push(OPUS_SILENCE_FRAME);
  }
}

export interface MeetingResult {
  meetingId: string;
  durationSeconds: number;
  s3AudioUri: string;
  s3MetadataUri: string;
  presignedUrl?: string;
  speakerCount: number;
}

export interface ActiveSession {
  meetingId: string;
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  startTime: number;
  connection: VoiceConnection;
  tempDir: string;
  receiver: VoiceReceiverManager;
  silentPlayer?: AudioPlayer;
  silenceIntervalTimer?: NodeJS.Timeout;
  maxDurationTimeout?: NodeJS.Timeout;
  emptyChannelTimeout?: NodeJS.Timeout;
  isStopping?: boolean;
  stopPromise?: Promise<MeetingResult>;
}

export class SessionManager {
  private sessions = new Map<string, ActiveSession>();

  public getSession(guildId: string): ActiveSession | undefined {
    return this.sessions.get(guildId);
  }

  public isRecording(guildId: string): boolean {
    return this.sessions.has(guildId);
  }

  public isStopping(guildId: string): boolean {
    const session = this.sessions.get(guildId);
    return Boolean(session?.isStopping);
  }

  /**
   * Starts an active recording session in the member's voice channel.
   */
  public async startSession(
    member: GuildMember,
    textChannel: TextBasedChannel
  ): Promise<ActiveSession> {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      throw new Error('User is not in a voice channel.');
    }

    const guild = member.guild;
    if (this.sessions.has(guild.id)) {
      throw new Error('A recording session is already active in this server.');
    }

    const meetingId = uuidv4();
    const tempDir = path.join(config.TEMP_DIR, meetingId);
    fs.mkdirSync(tempDir, { recursive: true });

    // Join Discord Voice Channel (selfDeaf must be false to receive audio)
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`[VoiceConnection:${guild.id}] Transition: ${oldState.status} -> ${newState.status}`);
    });

    // Ensure UDP connection is fully established before attaching receiver
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      console.log(`[VoiceConnection:${guild.id}] Connection is READY. Initializing audio pipeline.`);
    } catch (connErr: any) {
      connection.destroy();
      throw new Error(`Failed to establish voice connection within 15s: ${connErr.message}`);
    }

    const startTime = Date.now();
    const receiver = new VoiceReceiverManager(connection, guild, tempDir, startTime);

    // 1. Proactively subscribe to all human participants present in the voice channel
    if (voiceChannel.members) {
      voiceChannel.members.forEach((voiceMember) => {
        if (!voiceMember.user.bot) {
          const username = voiceMember.displayName || voiceMember.user.username;
          receiver.subscribeUser(voiceMember.id, username);
        }
      });
    }

    // 2. Attach silent keepalive AudioPlayer to keep the Discord UDP RTC socket hot
    let silentPlayer: AudioPlayer | undefined;
    try {
      silentPlayer = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play },
      });
      const silentResource = createAudioResource(new OpusSilenceStream(), {
        inputType: StreamType.Opus,
      });
      silentPlayer.play(silentResource);
      connection.subscribe(silentPlayer);
      console.log(`[SessionManager:${guild.id}] Silent UDP keepalive player started.`);
    } catch (playerErr: any) {
      console.warn(`[SessionManager:${guild.id}] Could not initialize silent keepalive player:`, playerErr.message);
    }

    const session: ActiveSession = {
      meetingId,
      guildId: guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel.id,
      startTime,
      connection,
      tempDir,
      receiver,
      silentPlayer,
    };

    // Safeguard 1: Silence Timeout (Ghost-Buster)
    session.silenceIntervalTimer = setInterval(async () => {
      const inactiveMs = Date.now() - receiver.getLastActivityTimestamp();
      const maxSilenceMs = config.SILENCE_TIMEOUT_MINUTES * 60 * 1000;

      if (inactiveMs > maxSilenceMs) {
        console.log(`[Ghost-Buster] Silence timeout exceeded in guild ${guild.id}. Auto-stopping...`);
        try {
          if ('send' in textChannel) {
            await (textChannel as any).send('⚠️ **Meeting auto-saved:** No speech activity detected for 5 minutes.');
          }
          await this.stopSession(guild.id);
        } catch (e: any) {
          console.error('[Ghost-Buster] Error during auto-stop:', e.message);
        }
      }
    }, 30000);

    // Safeguard 2: Max Meeting Duration Cap
    const maxDurationMs = config.MAX_MEETING_DURATION_MINUTES * 60 * 1000;
    session.maxDurationTimeout = setTimeout(async () => {
      console.log(`[SafetyCap] Max duration reached for meeting ${meetingId}. Auto-stopping...`);
      try {
        if ('send' in textChannel) {
          await (textChannel as any).send('⏱️ **Meeting duration cap reached (3 hours).** Finalizing recording...');
        }
        await this.stopSession(guild.id);
      } catch (e: any) {
        console.error('[SafetyCap] Error during cap stop:', e.message);
      }
    }, maxDurationMs);

    this.sessions.set(guild.id, session);
    return session;
  }

  /**
   * Stops the active session, mixes the audio, and uploads to MinIO.
   * Completely idempotent: concurrent calls await the same promise.
   */
  public async stopSession(guildId: string): Promise<MeetingResult> {
    const session = this.sessions.get(guildId);
    if (!session) {
      throw new Error('No active recording found for this server.');
    }

    if (session.stopPromise) {
      return session.stopPromise;
    }

    session.isStopping = true;
    session.stopPromise = (async () => {
      // Clean up timers
      if (session.silenceIntervalTimer) clearInterval(session.silenceIntervalTimer);
      if (session.maxDurationTimeout) clearTimeout(session.maxDurationTimeout);
      if (session.emptyChannelTimeout) clearTimeout(session.emptyChannelTimeout);

      // Stop keepalive silent player if running
      if (session.silentPlayer) {
        try {
          session.silentPlayer.stop();
        } catch {
          // Ignore stop error
        }
      }

      const sessionEndTime = Date.now();
      const durationMs = sessionEndTime - session.startTime;

      // Disconnect bot from voice
      try {
        session.connection.destroy();
      } catch (e) {
        // Ignore disconnect cleanup errors
      }

      try {
        // 1. Finalize PCM tracks
        const { pcmFiles, speakers } = await session.receiver.finalizeAllTracks(sessionEndTime);

        if (pcmFiles.length === 0) {
          throw new Error('No audio tracks were captured during this meeting.');
        }

        // 2. Mix tracks via FFmpeg
        const mixResult = await AudioMixer.mixToMp3(pcmFiles, session.tempDir, session.meetingId, {
          durationMs,
          speakers,
        });

        // 3. Upload MP3 and Metadata to MinIO
        const audioS3Key = `meetings/${session.meetingId}/audio.mp3`;
        const metadataS3Key = `meetings/${session.meetingId}/metadata.json`;

        const audioUpload = await storageClient.uploadFile(mixResult.outputFilePath, audioS3Key, 'audio/mpeg');
        const metadataUpload = await storageClient.uploadFile(
          mixResult.metadataFilePath,
          metadataS3Key,
          'application/json'
        );

        return {
          meetingId: session.meetingId,
          durationSeconds: mixResult.durationSeconds,
          s3AudioUri: audioUpload.s3Uri,
          s3MetadataUri: metadataUpload.s3Uri,
          presignedUrl: audioUpload.presignedUrl,
          speakerCount: speakers.length,
        };
      } finally {
        // Remove from active registry only after finalization is complete
        this.sessions.delete(guildId);

        // 4. Temporary disk cleanup
        try {
          fs.rmSync(session.tempDir, { recursive: true, force: true });
          console.log(`[SessionManager] Cleaned up temporary directory: ${session.tempDir}`);
        } catch (err: any) {
          console.warn(`[SessionManager] Failed to remove temp directory: ${err.message}`);
        }
      }
    })();

    return session.stopPromise;
  }
}

export const sessionManager = new SessionManager();
