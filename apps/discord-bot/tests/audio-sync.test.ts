import fs from 'fs';
import path from 'path';
import { UserAudioTrack, BYTES_PER_MS, FRAME_BYTES } from '../src/core/audio-sync';

async function testAudioSync() {
  console.log('[Test] Testing UserAudioTrack frame alignment and silence synchronization...');
  const testDir = path.join(__dirname, 'temp-sync-test');
  fs.mkdirSync(testDir, { recursive: true });

  const sessionStart = 1000000;
  const track = new UserAudioTrack('test-user-1', 'Tester', testDir, sessionStart);

  try {
    // 1. Initial silence of 253ms (intentional non-multiple to test floor alignment)
    track.prepareForPacket(sessionStart + 253);

    // Verify written bytes is multiple of 4
    if (track.totalBytesWritten % FRAME_BYTES !== 0) {
      throw new Error(`Silence padding produced unaligned bytes: ${track.totalBytesWritten}`);
    }

    // 2. Write a speech chunk (simulate 20ms = 3840 bytes)
    const validChunk = Buffer.alloc(3840, 0x12);
    track.writePcm(validChunk);

    if (track.totalBytesWritten % FRAME_BYTES !== 0) {
      throw new Error(`Chunk write produced unaligned bytes: ${track.totalBytesWritten}`);
    }

    // 3. Write an unaligned chunk (e.g. 101 bytes) - should be truncated to 100 bytes (multiple of 4)
    const oddChunk = Buffer.alloc(101, 0x34);
    const bytesBefore = track.totalBytesWritten;
    track.writePcm(oddChunk);
    const bytesWritten = track.totalBytesWritten - bytesBefore;

    if (bytesWritten !== 100) {
      throw new Error(`Expected unaligned chunk to be trimmed to 100 bytes, got ${bytesWritten}`);
    }
    if (track.totalBytesWritten % FRAME_BYTES !== 0) {
      throw new Error(`After unaligned chunk, totalBytesWritten is not aligned: ${track.totalBytesWritten}`);
    }

    // 4. Finalize with session end time
    const sessionEnd = sessionStart + 1000; // 1 second total
    const meta = await track.finalize(sessionEnd);

    console.log('[Test] Finalized metadata:', meta);
    console.log('[Test] Total bytes written on disk:', track.totalBytesWritten);

    const fileSize = fs.statSync(track.filePath).size;
    if (fileSize !== track.totalBytesWritten) {
      throw new Error(`File size ${fileSize} does not match recorded bytes ${track.totalBytesWritten}`);
    }
    if (fileSize % FRAME_BYTES !== 0) {
      throw new Error(`Final file size is not a multiple of 4: ${fileSize}`);
    }

    console.log('[Test] UserAudioTrack frame alignment test passed successfully.');
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('[Test] Cleaned up test sync artifacts.');
  }
}

testAudioSync().catch((err) => {
  console.error('[Test] AudioSync test failed:', err);
  process.exit(1);
});
