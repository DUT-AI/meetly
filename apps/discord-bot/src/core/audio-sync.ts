import fs from 'fs';
import path from 'path';

/**
 * Constants for PCM calculation:
 * Rate: 48000 Hz
 * Channels: 2 (Stereo)
 * Bit depth: 16-bit signed integer (2 bytes per sample)
 * Frame size: 2 channels * 2 bytes = 4 bytes per frame
 * Bytes per ms = (48000 * 2 * 2) / 1000 = 192 bytes/ms
 */
export const SAMPLE_RATE = 48000;
export const CHANNELS = 2;
export const BYTES_PER_SAMPLE = 2;
export const FRAME_BYTES = CHANNELS * BYTES_PER_SAMPLE; // 4 bytes
export const BYTES_PER_MS = (SAMPLE_RATE * FRAME_BYTES) / 1000; // 192 bytes/ms

export interface SpeakerMetadata {
  userId: string;
  username: string;
  totalSpokenMs: number;
  segmentsCount: number;
}

export class UserAudioTrack {
  public readonly userId: string;
  public readonly username: string;
  public readonly filePath: string;
  private writeStream: fs.WriteStream;
  private lastWrittenTimestamp: number;
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
    this.lastWrittenTimestamp = sessionStartTime;
    this.filePath = path.join(outputDir, `user_${userId}.pcm`);
    this.writeStream = fs.createWriteStream(this.filePath, { flags: 'w' });
  }

  /**
   * Called when a speech packet or burst starts.
   * Fills any elapsed silence between the last packet and the current time.
   * Strictly aligns silence bytes to 4-byte frame boundaries.
   */
  public prepareForPacket(currentTimestamp: number): void {
    const silenceDurationMs = currentTimestamp - this.lastWrittenTimestamp;

    // If there is an audible gap (> 20ms), pad with sample-aligned zeroed PCM
    if (silenceDurationMs > 20) {
      const rawBytes = Math.floor(silenceDurationMs * BYTES_PER_MS);
      const silenceBytes = rawBytes - (rawBytes % FRAME_BYTES);

      if (silenceBytes > 0) {
        // Write in aligned chunks (64KB is divisible by 4)
        const chunkSize = 65536; // 64KB
        let remaining = silenceBytes;
        const zeroBuf = Buffer.alloc(Math.min(remaining, chunkSize));

        while (remaining > 0) {
          const toWrite = Math.min(remaining, chunkSize);
          this.writeStream.write(toWrite === zeroBuf.length ? zeroBuf : zeroBuf.subarray(0, toWrite));
          remaining -= toWrite;
        }

        this.totalBytesWritten += silenceBytes;
        this.lastWrittenTimestamp += silenceBytes / BYTES_PER_MS;
      }
    }
  }

  /**
   * Writes decoded PCM audio data to disk with frame alignment validation.
   */
  public writePcm(chunk: Buffer): void {
    if (chunk.length === 0) return;

    // Defense-in-depth: Ensure chunk is strictly frame-aligned (multiple of 4 bytes)
    let alignedChunk = chunk;
    const remainder = chunk.length % FRAME_BYTES;
    if (remainder !== 0) {
      alignedChunk = chunk.subarray(0, chunk.length - remainder);
    }

    if (alignedChunk.length > 0) {
      this.writeStream.write(alignedChunk);
      this.totalBytesWritten += alignedChunk.length;
      this.totalSpokenBytes += alignedChunk.length;

      // Advance timestamp by the actual audio duration written
      const durationMs = alignedChunk.length / BYTES_PER_MS;
      this.lastWrittenTimestamp += durationMs;
    }
  }

  /**
   * Pads user stream with silence up to session end time and closes stream cleanly.
   */
  public async finalize(sessionEndTime: number): Promise<SpeakerMetadata> {
    const trailingSilenceMs = Math.max(0, sessionEndTime - this.lastWrittenTimestamp);
    if (trailingSilenceMs > 20) {
      const rawBytes = Math.floor(trailingSilenceMs * BYTES_PER_MS);
      const silenceBytes = rawBytes - (rawBytes % FRAME_BYTES);

      if (silenceBytes > 0) {
        const chunkSize = 65536;
        let remaining = silenceBytes;
        const zeroBuf = Buffer.alloc(Math.min(remaining, chunkSize));

        while (remaining > 0) {
          const toWrite = Math.min(remaining, chunkSize);
          this.writeStream.write(toWrite === zeroBuf.length ? zeroBuf : zeroBuf.subarray(0, toWrite));
          remaining -= toWrite;
        }
        this.totalBytesWritten += silenceBytes;
        this.lastWrittenTimestamp += silenceBytes / BYTES_PER_MS;
      }
    }

    return new Promise((resolve, reject) => {
      this.writeStream.end(() => {
        resolve({
          userId: this.userId,
          username: this.username,
          totalSpokenMs: Math.round(this.totalSpokenBytes / BYTES_PER_MS),
          segmentsCount: this.segmentsCount,
        });
      });
      this.writeStream.on('error', reject);
    });
  }
}
