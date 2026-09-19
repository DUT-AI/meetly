import fs from 'fs';
import path from 'path';
import { AudioMixer } from '../src/core/audio-mixer';
import { SAMPLE_RATE, CHANNELS, BYTES_PER_MS } from '../src/core/audio-sync';

async function testMixer() {
  console.log('🧪 Testing AudioMixer with synthesized multi-speaker PCM streams...');
  const testDir = path.join(__dirname, 'temp-test');
  fs.mkdirSync(testDir, { recursive: true });

  const durationMs = 2000; // 2 seconds
  const totalBytes = durationMs * BYTES_PER_MS;

  // Synthesize a sine wave for speaker A (440Hz)
  const pcmA = path.join(testDir, 'user_alice.pcm');
  const bufferA = Buffer.alloc(totalBytes);
  for (let i = 0; i < totalBytes / 4; i++) {
    const t = i / SAMPLE_RATE;
    const sample = Math.floor(Math.sin(2 * Math.PI * 440 * t) * 16000);
    bufferA.writeInt16LE(sample, i * 4);
    bufferA.writeInt16LE(sample, i * 4 + 2);
  }
  fs.writeFileSync(pcmA, bufferA);

  // Synthesize a sine wave for speaker B (880Hz)
  const pcmB = path.join(testDir, 'user_bob.pcm');
  const bufferB = Buffer.alloc(totalBytes);
  for (let i = 0; i < totalBytes / 4; i++) {
    const t = i / SAMPLE_RATE;
    const sample = Math.floor(Math.sin(2 * Math.PI * 880 * t) * 16000);
    bufferB.writeInt16LE(sample, i * 4);
    bufferB.writeInt16LE(sample, i * 4 + 2);
  }
  fs.writeFileSync(pcmB, bufferB);

  try {
    const meetingId = 'test-meeting-123';
    const result = await AudioMixer.mixToMp3([pcmA, pcmB], testDir, meetingId, {
      durationMs,
      speakers: [
        { userId: '111', username: 'Alice', totalSpokenMs: 2000, segmentsCount: 1 },
        { userId: '222', username: 'Bob', totalSpokenMs: 2000, segmentsCount: 1 },
      ],
    });

    console.log('✅ Mix succeeded! Output file:', result.outputFilePath);
    console.log('✅ File size:', fs.statSync(result.outputFilePath).size, 'bytes');
    console.log('✅ Metadata file:', result.metadataFilePath);

    // Verify file exists and is > 0 bytes
    if (!fs.existsSync(result.outputFilePath) || fs.statSync(result.outputFilePath).size === 0) {
      throw new Error('Mixed output file is empty or missing!');
    }
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up test artifacts.');
  }
}

testMixer()
  .then(() => console.log('🎉 AudioMixer verification test passed!'))
  .catch((err) => {
    console.error('❌ AudioMixer verification failed:', err);
    process.exit(1);
  });
