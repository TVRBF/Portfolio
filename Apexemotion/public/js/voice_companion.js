import { apiFetch } from './api.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const stateLabel = document.getElementById('stateLabel');
  const stateHint = document.getElementById('stateHint');
  const stateIcon = document.getElementById('stateIcon');
  const transcriptEl = document.getElementById('transcript');
  const responseEl = document.getElementById('response');
  const errorBox = document.getElementById('errorBox');
  const compatibilityNotice = document.getElementById('compatibilityNotice');

  const STATES = Object.freeze({
    IDLE: 'IDLE',
    STARTING: 'STARTING',
    LISTENING: 'LISTENING',
    PROCESSING: 'PROCESSING',
    SPEAKING: 'SPEAKING',
    ERROR: 'ERROR',
    STOPPING: 'STOPPING',
    STOPPED: 'STOPPED',
  });

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  let state = STATES.IDLE;
  let recognition = null;
  let recognitionActive = false;
  let restartTimer = null;
  let sessionActive = false;
  let turnInFlight = false;
  let turnAbortController = null;
  let sessionGeneration = 0;
  let lastFinalTranscript = '';
  let lastFinalAt = 0;
  let ttsWatchdog = null;

  const UI = {
    [STATES.IDLE]: {
      icon: '🎙',
      label: 'Voice companion is off.',
      hint: 'Start once and talk naturally. Listening resumes after each response.',
    },
    [STATES.STARTING]: {
      icon: '⏳',
      label: 'Starting voice companion...',
      hint: 'Requesting microphone access and preparing speech recognition.',
    },
    [STATES.LISTENING]: {
      icon: '🎙',
      label: 'LISTENING...',
      hint: "I'm listening.",
    },
    [STATES.PROCESSING]: {
      icon: '⏳',
      label: 'THINKING...',
      hint: 'Processing your message...',
    },
    [STATES.SPEAKING]: {
      icon: '🔊',
      label: 'SPEAKING...',
      hint: 'ApexEmotion is speaking. Listening is paused to prevent self-listening.',
    },
    [STATES.ERROR]: {
      icon: '⚠️',
      label: 'Something went wrong.',
      hint: 'Check the message below and try again.',
    },
    [STATES.STOPPING]: {
      icon: '⏹️',
      label: 'Stopping...',
      hint: 'Closing the voice session.',
    },
    [STATES.STOPPED]: {
      icon: '⏹️',
      label: 'Voice companion stopped.',
      hint: 'Press Start Voice Companion to begin again.',
    },
  };

  function setState(nextState) {
    state = nextState;
    const meta = UI[nextState] || UI[STATES.IDLE];
    stateIcon.textContent = meta.icon;
    stateLabel.textContent = meta.label;
    stateHint.textContent = meta.hint;

    const active = sessionActive;
    startBtn.disabled =
      active || nextState === STATES.STARTING || nextState === STATES.PROCESSING ||
      nextState === STATES.SPEAKING || nextState === STATES.LISTENING;
    stopBtn.disabled = !active;
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function isAbortError(error) {
    return error?.name === 'AbortError' || /aborted/i.test(error?.message || '');
  }

  function clearRestartTimer() {
    if (restartTimer !== null) {
      window.clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function clearTTSWatchdog() {
    if (ttsWatchdog !== null) {
      window.clearInterval(ttsWatchdog);
      ttsWatchdog = null;
    }
  }

  function cancelTTS() {
    clearTTSWatchdog();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function createRecognition() {
    if (!SpeechRecognition) return null;

    const instance = new SpeechRecognition();
    instance.lang = 'en-US';
    instance.interimResults = true;
    instance.continuous = false;
    instance.maxAlternatives = 1;

    let finalParts = [];
    let handledFinal = false;

    instance.onstart = () => {
      // SpeechRecognition instances are reused by Chrome, so reset per-turn
      // transcript state every time a new listening cycle starts. Without this,
      // the first final result sets handledFinal=true and later turns are ignored.
      finalParts = [];
      handledFinal = false;
      recognitionActive = true;
      if (sessionActive && state !== STATES.PROCESSING && state !== STATES.SPEAKING) {
        setState(STATES.LISTENING);
      }
    };

    instance.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalParts.push(text);
        } else {
          interim += text;
        }
      }

      finalText = finalParts.join(' ').replace(/\s+/g, ' ').trim();

      if (finalText) {
        transcriptEl.textContent = finalText;
      } else if (interim.trim()) {
        transcriptEl.textContent = interim.trim();
      }

      if (finalText && !handledFinal && sessionActive && !turnInFlight) {
        handledFinal = true;
        // Prevent duplicate final events for the same utterance while allowing
        // legitimate identical statements in later turns.
        const now = Date.now();
        if (finalText === lastFinalTranscript && now - lastFinalAt < 1500) {
          return;
        }
        lastFinalTranscript = finalText;
        lastFinalAt = now;

        turnInFlight = true;
        recognitionActive = false;
        try {
          instance.stop();
        } catch (_) {
          // Browser may already have ended recognition.
        }
        processUserTurn(finalText);
      }
    };

    instance.onerror = (event) => {
      recognitionActive = false;

      if (!sessionActive) return;

      const code = event.error || 'unknown';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        turnInFlight = false;
        setState(STATES.ERROR);
        showError(
          'Microphone permission is required for voice conversation. ' +
          'Allow microphone access in the browser and press Start again.'
        );
        return;
      }

      if (code === 'audio-capture') {
        turnInFlight = false;
        setState(STATES.ERROR);
        showError('No usable microphone was found. Check your microphone and try again.');
        return;
      }

      if (code === 'network') {
        // Network errors can be transient; restart through the controlled path.
        if (!turnInFlight) scheduleListeningRestart(700);
        return;
      }

      if (code === 'aborted') {
        if (sessionActive && !turnInFlight && state === STATES.LISTENING) {
          scheduleListeningRestart(500);
        }
        return;
      }

      if (!turnInFlight) scheduleListeningRestart(700);
    };

    instance.onend = () => {
      recognitionActive = false;
      if (!sessionActive) return;

      // A finalized utterance is already being processed; do not restart here.
      if (turnInFlight || state === STATES.PROCESSING || state === STATES.SPEAKING) return;

      // Silence/no-speech and normal browser recognition termination return here.
      if (state === STATES.LISTENING || state === STATES.STARTING) {
        scheduleListeningRestart(650);
      }
    };

    return instance;
  }

  function scheduleListeningRestart(delay = 650) {
    if (!sessionActive || turnInFlight || state === STATES.PROCESSING || state === STATES.SPEAKING) {
      return;
    }
    clearRestartTimer();

    restartTimer = window.setTimeout(() => {
      restartTimer = null;
      if (sessionActive && !turnInFlight) {
        startListening();
      }
    }, delay);
  }

  function startListening() {
    if (!sessionActive || turnInFlight || state === STATES.PROCESSING || state === STATES.SPEAKING) {
      return;
    }

    if (!recognition) {
      recognition = createRecognition();
    }
    if (!recognition || recognitionActive) return;

    setState(STATES.LISTENING);
    try {
      recognition.start();
    } catch (error) {
      // InvalidStateError means a previous browser recognition instance is still
      // winding down. Retry through the same controlled restart path.
      if (error?.name === 'InvalidStateError') {
        recognitionActive = false;
        scheduleListeningRestart(700);
        return;
      }
      setState(STATES.ERROR);
      showError('Unable to start speech recognition. Please try again.');
    }
  }

  async function processUserTurn(text) {
    if (!sessionActive || !text.trim()) {
      turnInFlight = false;
      if (sessionActive) scheduleListeningRestart(300);
      return;
    }

    setState(STATES.PROCESSING);
    clearError();

    const generationAtTurnStart = sessionGeneration;
    turnAbortController = new AbortController();

    try {
      const result = await apiFetch('/chat/send', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
        signal: turnAbortController.signal,
      });

      if (!sessionActive || generationAtTurnStart !== sessionGeneration) return;

      const reply = String(result?.reply || '').trim();
      responseEl.textContent = reply || 'No response was generated.';

      if (!reply) {
        turnInFlight = false;
        scheduleListeningRestart(350);
        return;
      }

      await speakResponse(reply, generationAtTurnStart);
    } catch (error) {
      if (isAbortError(error) && !sessionActive) return;

      if (!sessionActive || generationAtTurnStart !== sessionGeneration) return;

      console.error('Voice companion chat error:', error);
      showError(error?.message || "I couldn't process that right now. Please try again.");
      setState(STATES.ERROR);
      turnInFlight = false;

      // Recover to listening for transient backend/Gemini failures.
      scheduleListeningRestart(1200);
    } finally {
      turnAbortController = null;
    }
  }

  function speakResponse(text, generationAtTurnStart) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      clearTTSWatchdog();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;

      let settled = false;
      let started = false;
      let fallbackTimer = null;
      let pollTimer = null;

      // Chrome/Edge can occasionally fail to dispatch onend. Use a generous
      // text-length-based upper bound so the companion can never remain stuck
      // in SPEAKING forever. Normally onend finishes the turn earlier.
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const estimatedMs = Math.min(90000, Math.max(6000, wordCount * 550 + 3000));

      const cleanup = () => {
        if (fallbackTimer !== null) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        if (pollTimer !== null) {
          window.clearInterval(pollTimer);
          pollTimer = null;
        }
        clearTTSWatchdog();
      };

      const finish = (failed = false) => {
        if (settled) return;
        settled = true;
        cleanup();

        if (!sessionActive || generationAtTurnStart !== sessionGeneration) {
          resolve();
          return;
        }

        if (failed) {
          showError('TTS completion was not reported by the browser. Listening will resume.');
        }

        // Single controlled transition from SPEAKING back to LISTENING.
        turnInFlight = false;
        resolve();
        if (sessionActive) {
          scheduleListeningRestart(failed ? 900 : 400);
        }
      };

      utterance.onstart = () => {
        started = true;
        if (sessionActive && generationAtTurnStart === sessionGeneration) {
          setState(STATES.SPEAKING);
        }
      };

      utterance.onend = () => finish(false);

      utterance.onerror = (event) => {
        if (event?.error === 'canceled' && !sessionActive) {
          finish(false);
          return;
        }
        console.warn('Speech synthesis error:', event?.error || 'unknown');
        finish(true);
      };

      try {
        window.speechSynthesis.speak(utterance);

        // Secondary completion detector. This handles browsers that lose onend.
        pollTimer = window.setInterval(() => {
          if (settled) return;
          if (!sessionActive || generationAtTurnStart !== sessionGeneration) {
            finish(false);
            return;
          }
          if (started && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            finish(false);
          }
        }, 250);

        // Hard recovery for a browser synthesis instance that remains stuck.
        fallbackTimer = window.setTimeout(() => {
          if (settled) return;
          console.warn('Speech synthesis completion timeout; recovering continuous voice loop.');
          try { window.speechSynthesis.cancel(); } catch (_) {}
          finish(true);
        }, estimatedMs);
      } catch (error) {
        console.error('TTS start error:', error);
        finish(true);
      }
    });
  }

  async function startSession() {
    if (sessionActive) return;

    clearError();

    if (!SpeechRecognition) {
      compatibilityNotice.textContent =
        'This browser does not provide SpeechRecognition. Use a supported Chromium-based browser such as Google Chrome or Microsoft Edge for the voice companion.';
      compatibilityNotice.classList.remove('hidden');
      setState(STATES.ERROR);
      showError('Speech recognition is not supported in this browser.');
      return;
    }

    if (!('speechSynthesis' in window)) {
      setState(STATES.ERROR);
      showError('Text-to-speech is not supported in this browser.');
      return;
    }

    compatibilityNotice.classList.add('hidden');
    sessionActive = true;
    turnInFlight = false;
    sessionGeneration += 1;
    lastFinalTranscript = '';
    lastFinalAt = 0;
    clearRestartTimer();
    cancelTTS();

    recognition = createRecognition();
    setState(STATES.STARTING);

    try {
      // Browser permission is requested when recognition starts.
      startListening();
    } catch (error) {
      sessionActive = false;
      setState(STATES.ERROR);
      showError('Unable to initialize the microphone.');
    }
  }

  function stopSession() {
    if (!sessionActive && state !== STATES.SPEAKING && state !== STATES.LISTENING) {
      setState(STATES.STOPPED);
      return;
    }

    setState(STATES.STOPPING);
    sessionActive = false;
    sessionGeneration += 1;
    turnInFlight = false;
    clearRestartTimer();

    if (turnAbortController) {
      try {
        turnAbortController.abort();
      } catch (_) {}
      turnAbortController = null;
    }

    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.onstart = null;
      try {
        recognition.abort();
      } catch (_) {
        try { recognition.stop(); } catch (_) {}
      }
    }
    recognition = null;
    recognitionActive = false;

    cancelTTS();
    setState(STATES.STOPPED);
    showToast('Voice companion stopped', 'success');
  }

  startBtn.addEventListener('click', startSession);
  stopBtn.addEventListener('click', stopSession);

  window.addEventListener('beforeunload', () => {
    sessionActive = false;
    clearRestartTimer();
    if (turnAbortController) {
      try { turnAbortController.abort(); } catch (_) {}
    }
    if (recognition) {
      try { recognition.abort(); } catch (_) {}
    }
    cancelTTS();
  });

  setState(STATES.IDLE);
});
