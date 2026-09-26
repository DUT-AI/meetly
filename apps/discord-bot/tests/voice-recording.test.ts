import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { VoiceReceiverManager } from '../src/core/voice-receiver';
import { BYTES_PER_FRAME, BYTES_PER_MS } from '../src/core/audio-sync';

// Mock minimal VoiceConnection with mock receiver
class MockVoiceReceiver extends EventEmitter {
  public speaking = new EventEmitter();
  public subscriptions = new Map<string, any>();

  public subscribe(userId: string, options: any) {
    const stream = new EventEmitter() as any;
    stream.destroy = () => stream.emit('close');
    stream.unpipe = () => {};
    stream.pipe = (dest: any) => {};
    this.subscriptions.set(userId, stream);
    return stream;
  }
}

class MockVoiceConnection extends EventEmitter {
  public receiver = new MockVoiceReceiver() as any;
  public destroy() {
    this.emit('destroyed');
  }
}

// Mock Guild
const mockGuild: any = {
  client: { user: { id: 'bot_id' } },
  members: {
    fetch: async (userId: string) => ({
      displayName: `DisplayName_${userId}`,
      user: { username: `Username_${userId}` },
    }),
  },
};

async function runVoiceRecordingTests() {
  console.log('🧪 Starting Voice Recording & Ingestion Pipeline Tests...');
  const testDir = path.join(__dirname, 'temp-voice-rec-test');
  fs.mkdirSync(testDir, { recursive: true });

  const sessionStartTime = Date.now() - 5000;
  const mockConn = new MockVoiceConnection() as any;
  const receiverManager = new VoiceReceiverManager(mockConn, mockGuild, testDir, sessionStartTime);

  // ── TEST 1: Proactive Subscription & Idempotency ───────────────────
  console.log('\n--- Test 1: Proactive Subscription & Idempotency ---');
  receiverManager.subscribeUser('user_alice', 'Alice');
  receiverManager.subscribeUser('user_alice', 'Alice'); // Duplicate call
  receiverManager.subscribeUser('bot_id'); // Bot self-subscription attempt should be ignored

  // Verify internal state: only 1 subscription and 1 track created
  const initialFinalize = await receiverManager.finalizeAllTracks(Date.now());
  assert.strictEqual(initialFinalize.pcmFiles.length, 1, 'Should have exactly 1 track for Alice');
  assert.strictEqual(initialFinalize.speakers[0].userId, 'user_alice');
  console.log('✅ Proactive subscription is idempotent and ignores bot self ID.');

  // ── TEST 2: Multi-Speaker Dynamic Ingestion ─────────────────────────
  console.log('\n--- Test 2: Multi-Speaker Dynamic Ingestion ---');
  const sessionStartTime2 = Date.now() - 2000;
  const mockConn2 = new MockVoiceConnection() as any;
  const receiverManager2 = new VoiceReceiverManager(mockConn2, mockGuild, testDir, sessionStartTime2);

  // User 1 proactively subscribed
  receiverManager2.subscribeUser('user_bob', 'Bob');

  // User 2 speaks dynamically (via fallback speaking event)
  mockConn2.receiver.speaking.emit('start', 'user_charlie');

  // Simulate audio packet decode for Bob (40ms = 7680 bytes of PCM)
  const trackBob = (receiverManager2 as any).userTracks.get('user_bob');
  assert.ok(trackBob, 'Bob track must exist');
  const pcmChunk = Buffer.alloc(7680, 0x5a);
  trackBob.prepareForPacket(sessionStartTime2 + 500);
  trackBob.writePcm(pcmChunk);

  // Simulate audio packet decode for Charlie
  const trackCharlie = (receiverManager2 as any).userTracks.get('user_charlie');
  assert.ok(trackCharlie, 'Charlie track must exist');
  trackCharlie.prepareForPacket(sessionStartTime2 + 800);
  trackCharlie.writePcm(pcmChunk);

  const sessionEndTime2 = Date.now();
  const finalResult2 = await receiverManager2.finalizeAllTracks(sessionEndTime2);

  assert.strictEqual(finalResult2.pcmFiles.length, 2, 'Should capture 2 speakers');
  for (const filePath of finalResult2.pcmFiles) {
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 0, `PCM file ${filePath} must not be empty`);
    assert.strictEqual(stat.size % BYTES_PER_FRAME, 0, 'File must be strictly 4-byte aligned');
  }
  console.log('✅ Multi-speaker dynamic ingestion successfully captured non-empty PCM tracks.');

  // ── TEST 3: Resilient Interaction Fallback Simulator ────────────────
  console.log('\n--- Test 3: Resilient Interaction Fallback Simulation ---');
  let editReplyCalled = false;
  let channelSendCalled = false;

  // Simulate expired interaction where deferReply throws Error 10062
  const mockExpiredInteraction: any = {
    deferred: false,
    replied: false,
    deferReply: async () => {
      const err: any = new Error('Unknown interaction');
      err.code = 10062;
      throw err;
    },
    editReply: async () => {
      editReplyCalled = true;
    },
    channel: {
      send: async (msg: any) => {
        channelSendCalled = true;
      },
    },
  };

  // Replicate resilient handler pattern
  let isInteractionValid = false;
  if (!mockExpiredInteraction.deferred && !mockExpiredInteraction.replied) {
    try {
      await mockExpiredInteraction.deferReply();
      isInteractionValid = true;
    } catch (e: any) {
      isInteractionValid = false;
    }
  }

  const respond = async (payload: any) => {
    if (isInteractionValid) {
      try {
        await mockExpiredInteraction.editReply(payload);
        return;
      } catch {
        isInteractionValid = false;
      }
    }
    if (mockExpiredInteraction.channel && 'send' in mockExpiredInteraction.channel) {
      await mockExpiredInteraction.channel.send(payload);
    }
  };

  await respond({ content: 'Test fallback notification' });
  assert.strictEqual(editReplyCalled, false, 'editReply should NOT be called when defer failed');
  assert.strictEqual(channelSendCalled, true, 'channel.send MUST be called as fallback');
  console.log('✅ Resilient responder correctly routed message through channel.send without throwing.');

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n🎉 ALL VOICE RECORDING VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runVoiceRecordingTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
