/**
 * Meetly - Background Service Worker (Manifest V3)
 * Điều phối trung tâm giữa:
 * - Content Script (giao diện trên Google Meet)
 * - Popup UI (menu khi bấm vào icon extension)
 * - Chrome Storage & Downloads API
 */

let recordingState = {
  status: 'IDLE', // 'IDLE' | 'RECORDING' | 'PAUSED'
  targetTabId: null,
  meetingTitle: '',
  durationSeconds: 0
};

// Khởi tạo trạng thái ban đầu khi extension được nạp
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Meetly Service Worker] Extension đã cài đặt thành công');
  chrome.storage.local.set({
    recordingState: { status: 'IDLE', durationSeconds: 0 },
    settings: {
      autoDownload: true,
      recordMic: true,
      serverUrl: 'http://localhost:8000',
      workspaceId: ''
    }
  });
});

// Lắng nghe các thông điệp từ Content Script hoặc Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      sendResponse({ state: recordingState });
      return true;

    case 'STATE_CHANGED':
      if (message.state) {
        recordingState = { ...recordingState, ...message.state };
        if (sender.tab && sender.tab.id) {
          recordingState.targetTabId = sender.tab.id;
        }
        chrome.storage.local.set({ recordingState });
        // Phát thông báo tới các phần khác (như Popup UI)
        chrome.runtime.sendMessage({
          type: 'POPUP_STATE_UPDATE',
          state: recordingState
        }).catch(() => {});
      }
      break;

    case 'TIMER_TICK':
      recordingState.durationSeconds = message.durationSeconds;
      chrome.runtime.sendMessage({
        type: 'TIMER_TICK',
        durationSeconds: message.durationSeconds
      }).catch(() => {});
      break;

    case 'RECORDING_SAVED':
      recordingState = {
        status: 'IDLE',
        targetTabId: null,
        meetingTitle: '',
        durationSeconds: 0
      };
      chrome.storage.local.set({ recordingState });
      chrome.runtime.sendMessage({
        type: 'RECORDING_SAVED',
        filename: message.filename
      }).catch(() => {});
      break;
  }
});
