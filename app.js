let mediaRecorder;
let recordedChunks = [];
let stream;
let wakeLock = null; // для блокировки сна экрана

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
    console.log('Wake Lock активирован');

    // если потерялся (например, свернули экран), пробуем заново включить
    wakeLock.addEventListener('release', () => {
      console.log('Wake Lock освобождён, пробуем снова...');
      requestWakeLock().catch(err => console.error('Ошибка при повторном включении Wake Lock:', err));
    });
  } catch (err) {
    console.error('Ошибка активации Wake Lock:', err);
  }
}

async function releaseWakeLock() {
  if (wakeLock !== null) {
    await wakeLock.release();
    wakeLock = null;
    console.log('Wake Lock выключен');
  }
}
// =========================

startBtn.addEventListener('click', async () => {
  try {
    await requestWakeLock(); // не даём экрану тухнуть

    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment" }, 
      audio: true 
    });
    preview.srcObject = stream;

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      saveBtn.disabled = false;
      releaseWakeLock(); // отпускаем блокировку экрана
    };

    mediaRecorder.start();
    status.textContent = 'Идёт запись...';
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
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `video_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
  a.click();
  URL.revokeObjectURL(url);
  status.textContent = 'Видео сохранено.';
  saveBtn.disabled = true;
});

clearBtn.addEventListener('click', () => {
  // пока просто очищаем сообщение
  status.textContent = 'Очистка выполнена.';
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker зарегистрирован'));
}
