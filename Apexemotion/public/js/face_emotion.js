
import { apiFetch } from './api.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('faceCameraBtn');
  const video = document.getElementById('faceCamera');
  const canvas = document.getElementById('faceCaptureCanvas');
  const status = document.getElementById('faceStatus');
  const emotion = document.getElementById('faceEmotion');
  const confidence = document.getElementById('faceConfidence');
  const progress = document.getElementById('faceConfidenceBar');
  const provider = document.getElementById('faceProvider');
  const logs = document.getElementById('faceLogs');

  if (!startBtn || !video || !canvas) return;

  const INTERVAL_MS = 5000;
  const WINDOW_SIZE = 3;
  let stream = null;
  let timerId = null;
  let requestInFlight = false;
  let history = [];

  function log(message) {
    if (!logs) return;
    const row = document.createElement('div');
    row.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logs.appendChild(row);
  }

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function stopCamera() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    startBtn.textContent = 'Start Camera';
    setStatus('Camera Off');
    history = [];
    log('Camera stopped');
  }

  function smoothResult(result) {
    if (!result?.emotion || !Number.isFinite(Number(result.confidence))) return null;
    history.push({ emotion: result.emotion, confidence: Number(result.confidence), scores: result.scores || {} });
    if (history.length > WINDOW_SIZE) history.shift();

    const totals = {};
    for (const item of history) {
      for (const [label, score] of Object.entries(item.scores || {})) {
        totals[label] = (totals[label] || 0) + Number(score || 0);
      }
    }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return result;
    const stableEmotion = entries[0][0];
    const matching = history.filter(item => item.emotion === stableEmotion);
    if (matching.length < Math.ceil(WINDOW_SIZE / 2) && history.length >= WINDOW_SIZE) {
      return null;
    }
    const avgConfidence = matching.length
      ? matching.reduce((sum, item) => sum + item.confidence, 0) / matching.length
      : result.confidence;
    return { emotion: stableEmotion, confidence: avgConfidence };
  }

  function renderResult(result) {
    const icons = { joy: '😊', sadness: '😔', anger: '😠', fear: '😨', disgust: '🤢', surprise: '😲', neutral: '😐' };
    const pretty = result.emotion.charAt(0).toUpperCase() + result.emotion.slice(1);
    const pct = Math.round(Math.max(0, Math.min(1, result.confidence)) * 100);
    emotion.textContent = `${icons[result.emotion] || '🙂'} ${pretty}`;
    confidence.textContent = `${pct}% confidence`;
    progress.style.width = `${pct}%`;
    provider.textContent = 'Provider: Pixicular';
  }

  async function analyzeFrame() {
    if (!stream || requestInFlight || video.readyState < 2 || video.videoWidth === 0) return;
    requestInFlight = true;
    try {
      const maxWidth = 640;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
      if (!blob) throw new Error('Could not capture camera frame.');

      const file = new File([blob], 'face-frame.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      setStatus('Analyzing face...');
      const result = await apiFetch('/emotion/face', {
        method: 'POST',
        headers: {},
        body: formData,
      });

      if (result.multiple_faces || Number(result.face_count) > 1) {
        history = [];
        setStatus('Multiple faces detected. Please ensure only one face is visible.');
        log(`Multiple faces detected: ${result.face_count}`);
        return;
      }

      if (!result.face_count) {
        history = [];
        setStatus('No face detected. Move closer and improve lighting.');
        log('No face detected');
        return;
      }

      const stable = smoothResult(result);
      if (stable) {
        renderResult(stable);
        setStatus('Face detected');
        log(`Stable facial emotion: ${stable.emotion} (${Math.round(stable.confidence * 100)}%)`);
      } else {
        setStatus('Face detected — stabilizing result...');
      }
    } catch (err) {
      setStatus('Facial emotion service temporarily unavailable.');
      showToast(err.message || 'Unable to analyze the face.', 'error');
      log(`Face analysis error: ${err.message}`);
    } finally {
      requestInFlight = false;
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Camera is not supported by this browser.');
      showToast('Camera access is not supported by this browser.', 'error');
      return;
    }
    try {
      setStatus('Requesting camera permission...');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      startBtn.textContent = 'Stop Camera';
      setStatus('Camera Active — detecting face...');
      history = [];
      log('Camera started');
      await analyzeFrame();
      timerId = setInterval(analyzeFrame, INTERVAL_MS);
    } catch (err) {
      stopCamera();
      setStatus('Camera permission was denied or the camera is unavailable.');
      showToast('Please allow camera access and try again.', 'error');
      log(`Camera error: ${err.message}`);
    }
  }

  startBtn.addEventListener('click', () => {
    if (stream) stopCamera();
    else startCamera();
  });

  window.addEventListener('beforeunload', stopCamera);
});
