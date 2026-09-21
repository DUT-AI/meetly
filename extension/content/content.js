/**
 * Meetly - Content Script for Google Meet
 * Triển khai Dual-Stream Recording trực tiếp trên Google Meet:
 * 1. Bắt âm thanh tab Google Meet (thông qua getDisplayMedia)
 * 2. Bắt âm thanh Micro của người dùng (thông qua getUserMedia)
 * 3. Trộn (mix) 2 luồng âm thanh bằng Web Audio API
 * 4. Nén và xuất file .webm chất lượng cao (Opus)
 * 5. Giao diện Floating Widget bằng Shadow DOM cách ly hoàn toàn, hỗ trợ kéo thả và thu gọn.
 */

(function () {
  'use strict';

  // Tránh inject trùng lặp
  if (window.__MEETLY_RECORDER_INJECTED__) return;
  window.__MEETLY_RECORDER_INJECTED__ = true;

  let widgetHost = null;
  let shadowRoot = null;
  let currentStatus = 'IDLE'; // 'IDLE' | 'RECORDING' | 'PAUSED' | 'PROCESSING'
  let isMinimized = false;
  let secondsElapsed = 0;
  let timerInterval = null;

  // Đối tượng phục vụ thu âm
  let mediaRecorder = null;
  let recordedChunks = [];
  let displayStream = null;
  let micStream = null;
  let audioCtx = null;
  let mixerNode = null;

  // Live Streaming & Audio Resampling state
  let streamPort = null;
  let producerWs = null;
  let subscriberWs = null;
  let pcmProcessorNode = null;
  let streamSeq = 0;
  let totalAudioSamples = 0;
  let activeSessionId = null;
  let activeWorkspaceId = '';
  let activeMeetingId = '';

  function downsampleTo16k(inputBuffer, inputSampleRate) {
    if (inputSampleRate === 16000) return inputBuffer;
    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(inputBuffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
        accum += inputBuffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  function floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  function createBinaryFrame(streamId, flags, seq, startSample, pcmInt16Data) {
    const headerBuffer = new ArrayBuffer(16);
    const view = new DataView(headerBuffer);
    view.setUint8(0, 1); // version 1
    view.setUint8(1, streamId); // streamId 1
    view.setUint16(2, flags, true); // flags (LE)
    view.setUint32(4, seq, true); // seq (LE)
    view.setBigUint64(8, BigInt(startSample), true); // start_sample (uint64 LE)

    const combined = new Uint8Array(16 + pcmInt16Data.byteLength);
    combined.set(new Uint8Array(headerBuffer), 0);
    combined.set(new Uint8Array(pcmInt16Data.buffer, pcmInt16Data.byteOffset, pcmInt16Data.byteLength), 16);
    return combined.buffer;
  }

  // Lấy mã phòng họp từ URL (ví dụ: meet.google.com/abc-defg-hij -> abc-defg-hij)
  function getMeetingCode() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (path && path.length >= 3) {
      return path.split('?')[0];
    }
    return 'Google-Meet';
  }

  // Khởi tạo Shadow DOM và render Widget
  function initWidget() {
    if (document.getElementById('meetly-recorder-root')) return;

    widgetHost = document.createElement('div');
    widgetHost.id = 'meetly-recorder-root';
    widgetHost.style.position = 'fixed';
    widgetHost.style.top = '24px';
    widgetHost.style.right = '24px';
    widgetHost.style.zIndex = '9999999';
    widgetHost.style.userSelect = 'none';

    shadowRoot = widgetHost.attachShadow({ mode: 'open' });
    const logoUrl = chrome.runtime.getURL('icons/icon48.png');

    // Inject CSS & HTML vào Shadow Root
    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 14px;
          color: #f3f4f6;
          box-sizing: border-box;
        }

        *, *::before, *::after {
          box-sizing: inherit;
        }

        .widget-card {
          background: rgba(17, 24, 39, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(99, 102, 241, 0.2);
          width: 295px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(31, 41, 55, 0.65);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          cursor: move;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.3px;
          color: #ffffff;
        }

        .brand-icon {
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-dot {
          width: 7px;
          height: 7px;
          background: #ef4444;
          border-radius: 50%;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, background 0.15s;
        }

        .icon-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .widget-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .status-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(31, 41, 55, 0.5);
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #9ca3af;
        }

        .dot.recording {
          background: #ef4444;
          box-shadow: 0 0 10px #ef4444;
          animation: pulse 1.5s infinite;
        }

        .dot.paused {
          background: #f59e0b;
          box-shadow: 0 0 10px #f59e0b;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }

        .status-text {
          font-size: 12px;
          font-weight: 500;
          color: #e5e7eb;
        }

        .timer {
          font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 1px;
        }

        .audio-bars {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 14px;
        }

        .audio-bar {
          width: 3px;
          height: 6px;
          background: #6366f1;
          border-radius: 2px;
          transition: height 0.15s ease;
        }

        .recording .audio-bar {
          animation: soundwave 1.2s ease-in-out infinite alternate;
        }

        .recording .audio-bar:nth-child(1) { animation-delay: 0.1s; }
        .recording .audio-bar:nth-child(2) { animation-delay: 0.3s; }
        .recording .audio-bar:nth-child(3) { animation-delay: 0.5s; }
        .recording .audio-bar:nth-child(4) { animation-delay: 0.2s; }
        .recording .audio-bar:nth-child(5) { animation-delay: 0.4s; }

        @keyframes soundwave {
          0% { height: 4px; }
          100% { height: 14px; }
        }

        .transcript-preview {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 110px;
          overflow-y: auto;
        }

        .transcript-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #818cf8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .transcript-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
          animation: pulse 1s infinite;
        }

        .transcript-content {
          font-size: 11px;
          line-height: 1.4;
          color: #f1f5f9;
          word-break: break-word;
        }

        .transcript-translation {
          font-size: 11px;
          line-height: 1.4;
          color: #a5b4fc;
          background: rgba(99, 102, 241, 0.12);
          border-left: 2px solid #6366f1;
          padding: 4px 6px;
          border-radius: 4px;
          margin-top: 3px;
          word-break: break-word;
          font-style: italic;
        }

        .transcript-translation-empty {
          display: none;
        }

        .action-group {
          display: flex;
          gap: 8px;
        }

        .btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #f87171, #ef4444);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .btn-danger {
          background: linear-gradient(135deg, #4f46e5, #4338ca);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
        }

        .btn-danger:hover {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          transform: translateY(-1px);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .toast {
          margin-top: 4px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 11px;
          display: none;
          text-align: center;
          animation: fadeIn 0.3s ease;
          line-height: 1.4;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Minimized State */
        .minimized-pill {
          display: none;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: rgba(17, 24, 39, 0.94);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 30px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          cursor: pointer;
        }

        .is-minimized .widget-card {
          display: none;
        }

        .is-minimized .minimized-pill {
          display: flex;
        }
      </style>

      <div id="container">
        <!-- Card đầy đủ -->
        <div class="widget-card" id="fullCard">
          <div class="widget-header" id="dragHeader">
            <div class="brand">
              <img src="${logoUrl}" width="20" height="20" style="border-radius: 5px; object-fit: cover;" alt="Meetly">
              <span>Meetly Recorder</span>
            </div>
            <div class="header-actions">
              <button class="icon-btn" id="btnMinimize" title="Thu nhỏ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>

          <div class="widget-body">
            <div class="status-box">
              <div class="status-indicator">
                <div class="dot" id="statusDot"></div>
                <span class="status-text" id="statusLabel">Sẵn sàng ghi âm</span>
              </div>
              <div class="timer" id="timerDisplay">00:00</div>
            </div>

            <!-- Waveform bars -->
            <div class="audio-bars" id="audioWave">
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
            </div>

            <!-- Phụ đề & Dịch trực tiếp -->
            <div class="transcript-preview" id="transcriptPreview" style="display: none;">
              <div class="transcript-label">
                <div class="transcript-live-dot"></div>
                <span>Phụ đề & Dịch trực tiếp (SeamlessM4T)</span>
              </div>
              <div class="transcript-content" id="transcriptContent">Đang lắng nghe âm thanh...</div>
              <div class="transcript-translation transcript-translation-empty" id="transcriptTranslation"></div>
            </div>

            <!-- Nút điều khiển -->
            <div class="action-group" id="idleControls">
              <button class="btn btn-primary" id="btnStartRecord">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="8" fill="currentColor"></circle>
                </svg>
                Ghi âm cuộc họp
              </button>
            </div>

            <div class="action-group" id="activeControls" style="display: none;">
              <button class="btn btn-secondary" id="btnPauseResume">
                <span id="pauseResumeLabel">Tạm dừng</span>
              </button>
              <button class="btn btn-danger" id="btnStopRecord">
                ⏹ Lưu & Tải về
              </button>
            </div>

            <!-- Thông báo Toast -->
            <div class="toast" id="toastMsg"></div>
          </div>
        </div>

        <!-- Pill thu nhỏ -->
        <div class="minimized-pill" id="miniPill" title="Bấm để mở rộng Meetly">
          <img src="${logoUrl}" width="16" height="16" style="border-radius: 4px; object-fit: cover;" alt="Meetly">
          <div class="dot" id="miniDot"></div>
          <span style="font-weight:600; font-size:12px; color:#ffffff;">Meetly</span>
          <span class="timer" id="miniTimer" style="font-size:13px;">00:00</span>
        </div>
      </div>
    `;

    document.body.appendChild(widgetHost);
    bindEvents();
  }

  // Gán sự kiện và logic kéo thả
  function bindEvents() {
    const dragHeader = shadowRoot.getElementById('dragHeader');
    const miniPill = shadowRoot.getElementById('miniPill');
    const btnMinimize = shadowRoot.getElementById('btnMinimize');
    const btnStart = shadowRoot.getElementById('btnStartRecord');
    const btnPauseResume = shadowRoot.getElementById('btnPauseResume');
    const btnStop = shadowRoot.getElementById('btnStopRecord');

    // 1. Kéo thả widget trên màn hình
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    dragHeader.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widgetHost.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        widgetHost.style.left = `${Math.max(10, initialLeft + dx)}px`;
        widgetHost.style.top = `${Math.max(10, initialTop + dy)}px`;
        widgetHost.style.right = 'auto';
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // 2. Thu nhỏ / Phóng to
    btnMinimize.addEventListener('click', () => toggleMinimize(true));
    miniPill.addEventListener('click', () => toggleMinimize(false));

    // 3. Xử lý ghi âm
    btnStart.addEventListener('click', async () => {
      btnStart.disabled = true;
      try {
        await startMeetingRecording();
      } catch (err) {
        console.error('[Meetly] Lỗi khởi động ghi âm:', err);
        if (err.name === 'NotAllowedError') {
          showToast('Bạn đã hủy chia sẻ âm thanh hoặc chưa chọn Chia sẻ.', true);
        } else {
          showToast(`Lỗi: ${err.message || 'Không thể bắt đầu ghi âm'}`, true);
        }
      } finally {
        btnStart.disabled = false;
      }
    });

    btnPauseResume.addEventListener('click', () => {
      if (currentStatus === 'RECORDING') {
        pauseRecording();
      } else if (currentStatus === 'PAUSED') {
        resumeRecording();
      }
    });

    btnStop.addEventListener('click', async () => {
      btnStop.disabled = true;
      showToast('Đang xử lý và lưu file âm thanh...');
      try {
        await stopMeetingRecording();
      } catch (err) {
        console.error('[Meetly] Lỗi dừng ghi âm:', err);
        showToast('Lỗi lưu file: ' + err.message, true);
      } finally {
        btnStop.disabled = false;
      }
    });
  }

  /**
   * Bắt đầu thu âm kép: Tab Google Meet + Micro của người dùng
   */
  async function startMeetingRecording() {
    showToast('Chọn Thẻ Google Meet hiện tại và bấm Chia sẻ...', false);

    // 1. Yêu cầu âm thanh từ Tab thông qua getDisplayMedia với cấu hình tối ưu
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      systemAudio: 'include'
    });

    // Tắt ngay video track để tiết kiệm RAM/CPU (vì chúng ta chỉ cần âm thanh)
    displayStream.getVideoTracks().forEach((track) => track.stop());

    const tabAudioTracks = displayStream.getAudioTracks();
    const hasTabAudio = tabAudioTracks.length > 0;

    if (!hasTabAudio) {
      console.warn('[Meetly] Không tìm thấy luồng âm thanh tab trong DisplayMedia');
    }

    // 2. Yêu cầu âm thanh Micro của người dùng
    micStream = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (micErr) {
      console.warn('[Meetly] Không thể truy cập Micro, chỉ thu âm thanh phòng họp:', micErr);
    }

    // 3. Khởi tạo Web Audio API để gộp các luồng (ưu tiên 16kHz native để âm thanh trong trẻo, không bị méo tiếng)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      audioCtx = new AudioContextClass({ sampleRate: 16000 });
    } catch (e) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    mixerNode = audioCtx.createGain();
    const mixedDestination = audioCtx.createMediaStreamDestination();
    mixerNode.connect(mixedDestination);

    // Đưa âm thanh tab vào luồng ghi âm (Âm thanh tab đã được trình duyệt phát ra loa tự nhiên)
    if (hasTabAudio) {
      const tabSource = audioCtx.createMediaStreamSource(new MediaStream([tabAudioTracks[0]]));
      tabSource.connect(mixerNode);

      // Tự động dừng và lưu khi người dùng bấm nút "Dừng chia sẻ" trên thanh trình duyệt
      tabAudioTracks[0].onended = () => {
        if (currentStatus !== 'IDLE') {
          stopMeetingRecording();
        }
      };
    }

    // Đưa âm thanh micro vào luồng ghi âm
    if (micStream && micStream.getAudioTracks().length > 0) {
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(mixerNode);
    }

    // 4. Khởi tạo MediaRecorder
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
    }

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mixedDestination.stream, {
      mimeType: mimeType,
      audioBitsPerSecond: 128000
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.start(1000); // Thu thập dữ liệu mỗi 1 giây

    // 5. Khởi tạo streaming âm thanh PCM 16kHz tới Background Service Worker
    try {
      const storageData = await chrome.storage.local.get('settings');
      const settings = storageData.settings || {};
      const serverUrl = settings.serverUrl || 'http://localhost:8000';
      activeWorkspaceId = settings.workspaceId || '';
      activeMeetingId = settings.meetingId || '';

      streamSeq = 0;
      totalAudioSamples = 0;

      // Kết nối long-lived port tới Background Service Worker
      if (streamPort) {
        try { streamPort.disconnect(); } catch (e) {}
      }
      streamPort = chrome.runtime.connect({ name: 'meetly-audio-stream' });

      const transcriptBox = shadowRoot.getElementById('transcriptPreview');
      const transcriptContent = shadowRoot.getElementById('transcriptContent');
      const transcriptTranslation = shadowRoot.getElementById('transcriptTranslation');

      streamPort.onMessage.addListener((msg) => {
        if (msg.type === 'TRANSCRIPT_EVENT') {
          const event = msg.event;
          if (event && event.text) {
            if (transcriptBox) transcriptBox.style.display = 'flex';
            if (transcriptContent) transcriptContent.textContent = event.text;
            if (transcriptTranslation) {
              if (event.translation) {
                transcriptTranslation.textContent = `EN: ${event.translation}`;
                transcriptTranslation.classList.remove('transcript-translation-empty');
              } else {
                transcriptTranslation.classList.add('transcript-translation-empty');
              }
            }
          }
        } else if (msg.type === 'STREAMING_READY') {
          console.log('[Meetly Content] Background stream ready for session:', msg.sessionId);
          if (transcriptBox) transcriptBox.style.display = 'flex';
          if (transcriptContent) transcriptContent.textContent = 'Đang lắng nghe âm thanh cuộc họp...';
          if (transcriptTranslation) transcriptTranslation.classList.add('transcript-translation-empty');
        } else if (msg.type === 'ERROR') {
          console.warn('[Meetly Content] Stream error:', msg.message);
          showToast(msg.message, true);
        }
      });

      // Nếu có Workspace ID và Meeting ID, báo Service Worker khởi động phiên
      if (activeWorkspaceId && activeMeetingId) {
        streamPort.postMessage({
          type: 'START_STREAMING',
          workspaceId: activeWorkspaceId,
          meetingId: activeMeetingId,
          serverUrl: serverUrl,
        });
      }

      const inputSampleRate = audioCtx.sampleRate;

      const handleAudioData = (channelData) => {
        if (currentStatus !== 'RECORDING') return;
        const resampled = downsampleTo16k(channelData, inputSampleRate);
        const pcm16 = floatTo16BitPCM(resampled);

        const startSample = totalAudioSamples;
        totalAudioSamples += pcm16.length;

        if (streamPort) {
          const frameBuffer = createBinaryFrame(1, 0, streamSeq++, startSample, pcm16);
          streamPort.postMessage({
            type: 'AUDIO_FRAME',
            data: Array.from(new Uint8Array(frameBuffer)),
            sampleCount: pcm16.length,
            seq: streamSeq,
          });
        }
      };

      let workletLoaded = false;
      if (audioCtx.audioWorklet) {
        try {
          const workletUrl = chrome.runtime.getURL('content/pcm-processor.js');
          await audioCtx.audioWorklet.addModule(workletUrl);
          const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
          workletNode.port.onmessage = (e) => {
            if (e.data) {
              handleAudioData(e.data);
            }
          };
          pcmProcessorNode = workletNode;
          workletLoaded = true;
          console.log('[Meetly] Đã kích hoạt AudioWorkletNode thay thế ScriptProcessorNode thành công.');
        } catch (workletErr) {
          console.warn('[Meetly] Không thể nạp AudioWorklet, chuyển sang ScriptProcessor fallback:', workletErr);
        }
      }

      if (!workletLoaded) {
        pcmProcessorNode = audioCtx.createScriptProcessor(4096, 1, 1);
        pcmProcessorNode.onaudioprocess = (e) => {
          const channelData = e.inputBuffer.getChannelData(0);
          handleAudioData(channelData);
        };
      }

      // Mute gain để ngăn chặn tiếng vang (feedback loop) ra loa máy tính
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      mixerNode.connect(pcmProcessorNode);
      pcmProcessorNode.connect(muteGain);
      muteGain.connect(audioCtx.destination);
    } catch (streamErr) {
      console.warn('[Meetly] Lỗi khởi tạo live PCM stream:', streamErr?.message || streamErr);
    }

    // Cập nhật trạng thái
    currentStatus = 'RECORDING';
    secondsElapsed = 0;
    updateUIState();
    startTimer();

    // Đồng bộ trạng thái về Service Worker và Popup
    chrome.runtime.sendMessage({
      type: 'STATE_CHANGED',
      state: {
        status: 'RECORDING',
        meetingTitle: getMeetingCode(),
        durationSeconds: 0
      }
    });

    showToast('Đang ghi âm (2 chiều: Tab + Micro)', false);
  }

  /**
   * Tạm dừng ghi âm
   */
  function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      currentStatus = 'PAUSED';
      updateUIState();
      stopTimer();
      chrome.runtime.sendMessage({
        type: 'STATE_CHANGED',
        state: { status: 'PAUSED', durationSeconds: secondsElapsed }
      });
    }
  }

  /**
   * Tiếp tục ghi âm
   */
  function resumeRecording() {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      currentStatus = 'RECORDING';
      updateUIState();
      startTimer();
      chrome.runtime.sendMessage({
        type: 'STATE_CHANGED',
        state: { status: 'RECORDING', durationSeconds: secondsElapsed }
      });
    }
  }

  // Định dạng thời gian theo múi giờ Việt Nam (Asia/Ho_Chi_Minh - GMT+7)
  function getVietnamTimestamp(date = new Date()) {
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23'
      });
      const parts = formatter.formatToParts(date);
      const getPart = (type) => parts.find((p) => p.type === type)?.value;
      return `${getPart('year')}-${getPart('month')}-${getPart('day')}_${getPart('hour')}-${getPart('minute')}-${getPart('second')}`;
    } catch (e) {
      // Fallback cộng 7 tiếng nếu hệ thống không hỗ trợ Intl timeZone
      const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
      return vnDate.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    }
  }

  /**
   * Dừng ghi âm và tải file về máy
   */
  async function stopMeetingRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanupResources();
      return;
    }

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunks, { type: mimeType });

        const meetingCode = getMeetingCode().replace(/[^a-zA-Z0-9-_]/g, '_');
        const nowStr = getVietnamTimestamp();
        const filename = `Meetly_${meetingCode}_${nowStr}.webm`;

        // Gửi thông báo kết thúc stream tới Background Service Worker
        if (streamPort) {
          try {
            streamPort.postMessage({ type: 'STOP_STREAMING' });
            streamPort.disconnect();
          } catch (e) {}
          streamPort = null;
        }

        // Tải file trực tiếp về máy tính
        downloadBlob(blob, filename);

        // Thông báo
        showToast(`Đã lưu file: ${filename}`);

        // Dọn dẹp tài nguyên
        cleanupResources();

        // Cập nhật trạng thái
        currentStatus = 'IDLE';
        updateUIState();
        stopTimer();
        secondsElapsed = 0;

        chrome.runtime.sendMessage({
          type: 'RECORDING_SAVED',
          filename: filename,
          durationSeconds: secondsElapsed
        });

        resolve();
      };

      mediaRecorder.stop();
    });
  }

  /**
   * Tải Blob về máy người dùng
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  /**
   * Dọn dẹp các track audio và AudioContext
   */
  function cleanupResources() {
    if (streamPort) {
      try {
        streamPort.disconnect();
      } catch (e) {}
      streamPort = null;
    }
    if (pcmProcessorNode) {
      if (pcmProcessorNode.port) {
        try { pcmProcessorNode.port.onmessage = null; } catch (e) {}
      }
      try { pcmProcessorNode.disconnect(); } catch (e) {}
      pcmProcessorNode = null;
    }
    if (mixerNode) {
      try { mixerNode.disconnect(); } catch (e) {}
      mixerNode = null;
    }
    if (producerWs) {
      producerWs.close();
      producerWs = null;
    }
    if (subscriberWs) {
      subscriberWs.close();
      subscriberWs = null;
    }
    if (displayStream) {
      displayStream.getTracks().forEach((t) => t.stop());
      displayStream = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close();
      audioCtx = null;
    }
    mediaRecorder = null;
    recordedChunks = [];
  }

  function toggleMinimize(minimize) {
    isMinimized = minimize;
    const container = shadowRoot.getElementById('container');
    if (minimize) {
      container.classList.add('is-minimized');
    } else {
      container.classList.remove('is-minimized');
    }
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      secondsElapsed += 1;
      const timeStr = formatTime(secondsElapsed);
      const timerDisplay = shadowRoot.getElementById('timerDisplay');
      const miniTimer = shadowRoot.getElementById('miniTimer');
      if (timerDisplay) timerDisplay.textContent = timeStr;
      if (miniTimer) miniTimer.textContent = timeStr;

      chrome.runtime.sendMessage({
        type: 'TIMER_TICK',
        durationSeconds: secondsElapsed
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateUIState() {
    const statusDot = shadowRoot.getElementById('statusDot');
    const miniDot = shadowRoot.getElementById('miniDot');
    const statusLabel = shadowRoot.getElementById('statusLabel');
    const audioWave = shadowRoot.getElementById('audioWave');
    const idleControls = shadowRoot.getElementById('idleControls');
    const activeControls = shadowRoot.getElementById('activeControls');
    const pauseResumeLabel = shadowRoot.getElementById('pauseResumeLabel');

    statusDot.className = 'dot';
    miniDot.className = 'dot';

    if (currentStatus === 'RECORDING') {
      statusDot.classList.add('recording');
      miniDot.classList.add('recording');
      statusLabel.textContent = 'Đang ghi âm (2 chiều)';
      audioWave.classList.add('recording');
      idleControls.style.display = 'none';
      activeControls.style.display = 'flex';
      pauseResumeLabel.textContent = 'Tạm dừng';
    } else if (currentStatus === 'PAUSED') {
      statusDot.classList.add('paused');
      miniDot.classList.add('paused');
      statusLabel.textContent = 'Đã tạm dừng';
      audioWave.classList.remove('recording');
      idleControls.style.display = 'none';
      activeControls.style.display = 'flex';
      pauseResumeLabel.textContent = 'Tiếp tục';
    } else {
      // IDLE
      statusLabel.textContent = 'Sẵn sàng ghi âm';
      audioWave.classList.remove('recording');
      idleControls.style.display = 'flex';
      activeControls.style.display = 'none';
    }
  }

  function showToast(text, isError = false) {
    const toast = shadowRoot.getElementById('toastMsg');
    if (!toast) return;
    toast.textContent = text;
    toast.style.display = 'block';
    toast.style.color = isError ? '#f87171' : '#34d399';
    toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';

    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, 4500);
  }

  // Tự động kiểm tra URL và khởi tạo widget khi người dùng ở trong Google Meet
  function checkAndMount() {
    const isMeetingRoom =
      window.location.pathname.length > 5 && !window.location.pathname.includes('/landing');
    if (isMeetingRoom) {
      initWidget();
    }
  }

  // Kiểm tra ngay khi tải và theo dõi điều hướng SPA của Google Meet
  checkAndMount();
  setInterval(checkAndMount, 2000);
})();
