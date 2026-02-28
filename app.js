let mediaRecorder;
let recordedChunks = [];
let stream;
let wakeLock = null;
let segmentInterval = null;
let segmentNumber = 0;
let isRecording = false;

const preview = document.getElementById('preview');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');

const SEGMENT_DURATION = 5 * 60 * 1000; // 5 минут

// ====== Wake Lock ======
async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      if (isRecording) requestWakeLock().catch(err => console.error(err));
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
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

// ====== Сохранить текущий кусок ======
function saveSegment(chunks, number, mimeType) {
  if (chunks.length === 0) return;
  const isMP4 = mimeType.includes('mp4');
  const ext = isMP4 ? 'mp4' : 'webm';
  const blob = new Blob(chunks, { type: isMP4 ? 'video/mp4' : 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  a.download = `registrar_${date}_part${number}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ====== Старт нового сегмента ======
function startNewSegment(mimeType) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }

  recordedChunks = [];
  const options = mimeType ? { mimeType } : {};
  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    segmentNumber++;
    saveSegment([...recordedChunks], segmentNumber, mimeType);
    recordedChunks = [];
  };

  mediaRecorder.start(1000);
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

    isRecording = true;
    segmentNumber = 0;
    const mimeType = getBestMimeType();

    // Запускаем первый сегмент
    startNewSegment(mimeType);

    // Каждые 5 минут — новый сегмент
    segmentInterval = setInterval(() => {
      startNewSegment(mimeType);
      status.textContent = `Запись... отрезок ${segmentNumber + 1} (каждые 5 мин автосохранение)`;
    }, SEGMENT_DURATION);

    status.textContent = 'Запись... автосохранение каждые 5 мин';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    saveBtn.disabled = true;
  } catch (err) {
    console.error(err);
    status.textContent = 'Ошибка доступа к камере или микрофону.';
  }
});

stopBtn.addEventListener('click', () => {
  isRecording = false;
  clearInterval(segmentInterval);
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop(); // onstop сам сохранит последний кусок
  }
  stream.getTracks().forEach(track => track.stop());
  stopBtn.disabled = true;
  startBtn.disabled = false;
  releaseWakeLock();
  status.textContent = 'Запись остановлена. Последний отрезок сохранён.';
});

clearBtn.addEventListener('click', () => {
  status.textContent = 'Очищено.';
});

// Кнопку "Сохранить" скрываем — теперь всё автоматически
saveBtn.style.display = 'none';

// ====== Service Worker ======
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker зарегистрирован'))
    .catch(err => console.error(err));
}
