/**
 * Meetly - Background Service Worker (Manifest V3)
 * Điều phối trung tâm giữa:
 * - Content Script (giao diện trên Google Meet, bắt và gửi audio stream)
 * - Meetly Backend API (Tạo phiên, xác thực Cookie/Bearer, duy trì WebSocket Producer & Subscriber)
 * - Popup UI (Menu điều khiển và hiển thị trạng thái)
 */

let recordingState = {
  status: 'IDLE', // 'IDLE' | 'RECORDING' | 'PAUSED'
  targetTabId: null,
  meetingTitle: '',
  durationSeconds: 0,
  sessionId: null,
  lastTranscript: '',
};

// Khởi tạo trạng thái ban đầu khi extension được nạp
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Meetly Service Worker] Extension đã cài đặt thành công');
  chrome.storage.local.set({
    recordingState: { status: 'IDLE', durationSeconds: 0 },
    settings: {
      autoDownload: true,
      recordMic: true,
      serverUrl: 'https://meetly.dutai.io.vn',
      workspaceId: '',
      meetingId: '',
      authToken: '',
    },
  });
});

/**
 * Tự động tìm token xác thực (JWT) từ Cookie của Meetly Web hoặc cài đặt lưu trong Storage
 */
async function resolveAuthToken(serverUrl) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  if (settings.authToken && settings.authToken.trim()) {
    return settings.authToken.trim();
  }

  // Thử tìm cookie access_token trên domain Meetly
  const candidateUrls = [
    'https://meetly.dutai.io.vn',
    serverUrl,
  ].filter(Boolean);

  for (const url of candidateUrls) {
    try {
      const cookie = await chrome.cookies.get({ url: url, name: 'access_token' });
      if (cookie && cookie.value) {
        console.log(`[Meetly Service Worker] Đã tự động tìm thấy cookie access_token từ ${url}`);
        return cookie.value;
      }
    } catch (e) {
      // Bỏ qua nếu url không hợp lệ
    }
  }

  return '';
}

// Quản lý các kết nối Streaming từ các Tab Google Meet
const activeStreams = new Map(); // tabId -> StreamHandler

class StreamHandler {
  constructor(port) {
    this.port = port;
    this.tabId = port.sender?.tab?.id;
    this.producerWs = null;
    this.subscriberWs = null;
    this.sessionId = null;
    this.serverUrl = 'https://meetly.dutai.io.vn';
    this.sampleCount = 0;
    this.seq = 0;
    this.pendingControlMessages = [];
  }

  async start({ workspaceId, meetingId, serverUrl }) {
    this.serverUrl = serverUrl || 'https://meetly.dutai.io.vn';
    console.log(`[Meetly Service Worker] Bắt đầu phiên streaming cho WS: ${workspaceId}, Meet: ${meetingId}`);

    const token = await resolveAuthToken(this.serverUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 1. Tạo Transcription Session qua REST API của Backend
    let sessionData = null;
    try {
      const res = await fetch(
        `${this.serverUrl}/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcription-sessions`,
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            source_type: 'GOOGLE_MEET',
            sample_rate: 16000,
            stt_model: 'small',
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Server trả về lỗi HTTP ${res.status}: ${errBody}`);
      }

      const resJson = await res.json();
      sessionData = resJson.data;
    } catch (apiErr) {
      console.error('[Meetly Service Worker] Lỗi tạo phiên transcription:', apiErr);
      this.port.postMessage({
        type: 'ERROR',
        message: `Không thể kết nối Backend (${apiErr.message}). Vui lòng kiểm tra Server & Token.`,
      });
      return;
    }

    if (!sessionData || !sessionData.session_id) {
      this.port.postMessage({
        type: 'ERROR',
        message: 'Server không trả về session_id hợp lệ.',
      });
      return;
    }

    this.sessionId = sessionData.session_id;
    recordingState.sessionId = this.sessionId;
    chrome.storage.local.set({ recordingState });

    const prodTicket = sessionData.producer_ticket;
    const subTicket = sessionData.subscriber_ticket;

    const wsProto = this.serverUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = this.serverUrl.replace(/^https?:\/\//, '');

    // 2. Kết nối WebSocket Producer để gửi Audio PCM 16kHz
    if (prodTicket) {
      const prodWsUrl = `${wsProto}//${host}/api/v1/transcription-sessions/${this.sessionId}/audio?ticket=${encodeURIComponent(prodTicket)}`;
      this.producerWs = new WebSocket(prodWsUrl);
      this.producerWs.binaryType = 'arraybuffer';

      this.producerWs.onopen = () => {
        console.log('[Meetly Service Worker] Producer WebSocket đã kết nối thành công!');
        // Gửi các control messages còn xếp hàng (ví dụ: gán tên speaker ban đầu)
        while (this.pendingControlMessages.length > 0) {
          const ctrlMsg = this.pendingControlMessages.shift();
          try {
            this.producerWs.send(JSON.stringify(ctrlMsg));
          } catch (e) {}
        }
        this.port.postMessage({
          type: 'STREAMING_READY',
          sessionId: this.sessionId,
        });
      };

      this.producerWs.onerror = (e) => {
        console.error('[Meetly Service Worker] Producer WebSocket lỗi:', e);
      };

      this.producerWs.onclose = (e) => {
        console.log(`[Meetly Service Worker] Producer WebSocket đóng (code: ${e.code}, reason: ${e.reason})`);
      };
    }

    // 3. Kết nối WebSocket Subscriber để nhận bản dịch / phụ đề trực tiếp
    if (subTicket) {
      const subWsUrl = `${wsProto}//${host}/api/v1/transcription-sessions/${this.sessionId}/events?ticket=${encodeURIComponent(subTicket)}`;
      this.subscriberWs = new WebSocket(subWsUrl);

      this.subscriberWs.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.text) {
            recordingState.lastTranscript = event.text;
          }
          // Chuyển tiếp phụ đề về Content Script để hiển thị trên Floating Widget
          this.port.postMessage({
            type: 'TRANSCRIPT_EVENT',
            event: event,
          });
          // Thông báo cho Popup nếu đang mở
          chrome.runtime.sendMessage({
            type: 'TRANSCRIPT_EVENT',
            event: event,
          }).catch(() => {});
        } catch (err) {
          console.error('[Meetly Service Worker] Lỗi phân tích sự kiện subscriber:', err);
        }
      };

      this.subscriberWs.onerror = (e) => {
        console.error('[Meetly Service Worker] Subscriber WebSocket lỗi:', e);
      };
    }
  }

  sendAudioFrame(frameArray) {
    if (this.producerWs && this.producerWs.readyState === WebSocket.OPEN) {
      const uint8 = new Uint8Array(frameArray);
      this.producerWs.send(uint8.buffer);
    }
  }

  sendControlMessage(msgObj) {
    if (this.producerWs && this.producerWs.readyState === WebSocket.OPEN) {
      try {
        this.producerWs.send(JSON.stringify(msgObj));
      } catch (err) {
        console.warn('[Meetly Service Worker] Lỗi gửi control message:', err);
      }
    } else {
      this.pendingControlMessages.push(msgObj);
    }
  }

  async stop() {
    console.log('[Meetly Service Worker] Dừng phiên streaming cho session:', this.sessionId);

    // Gửi cờ EOS (flags = 0x01)
    if (this.producerWs && this.producerWs.readyState === WebSocket.OPEN) {
      try {
        const eosHeader = new ArrayBuffer(16);
        const view = new DataView(eosHeader);
        view.setUint8(0, 1);
        view.setUint8(1, 1);
        view.setUint16(2, 0x01, true); // EOS flag
        view.setUint32(4, this.seq++, true);
        view.setBigUint64(8, BigInt(this.sampleCount), true);
        this.producerWs.send(eosHeader);
      } catch (e) {}
    }

    if (this.producerWs) {
      this.producerWs.close();
      this.producerWs = null;
    }

    if (this.subscriberWs) {
      this.subscriberWs.close();
      this.subscriberWs = null;
    }

    // Gọi API Stop Session
    if (this.sessionId) {
      try {
        const token = await resolveAuthToken(this.serverUrl);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await fetch(`${this.serverUrl}/api/v1/transcription-sessions/${this.sessionId}/stop`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            total_samples: this.sampleCount,
            last_seq: this.seq,
          }),
        });
      } catch (e) {
        console.warn('[Meetly Service Worker] Lỗi gọi stop session:', e);
      }
      this.sessionId = null;
    }
  }
}

