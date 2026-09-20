import fs from 'fs';
import path from 'path';

/**
 * Constants for PCM calculation:
 * Rate: 48000 Hz
 * Channels: 2 (Stereo)
 * Bit depth: 16-bit signed integer (2 bytes per sample)
 * Bytes per ms = (48000 * 2 * 2) / 1000 = 192 bytes/ms
 */
export const BYTES_PER_MS = 192;
export const SAMPLE_RATE = 48000;
export const CHANNELS = 2;

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
   */
  public prepareForPacket(currentTimestamp: number): void {
    const silenceDurationMs = currentTimestamp - this.lastWrittenTimestamp;
    
    // If there is an audible gap (> 20ms), pad with zeroed PCM
    if (silenceDurationMs > 20) {
      const silenceBytes = Math.floor(silenceDurationMs * BYTES_PER_MS);
      // Write in chunks to prevent large buffer allocation if long silence
      const chunkSize = 65536; // 64KB
      let remaining = silenceBytes;
      const zeroBuf = Buffer.alloc(Math.min(remaining, chunkSize));
      
      while (remaining > 0) {
        const toWrite = Math.min(remaining, chunkSize);
        this.writeStream.write(toWrite === zeroBuf.length ? zeroBuf : zeroBuf.subarray(0, toWrite));
        remaining -= toWrite;
      }
      this.totalBytesWritten += silenceBytes;
      this.lastWrittenTimestamp = currentTimestamp;
    }
  }

  /**
   * Writes decoded PCM audio data to disk.
   */
  public writePcm(chunk: Buffer): void {
    this.writeStream.write(chunk);
    this.totalBytesWritten += chunk.length;
    this.totalSpokenBytes += chunk.length;
    
    // Advance timestamp by the actual audio duration written
    const durationMs = chunk.length / BYTES_PER_MS;
    this.lastWrittenTimestamp += durationMs;
  }

  /**
   * Pads user stream with silence up to session end time and closes stream.
   */
  public async finalize(sessionEndTime: number): Promise<SpeakerMetadata> {
    const trailingSilenceMs = Math.max(0, sessionEndTime - this.lastWrittenTimestamp);
    if (trailingSilenceMs > 20) {
      const silenceBytes = Math.floor(trailingSilenceMs * BYTES_PER_MS);
      const chunkSize = 65536;
      let remaining = silenceBytes;
      const zeroBuf = Buffer.alloc(Math.min(remaining, chunkSize));
      while (remaining > 0) {
        const toWrite = Math.min(remaining, chunkSize);
        this.writeStream.write(toWrite === zeroBuf.length ? zeroBuf : zeroBuf.subarray(0, toWrite));
        remaining -= toWrite;
      }
      this.totalBytesWritten += silenceBytes;
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
