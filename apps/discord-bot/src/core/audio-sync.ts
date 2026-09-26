import fs from 'fs';
import path from 'path';

/**
 * Constants for PCM calculation:
 * Rate: 48000 Hz
 * Channels: 2 (Stereo)
 * Bit depth: 16-bit signed integer (2 bytes per sample)
 * Bytes per frame = 2 channels * 2 bytes = 4 bytes/frame
 * Bytes per ms = (48000 * 4) / 1000 = 192 bytes/ms
 */
export const SAMPLE_RATE = 48000;
export const CHANNELS = 2;
export const BYTES_PER_SAMPLE = 2;
export const BYTES_PER_FRAME = CHANNELS * BYTES_PER_SAMPLE; // 4 bytes
export const BYTES_PER_MS = (SAMPLE_RATE * BYTES_PER_FRAME) / 1000; // 192 bytes/ms

export interface SpeakerMetadata {
  userId: string;
  username: string;
  totalSpokenMs: number;
  segmentsCount: number;
}

export class UserAudioTrack {
  public readonly userId: string;
  public username: string;
  public readonly filePath: string;
  private writeStream: fs.WriteStream;
  private sessionStartTime: number;
  public totalBytesWritten: number = 0;
  public segmentsCount: number = 0;
  public totalSpokenBytes: number = 0;

  constructor(
    userId: string,
    username: string,
    outputDir: string,
    sessionStartTime: number
  ) {
    this.userId = userId;
    this.username = username;
    this.sessionStartTime = sessionStartTime;
    this.filePath = path.join(outputDir, `user_${userId}.pcm`);
    this.writeStream = fs.createWriteStream(this.filePath, { flags: 'w' });
  }

  /**
   * Returns current audio position of this track relative to session start (ms).
   * Anchored strictly to total bytes written to eliminate timing drift.
   */
  public getCurrentAudioTimeMs(): number {
    return this.sessionStartTime + Math.floor(this.totalBytesWritten / BYTES_PER_MS);
  }

  /**
   * Called when a speech burst starts after silence.
   * Fills any elapsed gap with zeroed PCM buffers, strictly aligned to 4-byte frame boundaries.
   */
  public prepareForPacket(targetTimestamp: number): void {
    const currentAudioTime = this.getCurrentAudioTimeMs();
    const silenceDurationMs = targetTimestamp - currentAudioTime;

    // Only pad if there is an audible gap (> 40ms, i.e. > 2 Opus frames) to avoid over-padding micro-jitter
    if (silenceDurationMs > 40) {
      let silenceBytes = Math.floor(silenceDurationMs * BYTES_PER_MS);
      // Strictly enforce frame boundary alignment (4 bytes) to prevent byte slippage and noise
      silenceBytes -= (silenceBytes % BYTES_PER_FRAME);

      if (silenceBytes > 0) {
        this.writeSilenceBytes(silenceBytes);
        this.segmentsCount++;
      }
    }
  }

  /**
   * Writes decoded PCM audio data to disk with strict 4-byte frame boundary alignment.
   */
  public writePcm(chunk: Buffer): void {
    // Guard against partial frames
    const alignedLength = chunk.length - (chunk.length % BYTES_PER_FRAME);
    const validChunk = alignedLength === chunk.length ? chunk : chunk.subarray(0, alignedLength);

    if (validChunk.length > 0) {
      this.writeStream.write(validChunk);
      this.totalBytesWritten += validChunk.length;
      this.totalSpokenBytes += validChunk.length;
    }
  }

  /**
   * Helper to write zeroed PCM silence in manageable buffer chunks.
   */
  private writeSilenceBytes(totalBytes: number): void {
    const chunkSize = 65536; // 64KB aligned chunks
    let remaining = totalBytes;
    const zeroBuf = Buffer.alloc(Math.min(remaining, chunkSize));

    while (remaining > 0) {
      const toWrite = Math.min(remaining, chunkSize);
      this.writeStream.write(toWrite === zeroBuf.length ? zeroBuf : zeroBuf.subarray(0, toWrite));
      remaining -= toWrite;
    }
    this.totalBytesWritten += totalBytes;
  }

  /**
   * Pads user stream with silence up to session end time and closes stream cleanly.
   */
  public async finalize(sessionEndTime: number): Promise<SpeakerMetadata> {
    const currentAudioTime = this.getCurrentAudioTimeMs();
    const trailingSilenceMs = Math.max(0, sessionEndTime - currentAudioTime);

    if (trailingSilenceMs > 20) {
      let silenceBytes = Math.floor(trailingSilenceMs * BYTES_PER_MS);
      silenceBytes -= (silenceBytes % BYTES_PER_FRAME);
      if (silenceBytes > 0) {
        this.writeSilenceBytes(silenceBytes);
      }
    }

    return new Promise((resolve, reject) => {
      this.writeStream.end(() => {
        resolve({
          userId: this.userId,
          username: this.username,
          totalSpokenMs: Math.round(this.totalSpokenBytes / BYTES_PER_MS),
          segmentsCount: Math.max(1, this.segmentsCount),
        });
      });
      this.writeStream.on('error', reject);
    });
  }
}
