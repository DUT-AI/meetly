/**
 * Meetly - Popup Controller
 * Điều khiển trạng thái ghi âm và cài đặt từ Chrome Toolbar Popup
 */

document.addEventListener('DOMContentLoaded', async () => {
  const meetingCodeEl = document.getElementById('meetingCode');
  const statusLabelEl = document.getElementById('statusLabel');
  const statusDotEl = document.getElementById('statusDot');
  const timerDisplayEl = document.getElementById('timerDisplay');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnStop = document.getElementById('btnStop');
  const activeGroup = document.getElementById('activeGroup');

  const chkRecordMic = document.getElementById('chkRecordMic');
  const chkAutoDownload = document.getElementById('chkAutoDownload');
  const txtServerUrl = document.getElementById('txtServerUrl');

  let activeMeetTab = null;

  // 1. Tải cài đặt đã lưu
  const { settings = {} } = await chrome.storage.local.get('settings');
  if (settings.recordMic !== undefined) chkRecordMic.checked = settings.recordMic;
  if (settings.autoDownload !== undefined) chkAutoDownload.checked = settings.autoDownload;
  if (settings.serverUrl) txtServerUrl.value = settings.serverUrl;

  // Lưu cài đặt khi thay đổi
  function saveSettings() {
    chrome.storage.local.set({
      settings: {
        recordMic: chkRecordMic.checked,
        autoDownload: chkAutoDownload.checked,
        serverUrl: txtServerUrl.value.trim()
      }
    });
  }
  chkRecordMic.addEventListener('change', saveSettings);
  chkAutoDownload.addEventListener('change', saveSettings);
  txtServerUrl.addEventListener('input', saveSettings);

  // 2. Tìm tab Google Meet đang active hoặc gần nhất
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (currentTab && currentTab.url && currentTab.url.includes('meet.google.com')) {
    activeMeetTab = currentTab;
    const urlObj = new URL(currentTab.url);
    const roomCode = urlObj.pathname.replace(/^\/+|\/+$/g, '');
    meetingCodeEl.textContent = roomCode ? `Phòng: ${roomCode}` : 'Trang chủ Google Meet';
    statusDotEl.classList.add('active');
  } else {
    // Kiểm tra xem có tab Meet nào khác đang mở không
    const meetTabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
    if (meetTabs.length > 0) {
      activeMeetTab = meetTabs[0];
      meetingCodeEl.textContent = 'Phát hiện Google Meet ở tab khác';
      statusDotEl.classList.add('active');
    } else {
      meetingCodeEl.textContent = 'Không có tab Google Meet nào';
      btnStart.disabled = true;
      btnStart.title = 'Hãy mở một cuộc họp Google Meet trước';
    }
  }

  // 3. Định dạng thời gian hiển thị
  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderState(state) {
    if (!state) return;
    const status = state.status || 'IDLE';

    statusDotEl.className = 'status-dot';

    if (status === 'RECORDING') {
      statusDotEl.classList.add('recording');
      statusLabelEl.textContent = 'ĐANG GHI ÂM';
      btnStart.style.display = 'none';
      activeGroup.style.display = 'flex';
      btnPause.textContent = 'Tạm dừng';
    } else if (status === 'PAUSED') {
      statusDotEl.classList.add('active');
      statusLabelEl.textContent = 'TẠM DỪNG';
      btnStart.style.display = 'none';
      activeGroup.style.display = 'flex';
      btnPause.textContent = 'Tiếp tục';
    } else {
      statusLabelEl.textContent = activeMeetTab ? 'SẴN SÀNG' : 'CHƯA VÀO MEET';
      btnStart.style.display = 'flex';
      activeGroup.style.display = 'none';
      if (activeMeetTab) btnStart.disabled = false;
    }

    if (state.durationSeconds !== undefined) {
      timerDisplayEl.textContent = formatTime(state.durationSeconds);
    }
  }

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
    if (res && res.state) {
      renderState(res.state);
    }
  });

  // 4. Lắng nghe cập nhật từ Background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TIMER_TICK') {
      timerDisplayEl.textContent = formatTime(msg.durationSeconds);
    } else if (msg.type === 'POPUP_STATE_UPDATE') {
      renderState(msg.state);
    } else if (msg.type === 'RECORDING_SAVED') {
      timerDisplayEl.textContent = '00:00';
      meetingCodeEl.textContent = `Đã lưu: ${msg.filename}`;
      renderState({ status: 'IDLE', durationSeconds: 0 });
    }
  });

  // 5. Nút bấm trên Popup
  btnStart.addEventListener('click', async () => {
    if (!activeMeetTab) return;
    // Chuyển tới tab Google Meet để người dùng thao tác trên Floating Widget
    await chrome.tabs.update(activeMeetTab.id, { active: true });
    window.close();
  });
});
