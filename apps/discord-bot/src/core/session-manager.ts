import { joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Guild, GuildMember, TextBasedChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { storageClient } from '../storage/minio-client';
import { AudioMixer } from './audio-mixer';
import { VoiceReceiverManager } from './voice-receiver';

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
  silenceIntervalTimer?: NodeJS.Timeout;
  maxDurationTimeout?: NodeJS.Timeout;
}

export class SessionManager {
  private sessions = new Map<string, ActiveSession>();

  public getSession(guildId: string): ActiveSession | undefined {
    return this.sessions.get(guildId);
  }

  public isRecording(guildId: string): boolean {
    return this.sessions.has(guildId);
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

    const startTime = Date.now();
    const receiver = new VoiceReceiverManager(connection, guild, tempDir, startTime);

    const session: ActiveSession = {
      meetingId,
      guildId: guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel.id,
      startTime,
      connection,
      tempDir,
      receiver,
    };

    // Safeguard 1: Silence Timeout (Ghost-Buster)
    session.silenceIntervalTimer = setInterval(async () => {
      const inactiveMs = Date.now() - receiver.getLastActivityTimestamp();
      const maxSilenceMs = config.SILENCE_TIMEOUT_MINUTES * 60 * 1000;

      if (inactiveMs > maxSilenceMs) {
        console.log(`[Ghost-Buster] Silence timeout exceeded in guild ${guild.id}. Auto-stopping...`);
        try {
          if ('send' in textChannel) {
            await (textChannel as any).send('**Meeting auto-saved:** No speech activity detected for 5 minutes.');
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
          await (textChannel as any).send('**Meeting duration cap reached (3 hours).** Finalizing recording...');
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
   */
  public async stopSession(guildId: string): Promise<MeetingResult> {
    const session = this.sessions.get(guildId);
    if (!session) {
      throw new Error('No active recording found for this server.');
    }

    // Clean up timers
    if (session.silenceIntervalTimer) clearInterval(session.silenceIntervalTimer);
    if (session.maxDurationTimeout) clearTimeout(session.maxDurationTimeout);

    // Remove from active registry immediately to free guild state
    this.sessions.delete(guildId);

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
      // 4. Temporary disk cleanup
      try {
        fs.rmSync(session.tempDir, { recursive: true, force: true });
        console.log(`[SessionManager] Cleaned up temporary directory: ${session.tempDir}`);
      } catch (err: any) {
        console.warn(`[SessionManager] Failed to remove temp directory: ${err.message}`);
      }
    }
  }
}

export const sessionManager = new SessionManager();