// Lắng nghe Port kết nối từ Content Script (Google Meet)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'meetly-audio-stream') {
    const handler = new StreamHandler(port);
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      activeStreams.set(tabId, handler);
    }

    port.onMessage.addListener(async (msg) => {
      switch (msg.type) {
        case 'START_STREAMING':
          await handler.start(msg);
          break;

        case 'AUDIO_FRAME':
          if (msg.data) {
            handler.sampleCount += msg.sampleCount || 0;
            handler.seq = msg.seq || handler.seq;
            handler.sendAudioFrame(msg.data);
          }
          break;

        case 'SPEAKER_UPDATE':
          handler.sendControlMessage({
            type: 'speaker_update',
            stream_id: msg.streamId || 1,
            speaker_name: msg.speakerName || '',
          });
          break;

        case 'STOP_STREAMING':
          await handler.stop();
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[Meetly Service Worker] Port disconnected cho tab:', tabId);
      handler.stop();
      if (tabId) activeStreams.delete(tabId);
    });
  }
});

// Lắng nghe các thông điệp từ Content Script hoặc Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      sendResponse({ state: recordingState });
      return true;

    case 'CHECK_AUTH':
      resolveAuthToken(message.serverUrl || 'https://meetly.dutai.io.vn').then((token) => {
        sendResponse({ hasToken: !!token, tokenPreview: token ? `${token.substring(0, 10)}...` : '' });
      });
      return true;

    case 'STATE_CHANGED':
      if (message.state) {
        recordingState = { ...recordingState, ...message.state };
        if (sender.tab && sender.tab.id) {
          recordingState.targetTabId = sender.tab.id;
        }
        chrome.storage.local.set({ recordingState });
        chrome.runtime.sendMessage({
          type: 'POPUP_STATE_UPDATE',
          state: recordingState,
        }).catch(() => {});
      }
      break;

    case 'TIMER_TICK':
      recordingState.durationSeconds = message.durationSeconds;
      chrome.runtime.sendMessage({
        type: 'TIMER_TICK',
        durationSeconds: message.durationSeconds,
      }).catch(() => {});
      break;

    case 'RECORDING_SAVED':
      recordingState = {
        status: 'IDLE',
        targetTabId: null,
        meetingTitle: '',
        durationSeconds: 0,
        sessionId: null,
        lastTranscript: '',
      };
      chrome.storage.local.set({ recordingState });
      chrome.runtime.sendMessage({
        type: 'RECORDING_SAVED',
        filename: message.filename,
      }).catch(() => {});
      break;
  }
});
