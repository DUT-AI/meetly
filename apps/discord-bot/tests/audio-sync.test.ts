import fs from 'fs';
import path from 'path';
import { UserAudioTrack, BYTES_PER_FRAME, BYTES_PER_MS } from '../src/core/audio-sync';

async function testAudioSync() {
  console.log('🧪 Testing UserAudioTrack frame alignment and silence padding...');
  const testDir = path.join(__dirname, 'temp-sync-test');
  fs.mkdirSync(testDir, { recursive: true });

  const sessionStartTime = 1000000;
  const track = new UserAudioTrack('test_user_1', 'Alice', testDir, sessionStartTime);

  // 1. Simulate silence gap of 153.7ms (non-integer / odd duration)
  const burst1Start = sessionStartTime + 153.7;
  track.prepareForPacket(burst1Start);

  // Check that bytes written is strictly a multiple of BYTES_PER_FRAME (4)
  if (track.totalBytesWritten % BYTES_PER_FRAME !== 0) {
    throw new Error(
      `Frame alignment failed! totalBytesWritten=${track.totalBytesWritten} is not a multiple of ${BYTES_PER_FRAME}`
    );
  }
  console.log(`✅ Silence padding 1: ${track.totalBytesWritten} bytes written (aligned to 4-byte frames).`);

  // 2. Simulate writing 3 speech chunks (20ms each = 3840 bytes)
  const chunk20ms = Buffer.alloc(3840, 0x12);
  track.writePcm(chunk20ms);
  track.writePcm(chunk20ms);

  if (track.totalBytesWritten % BYTES_PER_FRAME !== 0) {
    throw new Error('Frame alignment broken after writePcm!');
  }
  console.log(`✅ After 2 speech chunks: ${track.totalBytesWritten} bytes written.`);

  // 3. Simulate another silence gap (user pauses 500ms and talks again)
  const currentAudioTime = track.getCurrentAudioTimeMs();
  const burst2Start = currentAudioTime + 521.9; // odd ms
  track.prepareForPacket(burst2Start);

  if (track.totalBytesWritten % BYTES_PER_FRAME !== 0) {
    throw new Error(
      `Frame alignment failed after second silence gap! totalBytesWritten=${track.totalBytesWritten}`
    );
  }
  console.log(`✅ Silence padding 2: ${track.totalBytesWritten} bytes written (aligned).`);

  // 4. Finalize track at session end
  const sessionEndTime = track.getCurrentAudioTimeMs() + 300;
  const metadata = await track.finalize(sessionEndTime);

  const fileStats = fs.statSync(track.filePath);
  if (fileStats.size % BYTES_PER_FRAME !== 0) {
    throw new Error(
      `Final PCM file size ${fileStats.size} is not aligned to 4-byte sample frame!`
    );
  }

  console.log(`✅ Final PCM file size: ${fileStats.size} bytes (perfect 4-byte alignment).`);
  console.log(`✅ Metadata generated: spoken=${metadata.totalSpokenMs}ms`);

  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('🎉 AudioSync verification test passed!');
}

testAudioSync().catch((err) => {
  console.error('❌ AudioSync test failed:', err);
  process.exit(1);
});
