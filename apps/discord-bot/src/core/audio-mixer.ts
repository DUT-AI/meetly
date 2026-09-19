import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { CHANNELS, SAMPLE_RATE, SpeakerMetadata } from "./audio-sync";

export interface MixResult {
  outputFilePath: string;
  metadataFilePath: string;
  durationSeconds: number;
}

export class AudioMixer {
  /**
   * Mixes multiple synchronized PCM files into a standardized 16kHz Mono MP3.
   */
  public static async mixToMp3(
    pcmFiles: string[],
    outputDir: string,
    meetingId: string,
    metadata: {
      durationMs: number;
      speakers: SpeakerMetadata[];
    },
  ): Promise<MixResult> {
    const outputFilePath = path.join(outputDir, `${meetingId}.mp3`);
    const metadataFilePath = path.join(outputDir, `${meetingId}.json`);

    // Write metadata companion file
    fs.writeFileSync(
      metadataFilePath,
      JSON.stringify(
        {
          meetingId,
          durationMs: metadata.durationMs,
          durationSeconds: Math.round(metadata.durationMs / 1000),
          exportedAt: new Date().toISOString(),
          speakers: metadata.speakers,
        },
        null,
        2,
      ),
    );

    if (pcmFiles.length === 0) {
      throw new Error("Cannot mix audio: zero PCM tracks recorded.");
    }

    return new Promise((resolve, reject) => {
      const args: string[] = [];

      // Add each input PCM file (raw 48000Hz s16le stereo)
      pcmFiles.forEach((file) => {
        args.push(
          "-f",
          "s16le",
          "-ar",
          SAMPLE_RATE.toString(),
          "-ac",
          CHANNELS.toString(),
          "-i",
          file,
        );
      });

      // Filter graph for mixing
      if (pcmFiles.length > 1) {
        args.push(
          "-filter_complex",
          `amix=inputs=${pcmFiles.length}:duration=longest:dropout_transition=2:normalize=0`,
        );
      }

      // Output settings: 16kHz Mono MP3 at 48k bitrate (ideal for speech & LLM ingestion)
      args.push(
        "-ar",
        "16000",
        "-ac",
        "1",
        "-b:a",
        "48k",
        "-y",
        outputFilePath,
      );

      console.log(
        `[AudioMixer] Executing FFmpeg with ${pcmFiles.length} inputs...`,
      );
      const ffmpeg = spawn("ffmpeg", args);

      let stderrLog = "";
      ffmpeg.stderr.on("data", (data) => {
        stderrLog += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          console.log(
            `[AudioMixer] Output successfully created at ${outputFilePath}`,
          );
          resolve({
            outputFilePath,
            metadataFilePath,
            durationSeconds: Math.round(metadata.durationMs / 1000),
          });
        } else {
          console.error(
            `[AudioMixer] FFmpeg failed (code ${code}):`,
            stderrLog,
          );
          reject(new Error(`FFmpeg mixing failed with exit code ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });
    });
  }
}
