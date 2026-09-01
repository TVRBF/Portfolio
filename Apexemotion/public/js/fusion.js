import { apiFetch } from './api.js';
import { showToast } from './ui.js';

const ICONS = {
  joy: '😊', sadness: '😔', anger: '😠', fear: '😨',
  disgust: '🤢', surprise: '😲', neutral: '😐'
};

const pairs = [
  ['textEnabled', 'textEmotion', 'textConfidence'],
  ['voiceEnabled', 'voiceEmotion', 'voiceConfidence'],
  ['faceEnabled', 'faceEmotionInput', 'faceConfidenceInput'],
];

for (const [enabledId, emotionId, confidenceId] of pairs) {
  const enabled = document.getElementById(enabledId);
  const emotion = document.getElementById(emotionId);
  const confidence = document.getElementById(confidenceId);
  const sync = () => {
    confidence.disabled = !enabled.checked;
    emotion.disabled = !enabled.checked;
  };
  enabled.addEventListener('change', sync);
  sync();
}

function getInput(enabledId, emotionId, confidenceId) {
  if (!document.getElementById(enabledId).checked) return null;
  const emotion = document.getElementById(emotionId).value.trim();
  const pct = Number(document.getElementById(confidenceId).value);
  if (!emotion || !Number.isFinite(pct)) throw new Error('Enter an emotion and confidence for every selected modality.');
  if (pct < 0 || pct > 100) throw new Error('Confidence must be between 0 and 100%.');
  return { emotion, confidence: pct / 100 };
}

function pretty(emotion) {
  return `${ICONS[emotion] || '🙂'} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`;
}

document.getElementById('fuseBtn').addEventListener('click', async () => {
  const status = document.getElementById('fusionStatus');
  const resultCard = document.getElementById('fusionResult');
  try {
    const payload = {
      text: getInput('textEnabled', 'textEmotion', 'textConfidence'),
      voice: getInput('voiceEnabled', 'voiceEmotion', 'voiceConfidence'),
      face: getInput('faceEnabled', 'faceEmotionInput', 'faceConfidenceInput'),
    };
    if (!payload.text && !payload.voice && !payload.face) throw new Error('Select at least one modality.');

    status.textContent = 'Calculating multimodal fusion...';
    const result = await apiFetch('/emotion/fusion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    document.getElementById('finalEmotion').textContent = pretty(result.emotion);
    document.getElementById('finalConfidence').textContent = `${Math.round(result.confidence * 100)}%`;
    document.getElementById('modalityCount').textContent = `Modalities used: ${result.modalities_used.length} / 3`;
    const agreementText = {
      full: 'Agreement: Full',
      majority: 'Agreement: Majority',
      disagreement: '⚠ Modalities disagree'
    }[result.agreement.type] || `Agreement: ${result.agreement.type}`;
    document.getElementById('agreement').textContent = agreementText;

    const breakdown = document.getElementById('modalityBreakdown');
    breakdown.innerHTML = '';
    for (const [modality, data] of Object.entries(result.modalities)) {
      const card = document.createElement('div');
      card.className = 'p-4 rounded-lg bg-slate-900 border border-slate-700';
      card.innerHTML = `
        <p class="text-xs uppercase text-slate-500">${modality}</p>
        <p class="mt-2 text-lg font-semibold">${pretty(data.emotion)}</p>
        <p class="text-sm text-slate-400">${Math.round(data.confidence * 100)}% confidence</p>
        <p class="text-xs text-slate-500 mt-2">Effective weight: ${(data.effective_weight * 100).toFixed(1)}%</p>`;
      breakdown.appendChild(card);
    }
    resultCard.classList.remove('hidden');
    status.textContent = 'Fusion complete.';
  } catch (err) {
    status.textContent = 'Unable to calculate fusion.';
    showToast(err.message || 'Fusion failed.', 'error');
  }
});
