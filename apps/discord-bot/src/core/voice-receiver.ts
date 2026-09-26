import { AudioReceiveStream, EndBehaviorType, VoiceConnection } from '@discordjs/voice';
import { Guild } from 'discord.js';
import * as prism from 'prism-media';
import { UserAudioTrack, SAMPLE_RATE, CHANNELS, SpeakerMetadata } from './audio-sync';

interface ActiveUserSubscription {
  opusStream: AudioReceiveStream;
  decoder: prism.opus.Decoder;
}

export class VoiceReceiverManager {
  private connection: VoiceConnection;
  private guild: Guild;
  private outputDir: string;
  private sessionStartTime: number;
  private userTracks = new Map<string, UserAudioTrack>();
  private activeSubscriptions = new Map<string, ActiveUserSubscription>();
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

    // Retain speaking 'start' listener as a dynamic fallback
    receiver.speaking.on('start', (userId) => {
      this.lastActivityTimestamp = Date.now();
      console.log(`[VoiceReceiver] 🎙️ Speech event detected from user: ${userId}`);
      this.subscribeUser(userId);
    });
  }

  /**
   * Subscribes to audio stream for a user ID idempotently.
   * Can be called proactively on session start, on voice join, or on speaking event.
   */
  public subscribeUser(userId: string, preferredUsername?: string): void {
    // Never subscribe to our own bot audio
    if (this.guild.client.user && userId === this.guild.client.user.id) {
      return;
    }

    // 1. Synchronously get or create track for this speaker
    let track = this.userTracks.get(userId);
    if (!track) {
      const initialName = preferredUsername || `User_${userId}`;
      track = new UserAudioTrack(userId, initialName, this.outputDir, this.sessionStartTime);
      this.userTracks.set(userId, track);
      console.log(`[VoiceReceiver] Initialized permanent audio track for user: ${userId} (${initialName})`);

      if (!preferredUsername) {
        // Asynchronously resolve member display name in background
        this.guild.members
          .fetch(userId)
          .then((member) => {
            if (member && track) {
              track.username = member.displayName || member.user.username;
              console.log(`[VoiceReceiver] Resolved username for ${userId}: ${track.username}`);
            }
          })
          .catch(() => {});
      }
    }

    // 2. CRITICAL SINGLETON GUARD:
    // If user is already subscribed with an active stream & decoder, do not duplicate
    if (this.activeSubscriptions.has(userId)) {
      return;
    }

    const receiver = this.connection.receiver;

    // 3. Subscribe with Manual end behavior so the stream remains alive for the session
    const opusStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.Manual,
      },
    });

    // 4. Create Opus decoder for this user
    const decoder = new prism.opus.Decoder({
      rate: SAMPLE_RATE,
      channels: CHANNELS,
      frameSize: 960,
    });

    this.activeSubscriptions.set(userId, { opusStream, decoder });
    console.log(`[VoiceReceiver] 🔗 Active audio subscription established for user: ${userId}`);

    // Pipe Opus RTP stream into native Opus decoder
    opusStream.pipe(decoder);

    let firstChunkLogged = false;
    decoder.on('data', (pcmChunk: Buffer) => {
      const now = Date.now();
      this.lastActivityTimestamp = now;

      if (!firstChunkLogged) {
        firstChunkLogged = true;
        console.log(`[VoiceReceiver] 🔊 First PCM audio packet decoded for user: ${userId} (${pcmChunk.length} bytes)`);
      }

      // Synchronously pad silence up to this chunk arrival if gap exists
      track!.prepareForPacket(now);
      track!.writePcm(pcmChunk);
    });

    // Auto-heal subscriptions on stream closure/error so reconnections work
    const cleanupSubscription = () => {
      if (this.activeSubscriptions.has(userId)) {
        this.activeSubscriptions.delete(userId);
        try {
          opusStream.unpipe(decoder);
          decoder.destroy();
          opusStream.destroy();
        } catch {
          // Ignore cleanup errors
        }
        console.log(`[VoiceReceiver] 🔄 Cleaned up closed subscription for user: ${userId}`);
      }
    };

    opusStream.on('close', cleanupSubscription);
    opusStream.on('end', cleanupSubscription);

    opusStream.on('error', (err) => {
      console.error(`[VoiceReceiver] Opus stream error for ${userId}:`, err.message);
      cleanupSubscription();
    });

    decoder.on('error', (err) => {
      console.error(`[VoiceReceiver] Opus decoder error for ${userId}:`, err.message);
    });
  }

  public getLastActivityTimestamp(): number {
    return this.lastActivityTimestamp;
  }

  public async finalizeAllTracks(
    sessionEndTime: number
  ): Promise<{ pcmFiles: string[]; speakers: SpeakerMetadata[] }> {
    // 1. Destroy and cleanup all active streams and decoders
    for (const [userId, sub] of this.activeSubscriptions.entries()) {
      try {
        sub.opusStream.unpipe(sub.decoder);
        sub.decoder.destroy();
        sub.opusStream.destroy();
      } catch {
        // Ignore stream shutdown errors
      }
    }
    this.activeSubscriptions.clear();

    // 2. Finalize all individual PCM tracks (padding trailing silence)
    const trackList = Array.from(this.userTracks.values());
    const metadataList = await Promise.all(
      trackList.map((track) => track.finalize(sessionEndTime))
    );

    const pcmFiles = trackList.map((track) => track.filePath);
    return { pcmFiles, speakers: metadataList };
  }
}
