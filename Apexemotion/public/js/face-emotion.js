import { apiFetch } from './api.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('faceCameraBtn');
  const video = document.getElementById('faceVideo');
  const panel = document.getElementById('faceCameraPanel');
  const status = document.getElementById('faceStatus');
  const hint = document.getElementById('faceHint');
  const label = document.getElementById('faceEmotionLabel');
  const provider = document.getElementById('faceProvider');
  const bar = document.getElementById('faceConfidenceBar');
  const confidenceText = document.getElementById('faceConfidenceText');
  if (!btn || !video) return;

  const SAMPLE_MS = 1200;
  const SMOOTHING_WINDOW = 5;
  const ICONS = { joy: '😊', sadness: '😔', anger: '😠', fear: '😨', disgust: '🤢', surprise: '😲', neutral: '😐' };
  let stream = null;
  let timer = null;
  let analyzing = false;
  let history = [];
  let stopped = true;

  function setStatus(text) { status.textContent = text; }
  function stopCamera() {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
    panel.classList.add('hidden');
    btn.textContent = 'Start Camera';
    setStatus('Camera Off');
  }

  function stableResult(result) {
    history.push({ emotion: result.emotion, confidence: result.confidence ?? 0 });
    if (history.length > SMOOTHING_WINDOW) history.shift();
    const groups = {};
    for (const item of history) {
      if (!groups[item.emotion]) groups[item.emotion] = { count: 0, confidence: 0 };
      groups[item.emotion].count += 1;
      groups[item.emotion].confidence += item.confidence;
    }
    const winner = Object.entries(groups).sort((a, b) =>
      b[1].count - a[1].count || b[1].confidence - a[1].confidence
    )[0];
    if (!winner) return result;
    return {
      ...result,
      emotion: winner[0],
      confidence: winner[1].confidence / winner[1].count,
      smoothed: true
    };
  }

  function render(result) {
    const emotion = result.emotion;
    const pct = result.confidence == null ? null : Math.round(result.confidence * 100);
    label.textContent = `${ICONS[emotion] || '🙂'} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`;
    provider.textContent = `Provider: ${result.provider} • Temporal smoothing: ${SMOOTHING_WINDOW} samples`;
    confidenceText.textContent = `Confidence: ${pct == null ? '—' : pct + '%'}`;
    bar.style.width = `${Math.max(0, Math.min(100, pct ?? 0))}%`;
  }

  async function analyzeFrame() {
    if (stopped || analyzing || video.readyState < 2) return;
    analyzing = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth || 640, 640);
      canvas.height = Math.round(canvas.width * (video.videoHeight || 480) / (video.videoWidth || 640));
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
      if (!blob) throw new Error('Unable to capture camera frame.');

      const file = new File([blob], 'camera-frame.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      const result = await apiFetch('/emotion/face', { method: 'POST', body: formData });
      if (stopped) return;

      if (result.face_count === 0) {
        history = [];
        setStatus('Camera Active');
        hint.textContent = 'No face detected. Move closer, improve lighting, and face the camera.';
        label.textContent = '🙂 No face detected';
        confidenceText.textContent = 'Confidence: —';
        bar.style.width = '0%';
      } else if (result.face_count > 1) {
        history = [];
        setStatus('Camera Active');
        hint.textContent = 'Multiple faces detected. Please ensure only one face is visible.';
        label.textContent = '👥 Multiple faces';
        confidenceText.textContent = 'Confidence: —';
        bar.style.width = '0%';
      } else {
        setStatus('Face detected');
        hint.textContent = 'Analyzing facial expression...';
        const stable = stableResult(result);
        render(stable);
      }
    } catch (err) {
      if (!stopped) {
        hint.textContent = err.message || 'Facial emotion service is temporarily unavailable.';
        setStatus('Camera Active');
        if (String(err.message || '').toLowerCase().includes('session')) {
          showToast(err.message, 'error');
        }
      }
    } finally {
      analyzing = false;
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('This browser does not support camera access.', 'error');
      return;
    }
    try {
      setStatus('Requesting camera permission...');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      stopped = false;
      panel.classList.remove('hidden');
      btn.textContent = 'Stop Camera';
      setStatus('Camera Active');
      hint.textContent = 'Detecting face...';
      history = [];
      await analyzeFrame();
      timer = setInterval(analyzeFrame, SAMPLE_MS);
    } catch (err) {
      stopCamera();
      setStatus('Camera permission denied or unavailable.');
      hint.textContent = 'Please allow camera access and try again.';
      showToast('Unable to access the camera. Please check browser permissions.', 'error');
    }
  }

  btn.addEventListener('click', () => {
    if (stopped) startCamera();
    else stopCamera();
  });

  window.addEventListener('beforeunload', stopCamera);
});
