import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const sttBtn = document.getElementById('sttBtn');
  const input = document.getElementById('messageInput');

  if (!sttBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // default language
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) input.value = transcript;
      showToast('Transcribed', 'success');
    };

    recognition.onerror = (event) => {
      showToast('Mic error: ' + event.error, 'error');
    };
  }

  sttBtn.addEventListener('click', () => {
    if (!recognition) {
      showToast('SpeechRecognition not supported in this browser', 'error');
      return;
    }
    recognition.start();
    showToast('Listening...', 'info');
  });
});
