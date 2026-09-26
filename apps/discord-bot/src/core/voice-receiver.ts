import { EndBehaviorType, VoiceConnection } from '@discordjs/voice';
import { Guild } from 'discord.js';
import * as prism from 'prism-media';
import { UserAudioTrack, SAMPLE_RATE, CHANNELS } from './audio-sync';

interface ActiveSubscription {
  opusStream: any;
  decoder: prism.opus.Decoder;
}

export class VoiceReceiverManager {
  private connection: VoiceConnection;
  private guild: Guild;
  private outputDir: string;
  private sessionStartTime: number;
  private userTracks = new Map<string, UserAudioTrack>();
  private activeSubscriptions = new Map<string, ActiveSubscription>();
  private lastActivityTimestamp: number;

  constructor(
    connection: VoiceConnection,
    guild: Guild,
    outputDir: string,
    sessionStartTime: number
  ) {
    this.connection = connection;
    this.guild = guild;
    this.outputDir = outputDir;
    this.sessionStartTime = sessionStartTime;
    this.lastActivityTimestamp = sessionStartTime;

    this.setupListeners();
  }

  private setupListeners(): void {
    const receiver = this.connection.receiver;

    receiver.speaking.on('start', async (userId) => {
      const now = Date.now();
      this.lastActivityTimestamp = now;

      // Initialize track if first time this user spoke
      let track = this.userTracks.get(userId);
      if (!track) {
        let username = `User_${userId}`;
        try {
          const member = await this.guild.members.fetch(userId);
          if (member) username = member.displayName || member.user.username;
        } catch {
          // Ignore fetch errors
        }

        track = new UserAudioTrack(userId, username, this.outputDir, this.sessionStartTime);
        this.userTracks.set(userId, track);
        console.log(`[VoiceReceiver] Subscribed to new speaker: ${username} (${userId})`);
      }

      track.segmentsCount++;
      track.prepareForPacket(now);

      // Check if speaker already has an active stream and decoder.
      // If already subscribed, DO NOT recreate or re-pipe another decoder.
      if (this.activeSubscriptions.has(userId)) {
        return;
      }

      // Subscribe to user Opus stream with Manual behavior (persistent single decoder per speaker)
      try {
        const opusStream = receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.Manual,
          },
        });

        const decoder = new prism.opus.Decoder({
          rate: SAMPLE_RATE,
          channels: CHANNELS,
          frameSize: 960,
        });

        opusStream.pipe(decoder);

        decoder.on('data', (pcmChunk: Buffer) => {
          this.lastActivityTimestamp = Date.now();
          track!.writePcm(pcmChunk);
        });

        opusStream.on('error', (err) => {
          console.error(`[VoiceReceiver] Opus stream error for ${userId}:`, err.message);
        });

        decoder.on('error', (err) => {
          console.error(`[VoiceReceiver] Opus decoder error for ${userId}:`, err.message);
        });

        this.activeSubscriptions.set(userId, { opusStream, decoder });
      } catch (err: any) {
        console.error(`[VoiceReceiver] Failed to subscribe to user ${userId}:`, err.message);
      }
    });
  }

  public getLastActivityTimestamp(): number {
    return this.lastActivityTimestamp;
  }

  public async finalizeAllTracks(sessionEndTime: number) {
    // 1. Destroy and unpipe all active streams and decoders cleanly
    for (const [userId, sub] of this.activeSubscriptions.entries()) {
      try {
        sub.opusStream.unpipe(sub.decoder);
        sub.decoder.destroy();
        sub.opusStream.destroy();
      } catch (err: any) {
        console.warn(`[VoiceReceiver] Error destroying stream for ${userId}:`, err.message);
      }
    }
    this.activeSubscriptions.clear();

    // 2. Finalize all PCM user files
    const trackList = Array.from(this.userTracks.values());
    const metadataList = await Promise.all(
      trackList.map((track) => track.finalize(sessionEndTime))
    );

    return {
      pcmFiles: trackList.map((t) => t.filePath),
      speakers: metadataList,
    };
  }
}
