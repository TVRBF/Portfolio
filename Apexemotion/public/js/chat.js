import { apiFetch } from './api.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('sendBtn');
  const input = document.getElementById('messageInput');
  const box = document.getElementById('chatBox');
  const emotionToggle = document.getElementById('emotionToggle');
  const emotionLabel = document.getElementById('emotionLabel');

  const EMOTION_META = {
    anger: { icon: '😠', name: 'Anger' },
    disgust: { icon: '🤢', name: 'Disgust' },
    fear: { icon: '😨', name: 'Fear' },
    joy: { icon: '😊', name: 'Joy' },
    neutral: { icon: '😐', name: 'Neutral' },
    sadness: { icon: '😔', name: 'Sadness' },
    surprise: { icon: '😲', name: 'Surprise' },
  };

  function addMessage(role, text, emotionData = null) {
    const wrap = document.createElement('div');
    wrap.className =
      'max-w-xl px-4 py-3 rounded ' +
      (role === 'user'
        ? 'bg-teal-600/30 border border-teal-500/40 ml-auto'
        : 'bg-slate-700 border border-slate-600');

    const textNode = document.createElement('div');
    textNode.textContent = text;
    wrap.appendChild(textNode);

    if (role === 'user' && emotionData?.emotion) {
      const meta = EMOTION_META[emotionData.emotion] || {
        icon: '•',
        name: emotionData.emotion,
      };
      const confidence = Number(emotionData.confidence);

      const indicator = document.createElement('div');
      indicator.className = 'mt-2 text-xs text-slate-300 border-t border-slate-600/60 pt-2';
      indicator.textContent =
        Number.isFinite(confidence)
          ? `${meta.icon} Detected emotion: ${meta.name} — ${Math.round(confidence * 100)}%`
          : `${meta.icon} Detected emotion: ${meta.name}`;

      if (Number.isFinite(confidence) && confidence < 0.5) {
        indicator.textContent =
          Number.isFinite(confidence)
            ? `${meta.icon} Possible emotion: ${meta.name} — ${Math.round(confidence * 100)}%`
            : `${meta.icon} Possible emotion: ${meta.name}`;
      }

      wrap.appendChild(indicator);
    }

    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  }

  async function detectTextEmotion(text) {
    return apiFetch('/emotion/text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  function updateCurrentEmotion(emotionData) {
    if (!emotionLabel) return;

    if (!emotionData?.emotion) {
      emotionLabel.textContent = 'Emotion: unavailable';
      return;
    }

    const meta = EMOTION_META[emotionData.emotion] || {
      icon: '•',
      name: emotionData.emotion,
    };
    const confidence = Number(emotionData.confidence);

    emotionLabel.textContent =
      Number.isFinite(confidence)
        ? `${meta.icon} ${meta.name} — ${Math.round(confidence * 100)}%`
        : `${meta.icon} ${meta.name}`;
  }

  async function loadHistory() {
    try {
      const data = await apiFetch('/chat/history', { method: 'GET' });
      (data.history || []).forEach((h) => {
        addMessage('user', h.message, {
          emotion: h.emotion,
          confidence: h.confidence,
        });
        addMessage('assistant', h.reply);
      });
    } catch (err) {
      console.warn('No history or not logged in yet.', err.message);
    }
  }

  async function sendToBackendChat(text) {
    return apiFetch('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });
  }

  if (box) loadHistory();

  if (sendBtn && input && box) {
    sendBtn.addEventListener('click', async () => {
      const msg = input.value.trim();
      if (!msg) return;

      input.value = '';
      sendBtn.disabled = true;

      try {
        const result = await sendToBackendChat(msg);

        const emotionData = result.emotion
          ? { emotion: result.emotion, confidence: result.confidence }
          : null;

        addMessage('user', msg, emotionData);
        addMessage('assistant', result.reply || 'No reply');

        if (emotionToggle?.checked) {
          updateCurrentEmotion(emotionData);
        }

        speak(result.reply || '');
      } catch (err) {
        showToast(err.message || 'Chat error', 'error');
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    });
  }
});
