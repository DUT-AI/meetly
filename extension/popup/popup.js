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
  const selWorkspace = document.getElementById('selWorkspace');
  const txtWorkspaceId = document.getElementById('txtWorkspaceId');
  const selMeeting = document.getElementById('selMeeting');
  const txtMeetingId = document.getElementById('txtMeetingId');
  const txtAuthToken = document.getElementById('txtAuthToken');
  const authStatusBadge = document.getElementById('authStatusBadge');
  const linkWeb = document.getElementById('linkWeb');

  let activeMeetTab = null;
  let currentAuthToken = '';
  let activeRoomCode = '';

  const btnPresetLocal = document.getElementById('btnPresetLocal');
  const btnPresetProd = document.getElementById('btnPresetProd');

  // 1. Tải cài đặt đã lưu
  const { settings = {} } = await chrome.storage.local.get('settings');
  if (settings.recordMic !== undefined) chkRecordMic.checked = settings.recordMic;
  if (settings.autoDownload !== undefined) chkAutoDownload.checked = settings.autoDownload;
  if (settings.serverUrl) {
    txtServerUrl.value = settings.serverUrl;
  } else {
    txtServerUrl.value = 'http://localhost:8000';
  }
  if (settings.workspaceId && txtWorkspaceId) txtWorkspaceId.value = settings.workspaceId;
  if (settings.meetingId && txtMeetingId) txtMeetingId.value = settings.meetingId;
  if (settings.authToken && txtAuthToken) txtAuthToken.value = settings.authToken;

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

  // 2. Tìm tab Google Meet đang active hoặc gần nhất trước khi nạp dữ liệu
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (currentTab && currentTab.url && currentTab.url.includes('meet.google.com')) {
    activeMeetTab = currentTab;
    const urlObj = new URL(currentTab.url);
    activeRoomCode = urlObj.pathname.replace(/^\/+|\/+$/g, '');
    meetingCodeEl.textContent = activeRoomCode ? `Phòng: ${activeRoomCode}` : 'Trang chủ Google Meet';
    statusDotEl.classList.add('active');
  } else {
    // Kiểm tra xem có tab Meet nào khác đang mở không
    const meetTabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
    if (meetTabs.length > 0) {
      activeMeetTab = meetTabs[0];
      const urlObj = new URL(meetTabs[0].url);
      activeRoomCode = urlObj.pathname.replace(/^\/+|\/+$/g, '');
      meetingCodeEl.textContent = 'Phát hiện Google Meet ở tab khác';
      statusDotEl.classList.add('active');
    } else {
      meetingCodeEl.textContent = 'Không có tab Google Meet nào';
      btnStart.disabled = true;
      btnStart.title = 'Hãy mở một cuộc họp Google Meet trước';
    }
  }

  // Nạp danh sách Workspace từ Backend
  async function loadWorkspaces(token) {
    if (!selWorkspace) return;
    const sUrl = (txtServerUrl.value.trim() || 'http://localhost:8000').replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      selWorkspace.innerHTML = '<option value="">-- Đang nạp danh sách Workspace... --</option>';
      const res = await fetch(`${sUrl}/api/v1/workspaces`, { headers });
      if (!res.ok) {
        selWorkspace.innerHTML = '<option value="">-- Không thể nạp Workspace (Kiểm tra Token) --</option>';
        return;
      }
      const json = await res.json();
      const workspaces = json.data || [];
      if (workspaces.length === 0) {
        selWorkspace.innerHTML = '<option value="">-- Bạn chưa có Workspace nào --</option>';
        return;
      }

      selWorkspace.innerHTML = '';
      workspaces.forEach((ws) => {
        const opt = document.createElement('option');
        opt.value = ws.id;
        opt.textContent = `${ws.name} (${ws.id.substring(0, 8)}...)`;
        selWorkspace.appendChild(opt);
      });

      const currentWs = txtWorkspaceId.value.trim();
      const matched = workspaces.find((w) => w.id === currentWs);
      if (matched) {
        selWorkspace.value = matched.id;
      } else {
        selWorkspace.value = workspaces[0].id;
        txtWorkspaceId.value = workspaces[0].id;
        saveSettings();
      }

      await loadMeetings(selWorkspace.value, token);
    } catch (e) {
      console.warn('Lỗi nạp workspace:', e);
      selWorkspace.innerHTML = '<option value="">-- Lỗi kết nối Backend --</option>';
    }
  }

  // Nạp danh sách Meetings của Workspace
  async function loadMeetings(wsId, token) {
    if (!selMeeting || !wsId) return;
    const sUrl = (txtServerUrl.value.trim() || 'http://localhost:8000').replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      selMeeting.innerHTML = '<option value="">-- Đang tải danh sách cuộc họp... --</option>';
      const res = await fetch(`${sUrl}/api/v1/workspaces/${wsId}/meetings`, { headers });
      let meetings = [];
      if (res.ok) {
        const json = await res.json();
        meetings = json.data?.documents || json.data || [];
      }

      selMeeting.innerHTML = '';
      if (activeRoomCode) {
        const newOpt = document.createElement('option');
        newOpt.value = '__CREATE_NEW_FOR_ROOM__';
        newOpt.textContent = `+ Tạo cuộc họp mới cho phòng ${activeRoomCode}`;
        selMeeting.appendChild(newOpt);
      }

      meetings.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.title || 'Cuộc họp không tên'} (${m.id.substring(0, 8)}...)`;
        selMeeting.appendChild(opt);
      });

      const currentMeet = txtMeetingId.value.trim();
      const matched = meetings.find((m) => m.id === currentMeet);
      if (matched) {
        selMeeting.value = matched.id;
      } else if (activeRoomCode) {
        const roomMatched = meetings.find((m) => m.title && m.title.includes(activeRoomCode));
        if (roomMatched) {
          selMeeting.value = roomMatched.id;
          txtMeetingId.value = roomMatched.id;
          saveSettings();
        } else {
          selMeeting.value = '__CREATE_NEW_FOR_ROOM__';
        }
      } else if (meetings.length > 0) {
        selMeeting.value = meetings[0].id;
        txtMeetingId.value = meetings[0].id;
        saveSettings();
      }
    } catch (e) {
      console.warn('Lỗi nạp meetings:', e);
      selMeeting.innerHTML = '<option value="">-- Lỗi kết nối cuộc họp --</option>';
    }
  }

  // Kiểm tra trạng thái xác thực
  function checkAuthStatus() {
    const sUrl = txtServerUrl.value.trim() || 'http://localhost:8000';
    updateWebLink();
    chrome.runtime.sendMessage({ type: 'CHECK_AUTH', serverUrl: sUrl }, (res) => {
      if (res && res.hasToken) {
        authStatusBadge.textContent = '✓ Đã kết nối token';
        authStatusBadge.style.color = '#10b981';
        currentAuthToken = res.token || '';
        loadWorkspaces(currentAuthToken);
      } else {
        authStatusBadge.textContent = '⚠ Chưa có token';
        authStatusBadge.style.color = '#f59e0b';
        if (selWorkspace) selWorkspace.innerHTML = '<option value="">-- Hãy đăng nhập Meetly Web --</option>';
        if (selMeeting) selMeeting.innerHTML = '<option value="">-- Chưa có token xác thực --</option>';
      }
    });
  }
  checkAuthStatus();

  // Lưu cài đặt khi thay đổi
  function saveSettings() {
    chrome.storage.local.set({
      settings: {
        recordMic: chkRecordMic.checked,
        autoDownload: chkAutoDownload.checked,
        serverUrl: txtServerUrl.value.trim() || 'http://localhost:8000',
        workspaceId: txtWorkspaceId ? txtWorkspaceId.value.trim() : '',
        meetingId: txtMeetingId ? txtMeetingId.value.trim() : '',
        authToken: txtAuthToken ? txtAuthToken.value.trim() : ''
      }
    });
    updateWebLink();
  }

  if (selWorkspace) {
    selWorkspace.addEventListener('change', () => {
      txtWorkspaceId.value = selWorkspace.value;
      saveSettings();
      loadMeetings(selWorkspace.value, currentAuthToken);
    });
  }

  if (selMeeting) {
    selMeeting.addEventListener('change', async () => {
      if (selMeeting.value === '__CREATE_NEW_FOR_ROOM__') {
        const sUrl = (txtServerUrl.value.trim() || 'http://localhost:8000').replace(/\/+$/, '');
        const wsId = selWorkspace.value || txtWorkspaceId.value.trim();
        const headers = { 'Content-Type': 'application/json' };
        if (currentAuthToken) headers['Authorization'] = `Bearer ${currentAuthToken}`;
        const newTitle = activeRoomCode ? `Google Meet: ${activeRoomCode}` : `Google Meet: ${new Date().toLocaleTimeString('vi-VN')}`;
        try {
          const res = await fetch(`${sUrl}/api/v1/workspaces/${wsId}/meetings`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              title: newTitle,
              workspace_id: wsId,
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + 3600000).toISOString(),
              participants: [],
              report: {},
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const newId = data.data?.id;
            if (newId) {
              txtMeetingId.value = newId;
              saveSettings();
              await loadMeetings(wsId, currentAuthToken);
              selMeeting.value = newId;
            }
          }
        } catch (e) {
          console.warn('Lỗi tạo meeting:', e);
        }
      } else {
        txtMeetingId.value = selMeeting.value;
        saveSettings();
      }
    });
  }

  if (btnPresetLocal) {
    btnPresetLocal.addEventListener('click', () => {
      txtServerUrl.value = 'http://localhost:8000';
      saveSettings();
      checkAuthStatus();
    });
  }

  if (btnPresetProd) {
    btnPresetProd.addEventListener('click', () => {
      txtServerUrl.value = 'https://meetly.dutai.io.vn';
      saveSettings();
      checkAuthStatus();
    });
  }

  chkRecordMic.addEventListener('change', saveSettings);
  chkAutoDownload.addEventListener('change', saveSettings);
  txtServerUrl.addEventListener('input', () => {
    saveSettings();
    checkAuthStatus();
  });
  if (txtWorkspaceId) {
    txtWorkspaceId.addEventListener('input', () => {
      saveSettings();
      if (selWorkspace) selWorkspace.value = txtWorkspaceId.value.trim();
    });
  }
  if (txtMeetingId) {
    txtMeetingId.addEventListener('input', () => {
      saveSettings();
      if (selMeeting) selMeeting.value = txtMeetingId.value.trim();
    });
  }
  if (txtAuthToken) {
    txtAuthToken.addEventListener('input', () => {
      saveSettings();
      checkAuthStatus();
    });
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
