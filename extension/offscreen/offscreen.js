/**
 * Meetly - Offscreen Audio Engine
 * Phụ trách:
 * 1. Bắt luồng âm thanh từ Google Meet Tab (thông qua tabCapture streamId)
 * 2. Bắt luồng âm thanh từ Micro của người dùng (thông qua getUserMedia)
 * 3. Định tuyến âm thanh tab ra loa máy tính (để người dùng vẫn nghe thấy bạn bè trong cuộc họp)
 * 4. Trộn (Mix) 2 luồng âm thanh bằng Web Audio API thành 1 luồng duy nhất
 * 5. Ghi âm bằng MediaRecorder và đóng gói dữ liệu Blob xuất file .webm
 */

let mediaRecorder = null;
let recordedChunks = [];
let audioCtx = null;
let tabStream = null;
let micStream = null;
let mixedDestination = null;
let currentMeetingTitle = 'google-meet';

// Lắng nghe các chỉ thị từ Background Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  switch (message.type) {
    case 'START_RECORDING':
      startRecording(message)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Meetly Offscreen] Lỗi khởi động ghi âm:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // async response

    case 'PAUSE_RECORDING':
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'PAUSED' });
        sendResponse({ success: true });
      }
      break;

    case 'RESUME_RECORDING':
      if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'RECORDING' });
        sendResponse({ success: true });
      }
      break;

    case 'STOP_RECORDING':
      stopRecording()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

/**
 * Bắt đầu quá trình thu âm kép và trộn âm
 */
async function startRecording({ streamId, meetingTitle, recordMic = true }) {
  currentMeetingTitle = meetingTitle || 'meetly-meeting';
  recordedChunks = [];

  try {
    // 1. Lấy luồng âm thanh từ Tab Google Meet
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });

    // 2. Lấy luồng âm thanh từ Microphone nếu được kích hoạt
    micStream = null;
    if (recordMic) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
      } catch (micErr) {
        console.warn('[Meetly Offscreen] Không thể truy cập Micro, chỉ ghi âm thanh Tab:', micErr);
      }
    }

    // 3. Khởi tạo Web Audio API để gộp các luồng
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();

    mixedDestination = audioCtx.createMediaStreamDestination();

    // QUAN TRỌNG: Khi tabCapture bắt âm thanh, Chrome mặc định làm câm (mute) tab đó.
    // Chúng ta phải nối âm thanh tab ra audioCtx.destination để người dùng vẫn nghe thấy tiếng loa bình thường!
    const tabSource = audioCtx.createMediaStreamSource(tabStream);
    tabSource.connect(audioCtx.destination);

    // Đưa âm thanh tab vào luồng ghi âm chung
    tabSource.connect(mixedDestination);

    // Đưa âm thanh micro vào luồng ghi âm chung (LƯU Ý: KHÔNG nối mic ra audioCtx.destination để tránh vang/echo!)
    if (micStream && micStream.getAudioTracks().length > 0) {
      const micSource = audioCtx.createMediaStreamSource(micStream);
      const micGain = audioCtx.createGain();
      micGain.gain.value = 1.0; // Tùy chỉnh âm lượng micro
      micSource.connect(micGain);
      micGain.connect(mixedDestination);
    }

    // 4. Khởi tạo MediaRecorder
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
    }

    mediaRecorder = new MediaRecorder(mixedDestination.stream, {
      mimeType: mimeType,
      audioBitsPerSecond: 128000
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('[Meetly Offscreen] Đã dừng ghi âm, tổng chunks:', recordedChunks.length);
      const blob = new Blob(recordedChunks, { type: mimeType });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        chrome.runtime.sendMessage({
          type: 'RECORDING_COMPLETE',
          dataUrl: dataUrl,
          blobSize: blob.size,
          mimeType: mimeType,
          meetingTitle: currentMeetingTitle,
          timestamp: Date.now()
        });
        cleanup();
      };
      reader.readAsDataURL(blob);
    };

    // Tự động dừng nếu người dùng đóng tab Google Meet
    tabStream.getAudioTracks()[0].onended = () => {
      console.log('[Meetly Offscreen] Tab stream kết thúc (tab đóng hoặc người dùng rời phòng)');
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };

    // Bắt đầu ghi với chu kỳ thu thập mỗi 1000ms
    mediaRecorder.start(1000);
    console.log('[Meetly Offscreen] Ghi âm thành công với mimeType:', mimeType);

    chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'RECORDING' });

  } catch (error) {
    cleanup();
    throw error;
  }
}

/**
 * Dừng quá trình ghi âm
 */
async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else {
    cleanup();
  }
}

/**
 * Dọn dẹp tài nguyên để tránh rò rỉ bộ nhớ
 */
function cleanup() {
  if (tabStream) {
    tabStream.getTracks().forEach((track) => track.stop());
    tabStream = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  if (audioCtx && audioCtx.state !== 'closed') {
    audioCtx.close();
    audioCtx = null;
  }
  mediaRecorder = null;
  recordedChunks = [];
}
