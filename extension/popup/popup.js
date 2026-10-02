/**
 * Meetly - Popup Controller v1.1
 * Giao diện hiện đại, tự động đồng bộ Workspace & Meeting từ Backend qua Service Worker
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const meetingCodeEl = document.getElementById('meetingCode');
  const statusLabelEl = document.getElementById('statusLabel');
  const statusDotEl = document.getElementById('statusDot');
  const timerDisplayEl = document.getElementById('timerDisplay');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnStop = document.getElementById('btnStop');
  const activeGroup = document.getElementById('activeGroup');

  const btnRefresh = document.getElementById('btnRefresh');
  const selWorkspace = document.getElementById('selWorkspace');
  const selMeeting = document.getElementById('selMeeting');
  const btnCreateMeeting = document.getElementById('btnCreateMeeting');
  const btnSyncTab = document.getElementById('btnSyncTab');

  const chkRecordMic = document.getElementById('chkRecordMic');
  const chkAutoDownload = document.getElementById('chkAutoDownload');
  const txtServerUrl = document.getElementById('txtServerUrl');
  const txtWorkspaceId = document.getElementById('txtWorkspaceId');
  const txtMeetingId = document.getElementById('txtMeetingId');
  const txtAuthToken = document.getElementById('txtAuthToken');
  const authStatusBadge = document.getElementById('authStatusBadge');
  const linkWeb = document.getElementById('linkWeb');

  const btnPresetLocal = document.getElementById('btnPresetLocal');
  const btnPresetProd = document.getElementById('btnPresetProd');

  let activeMeetTab = null;
  let activeRoomCode = '';
  let detectedWsFromTab = '';
  let detectedMeetFromTab = '';

  // 1. Tải cài đặt đã lưu
  const { settings = {} } = await chrome.storage.local.get('settings');
  if (settings.recordMic !== undefined) chkRecordMic.checked = settings.recordMic;
  if (settings.autoDownload !== undefined) chkAutoDownload.checked = settings.autoDownload;
  txtServerUrl.value = settings.serverUrl || 'http://localhost:8000';
  if (settings.workspaceId) txtWorkspaceId.value = settings.workspaceId;
  if (settings.meetingId) txtMeetingId.value = settings.meetingId;
  if (settings.authToken) txtAuthToken.value = settings.authToken;

  function updateWebLink() {
    if (!linkWeb) return;
    const sUrl = txtServerUrl.value.trim();
    if (sUrl.includes('localhost') || sUrl.includes('127.0.0.1')) {
      linkWeb.href = 'http://localhost:3000';
    } else {
      linkWeb.href = 'https://meetly.dutai.io.vn';
    }
  }
  updateWebLink();

  // 2. Phân tích tab hiện tại
  async function detectActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url) return;

    if (currentTab.url.includes('meet.google.com')) {
      activeMeetTab = currentTab;
      try {
        const urlObj = new URL(currentTab.url);
        activeRoomCode = urlObj.pathname.replace(/^\/+|\/+$/g, '');
        meetingCodeEl.textContent = activeRoomCode ? `Google Meet: ${activeRoomCode}` : 'Trang chủ Google Meet';
        statusLabelEl.textContent = 'SẴN SÀNG';
        statusDotEl.className = 'status-dot active';
        btnStart.disabled = false;
      } catch (e) {}
    } else if (currentTab.url.includes('/workspaces/')) {
      // Đang ở trên Meetly Web
      try {
        const urlObj = new URL(currentTab.url);
        const parts = urlObj.pathname.split('/');
        const wsIdx = parts.indexOf('workspaces');
        if (wsIdx !== -1 && parts[wsIdx + 1]) {
          detectedWsFromTab = parts[wsIdx + 1];
        }
        const meetIdx = parts.indexOf('meetings');
        if (meetIdx !== -1 && parts[meetIdx + 1]) {
          detectedMeetFromTab = parts[meetIdx + 1];
        }
        meetingCodeEl.textContent = `Meetly Web (Đã nhận diện tab)`;
        statusLabelEl.textContent = 'MEETLY WEB';
        statusDotEl.className = 'status-dot';
      } catch (e) {}
    } else {
      // Tìm xem có tab Meet nào khác không
      const meetTabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
      if (meetTabs.length > 0) {
        activeMeetTab = meetTabs[0];
        try {
          const urlObj = new URL(activeMeetTab.url);
          activeRoomCode = urlObj.pathname.replace(/^\/+|\/+$/g, '');
        } catch (e) {}
        meetingCodeEl.textContent = activeRoomCode ? `Phát hiện Meet: ${activeRoomCode}` : 'Phát hiện Google Meet ở tab khác';
        statusLabelEl.textContent = 'CÓ MEET Ở TAB KHÁC';
        statusDotEl.className = 'status-dot active';
        btnStart.disabled = false;
      } else {
        meetingCodeEl.textContent = 'Mở Google Meet để ghi âm';
        statusLabelEl.textContent = 'CHƯA VÀO MEET';
        statusDotEl.className = 'status-dot';
      }
    }
  }
  await detectActiveTab();

  // 3. Nạp danh sách Workspace qua Service Worker
  function loadWorkspaces() {
    const sUrl = txtServerUrl.value.trim() || 'http://localhost:8000';
    selWorkspace.innerHTML = '<option value="">-- Đang nạp danh sách Workspace... --</option>';

    chrome.runtime.sendMessage({ type: 'GET_WORKSPACES', serverUrl: sUrl }, (res) => {
      if (!res || !res.success) {
        const errMsg = res ? res.error : 'Không nhận được phản hồi';
        selWorkspace.innerHTML = `<option value="">-- ${errMsg} --</option>`;
        return;
      }

      const workspaces = res.workspaces || [];
      if (workspaces.length === 0) {
        selWorkspace.innerHTML = '<option value="">-- Bạn chưa có Workspace nào --</option>';
        return;
      }

      selWorkspace.innerHTML = '';
      workspaces.forEach((ws) => {
        const opt = document.createElement('option');
        opt.value = ws.id;
        opt.textContent = `${ws.name}`;
        selWorkspace.appendChild(opt);
      });

      // Ưu tiên chọn: tab hiện tại -> ID đã lưu -> workspace đầu tiên
      const targetWs = detectedWsFromTab || txtWorkspaceId.value.trim() || workspaces[0].id;
      const matched = workspaces.find((w) => w.id === targetWs);
      if (matched) {
        selWorkspace.value = matched.id;
        txtWorkspaceId.value = matched.id;
      } else {
        selWorkspace.value = workspaces[0].id;
        txtWorkspaceId.value = workspaces[0].id;
      }
      saveSettings();

      loadMeetings(selWorkspace.value);
    });
  }

  // 4. Nạp danh sách Meetings qua Service Worker
  function loadMeetings(wsId) {
    if (!wsId) return;
    const sUrl = txtServerUrl.value.trim() || 'http://localhost:8000';
    selMeeting.innerHTML = '<option value="">-- Đang tải danh sách cuộc họp... --</option>';

    chrome.runtime.sendMessage({ type: 'GET_MEETINGS', serverUrl: sUrl, workspaceId: wsId }, (res) => {
      if (!res || !res.success) {
        const errMsg = res ? res.error : 'Không nhận được phản hồi';
        selMeeting.innerHTML = `<option value="">-- ${errMsg} --</option>`;
        return;
      }

      const meetings = res.meetings || [];
      selMeeting.innerHTML = '';

      if (activeRoomCode) {
        const newOpt = document.createElement('option');
        newOpt.value = '__CREATE_NEW_FOR_ROOM__';
        newOpt.textContent = `➕ Tạo cuộc họp mới: Google Meet (${activeRoomCode})`;
        selMeeting.appendChild(newOpt);
      }

      meetings.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.title || 'Cuộc họp không tên'}`;
        selMeeting.appendChild(opt);
      });

      if (meetings.length === 0 && !activeRoomCode) {
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- Chưa có cuộc họp nào (Bấm ➕ để tạo) --';
        selMeeting.appendChild(emptyOpt);
      }

      // Ưu tiên chọn: tab hiện tại -> meeting trùng roomCode -> meeting đã lưu -> meeting đầu tiên
      const targetMeet = detectedMeetFromTab || txtMeetingId.value.trim();
      const matched = meetings.find((m) => m.id === targetMeet);
      if (matched) {
        selMeeting.value = matched.id;
        txtMeetingId.value = matched.id;
      } else if (activeRoomCode) {
        const roomMatched = meetings.find((m) => m.title && m.title.includes(activeRoomCode));
        if (roomMatched) {
          selMeeting.value = roomMatched.id;
          txtMeetingId.value = roomMatched.id;
        } else {
          selMeeting.value = '__CREATE_NEW_FOR_ROOM__';
        }
      } else if (meetings.length > 0) {
        selMeeting.value = meetings[0].id;
        txtMeetingId.value = meetings[0].id;
      }
      saveSettings();
    });
  }

  // 5. Kiểm tra trạng thái Token
  function checkAuthStatus() {
    const sUrl = txtServerUrl.value.trim() || 'http://localhost:8000';
    updateWebLink();
    chrome.runtime.sendMessage({ type: 'CHECK_AUTH', serverUrl: sUrl }, (res) => {
      if (res && res.hasToken) {
        authStatusBadge.textContent = '✓ Đã kết nối Token';
        authStatusBadge.className = 'auth-pill connected';
        loadWorkspaces();
      } else {
        authStatusBadge.textContent = '⚠ Chưa đăng nhập';
        authStatusBadge.className = 'auth-pill missing';
        selWorkspace.innerHTML = '<option value="">-- Vui lòng đăng nhập Meetly Web trước --</option>';
        selMeeting.innerHTML = '<option value="">-- Chưa có phiên đăng nhập --</option>';
      }
    });
  }
  checkAuthStatus();

  // 6. Lưu cài đặt
  function saveSettings() {
    chrome.storage.local.set({
      settings: {
        recordMic: chkRecordMic.checked,
        autoDownload: chkAutoDownload.checked,
        serverUrl: txtServerUrl.value.trim() || 'http://localhost:8000',
        workspaceId: txtWorkspaceId.value.trim(),
        meetingId: txtMeetingId.value.trim(),
        authToken: txtAuthToken.value.trim(),
      }
    });
    updateWebLink();
  }

  // 7. Event Handlers
  selWorkspace.addEventListener('change', () => {
    txtWorkspaceId.value = selWorkspace.value;
    saveSettings();
    loadMeetings(selWorkspace.value);
  });

  selMeeting.addEventListener('change', async () => {
    if (selMeeting.value === '__CREATE_NEW_FOR_ROOM__') {
      await handleCreateMeeting();
    } else {
      txtMeetingId.value = selMeeting.value;
      saveSettings();
    }
  });

  async function handleCreateMeeting() {
    const wsId = selWorkspace.value || txtWorkspaceId.value.trim();
    if (!wsId) {
      alert('Vui lòng chọn Workspace trước!');
      return;
    }
    const sUrl = txtServerUrl.value.trim() || 'http://localhost:8000';
    const title = activeRoomCode
      ? `Google Meet: ${activeRoomCode}`
      : `Google Meet (${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')})`;

    btnCreateMeeting.disabled = true;
    btnCreateMeeting.textContent = 'Đang tạo...';

    chrome.runtime.sendMessage(
      { type: 'CREATE_MEETING', serverUrl: sUrl, workspaceId: wsId, title },
      (res) => {
        btnCreateMeeting.disabled = false;
        btnCreateMeeting.innerHTML = '<span>➕</span> Tạo cuộc họp mới';

        if (res && res.success && res.meeting) {
          const newId = res.meeting.id;
          txtMeetingId.value = newId;
          saveSettings();
          loadMeetings(wsId);
        } else {
          alert('Không thể tạo cuộc họp: ' + (res ? res.error : 'Lỗi không xác định'));
        }
      }
    );
  }

  btnCreateMeeting.addEventListener('click', handleCreateMeeting);

  btnSyncTab.addEventListener('click', async () => {
    await detectActiveTab();
    if (detectedWsFromTab) {
      txtWorkspaceId.value = detectedWsFromTab;
      if (detectedMeetFromTab) txtMeetingId.value = detectedMeetFromTab;
      saveSettings();
      loadWorkspaces();
    } else if (activeRoomCode) {
      loadWorkspaces();
    } else {
      alert('Tab hiện tại không phải là Meetly Web hoặc Google Meet.');
    }
  });

  btnRefresh.addEventListener('click', () => {
    btnRefresh.style.transform = 'rotate(180deg)';
    setTimeout(() => { btnRefresh.style.transform = 'none'; }, 300);
    checkAuthStatus();
  });

  btnPresetLocal.addEventListener('click', () => {
    txtServerUrl.value = 'http://localhost:8000';
    saveSettings();
    checkAuthStatus();
  });

  btnPresetProd.addEventListener('click', () => {
    txtServerUrl.value = 'https://meetly.dutai.io.vn';
    saveSettings();
    checkAuthStatus();
  });

  chkRecordMic.addEventListener('change', saveSettings);
  chkAutoDownload.addEventListener('change', saveSettings);
  txtServerUrl.addEventListener('input', () => { saveSettings(); checkAuthStatus(); });
  txtWorkspaceId.addEventListener('input', () => {
    saveSettings();
    if (selWorkspace) selWorkspace.value = txtWorkspaceId.value.trim();
  });
  txtMeetingId.addEventListener('input', () => {
    saveSettings();
    if (selMeeting) selMeeting.value = txtMeetingId.value.trim();
  });
  txtAuthToken.addEventListener('input', () => { saveSettings(); checkAuthStatus(); });

  // 8. Trạng thái Timer & Recording
  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderState(state) {
    if (!state) return;
    const status = state.status || 'IDLE';

    if (status === 'RECORDING') {
      statusDotEl.className = 'status-dot recording';
      statusLabelEl.textContent = 'ĐANG GHI ÂM';
      btnStart.style.display = 'none';
      activeGroup.style.display = 'flex';
      btnPause.textContent = 'Tạm dừng';
    } else if (status === 'PAUSED') {
      statusDotEl.className = 'status-dot active';
      statusLabelEl.textContent = 'TẠM DỪNG';
      btnStart.style.display = 'none';
      activeGroup.style.display = 'flex';
      btnPause.textContent = 'Tiếp tục';
    } else {
      if (activeMeetTab) {
        statusLabelEl.textContent = 'SẴN SÀNG';
        statusDotEl.className = 'status-dot active';
        btnStart.disabled = false;
      }
      btnStart.style.display = 'flex';
      activeGroup.style.display = 'none';
    }

    if (state.durationSeconds !== undefined) {
      timerDisplayEl.textContent = formatTime(state.durationSeconds);
    }
  }

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
    if (res && res.state) renderState(res.state);
  });

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

  btnStart.addEventListener('click', async () => {
    if (activeMeetTab) {
      await chrome.tabs.update(activeMeetTab.id, { active: true });
      window.close();
    } else {
      alert('Vui lòng mở một tab Google Meet trước khi ghi âm!');
    }
  });
});
