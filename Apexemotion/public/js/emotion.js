import { apiFetch } from './api.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const micBtn = document.getElementById('emotionMicBtn');
  const label = document.getElementById('liveEmotionLabel');
  const logs = document.getElementById('emotionLogs');
  const timer = document.getElementById('emotionTimer');
  const progress = document.getElementById('emotionConfidence');
  const resultCard = document.getElementById('voiceEmotionResult');
  const resultProvider = document.getElementById('voiceEmotionProvider');

  if (!micBtn) return;

  const MAX_SECONDS = 10;
  const MIN_SECONDS = 1;
  let mediaRecorder = null;
  let mediaStream = null;
  let chunks = [];
  let startedAt = 0;
  let timerId = null;

  function log(line) {
    if (!logs) return;
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${line}`;
    logs.appendChild(div);
  }

  function setState(text) {
    if (label) label.textContent = text;
  }

  function cleanupMic() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    if (timer) timer.textContent = `${String(elapsed).padStart(2, '0')} / ${String(MAX_SECONDS).padStart(2, '0')} sec`;
    if (elapsed >= MAX_SECONDS && mediaRecorder?.state === 'recording') mediaRecorder.stop();
  }

  function pickMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showToast('This browser does not support microphone recording.', 'error');
      return;
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const mimeType = pickMimeType();
      mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
      chunks = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      mediaRecorder.onerror = () => { cleanupMic(); setState('Unable to record audio.'); showToast('Recording failed.', 'error'); };
      mediaRecorder.onstop = finishRecording;
      startedAt = Date.now();
      mediaRecorder.start();
      micBtn.textContent = 'Stop Recording';
      micBtn.disabled = false;
      setState('🔴 Recording...');
      if (resultCard) resultCard.classList.add('hidden');
      timerId = setInterval(updateTimer, 250);
      updateTimer();
      log('Microphone recording started');
    } catch (err) {
      cleanupMic();
      setState('Microphone permission denied.');
      showToast('Please allow microphone access and try again.', 'error');
      log(`Microphone error: ${err.message}`);
    }
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    const elapsed = (Date.now() - startedAt) / 1000;
    if (elapsed < MIN_SECONDS) {
      showToast('Please record at least 1 second.', 'error');
      return;
    }
    mediaRecorder.stop();
    setState('Analyzing voice...');
    micBtn.disabled = true;
  }

  async function finishRecording() {
    const elapsed = (Date.now() - startedAt) / 1000;
    cleanupMic();
    micBtn.disabled = true;
    const blobType = mediaRecorder?.mimeType || chunks[0]?.type || 'audio/webm';
    const blob = new Blob(chunks, { type: blobType });
    chunks = [];
    if (!blob.size) {
      micBtn.disabled = false;
      setState('No audio recorded.');
      showToast('No audio recorded.', 'error');
      return;
    }
    if (elapsed < MIN_SECONDS) {
      micBtn.disabled = false;
      setState('Recording was too short.');
      showToast('Please record at least 1 second.', 'error');
      return;
    }
    try {
      const extension = blobType.includes('ogg') ? 'ogg' : blobType.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([blob], `voice-emotion.${extension}`, { type: blobType });
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiFetch('/emotion/voice', {
        method: 'POST',
        headers: {},
        body: formData,
      });
      renderResult(result);
      log(`Voice emotion: ${result.emotion} (${Math.round(Number(result.confidence) * 100)}%) via ${result.provider}`);
    } catch (err) {
      setState('Unable to analyze this recording.');
      showToast(err.message || 'Voice emotion service is unavailable.', 'error');
      log(`Voice analysis error: ${err.message}`);
    } finally {
      micBtn.disabled = false;
      micBtn.textContent = 'Start Recording';
    }
  }

  function renderResult(result) {
    const icons = { joy: '😊', sadness: '😔', anger: '😠', fear: '😨', disgust: '🤢', surprise: '😲', neutral: '😐' };
    const emotion = String(result.emotion || 'neutral');
    const confidence = Number(result.confidence);
    const pct = Number.isFinite(confidence) ? Math.round(confidence * 100) : null;
    const pretty = emotion.charAt(0).toUpperCase() + emotion.slice(1);
    setState(`${icons[emotion] || '🎙'} ${pretty}${pct !== null ? ` — ${pct}%` : ''}`);
    if (progress) progress.style.width = `${Math.max(0, Math.min(100, pct ?? 0))}%`;
    if (resultProvider) resultProvider.textContent = `Provider: ${result.provider}${result.fallback_used ? ' (fallback)' : ''}`;
    if (resultCard) resultCard.classList.remove('hidden');
  }

  micBtn.addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') stopRecording();
    else startRecording();
  });
});
