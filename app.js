let mediaRecorder;
let recordedChunks = [];
let stream;
let wakeLock = null;

const preview = document.getElementById('preview');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');

// ====== Wake Lock ======
async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      requestWakeLock().catch(err => console.error(err));
    });
  } catch (err) {
    console.error(err);
  }
}

async function releaseWakeLock() {
  if (wakeLock !== null) {
    await wakeLock.release();
    wakeLock = null;
  }
}

// ====== Выбор формата ======
function getBestMimeType() {
  const types = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4;codecs="avc1.42E01E"',
    'video/mp4',
    'video/webm;codecs="avc1.42E01E"',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

// ====== Кнопки ======
startBtn.addEventListener('click', async () => {
  try {
    await requestWakeLock();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: true
    });
    preview.srcObject = stream;

    recordedChunks = [];
    const mimeType = getBestMimeType();
    console.log('Используем формат:', mimeType);

    const options = mimeType ? { mimeType } : {};
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      saveBtn.disabled = false;
      releaseWakeLock();
    };

    mediaRecorder.start(1000);
    status.textContent = 'Идёт запись... Формат: ' + (mimeType || 'по умолчанию');
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (err) {
    console.error(err);
    status.textContent = 'Ошибка доступа к камере или микрофону.';
  }
});

stopBtn.addEventListener('click', () => {
  mediaRecorder.stop();
  stream.getTracks().forEach(track => track.stop());
  stopBtn.disabled = true;
  startBtn.disabled = false;
  status.textContent = 'Запись остановлена.';
});

saveBtn.addEventListener('click', () => {
  const mimeType = mediaRecorder.mimeType;
  const isMP4 = mimeType.includes('mp4');
  const ext = isMP4 ? 'mp4' : 'webm';
  const blobType = isMP4 ? 'video/mp4' : 'video/webm';

  const blob = new Blob(recordedChunks, { type: blobType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `video_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  status.textContent = `Видео сохранено (${ext.toUpperCase()}).`;
  saveBtn.disabled = true;
});

clearBtn.addEventListener('click', () => {
  recordedChunks = [];
  status.textContent = 'Очищено.';
});

// ====== Service Worker ======
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker зарегистрирован'))
    .catch(err => console.error(err));
}
