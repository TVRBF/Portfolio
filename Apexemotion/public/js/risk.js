import { apiFetch } from './api.js';

const $ = (id) => document.getElementById(id);

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
}

function levelClass(level) {
  return {
    LOW: 'text-emerald-300',
    MODERATE: 'text-yellow-300',
    HIGH: 'text-orange-300',
    CRITICAL: 'text-red-300'
  }[level] || 'text-slate-300';
}

function renderResult(r) {
  $('result').innerHTML = `
    <div class="text-center">
      <div class="text-5xl font-bold ${levelClass(r.risk_level)}">${Number(r.risk_score).toFixed(1)}</div>
      <div class="mt-2 text-xl font-semibold">${escapeHtml(r.risk_level)}</div>
      <div class="text-sm text-slate-400 mt-1">Confidence: ${(Number(r.confidence) * 100).toFixed(0)}%</div>
    </div>
    <div class="grid grid-cols-3 gap-3 mt-6 text-center">
      <div class="bg-slate-900 rounded p-3"><div class="text-xs text-slate-500">Emotion</div><div>${Number(r.emotion_score).toFixed(1)}</div></div>
      <div class="bg-slate-900 rounded p-3"><div class="text-xs text-slate-500">Persistence</div><div>${Number(r.persistence_score).toFixed(1)}</div></div>
      <div class="bg-slate-900 rounded p-3"><div class="text-xs text-slate-500">Text distress</div><div>${Number(r.text_distress_score).toFixed(1)}</div></div>
    </div>
    <div class="mt-5">
      <h3 class="font-semibold">Factors</h3>
      <ul class="mt-2 space-y-2">
        ${(r.factors || []).map(f => `<li class="flex justify-between gap-3 text-sm"><span>${escapeHtml(f.label)}</span><span>${Number(f.contribution).toFixed(1)}</span></li>`).join('') || '<li class="text-slate-400">No significant factors.</li>'}
      </ul>
    </div>
    <div class="mt-5 text-sm text-slate-400">
      Indicators: ${(r.distress_indicators || []).map(escapeHtml).join(', ') || 'None'}
    </div>
    <p class="mt-4 text-xs text-slate-500">
      Engineering screening score only — not a medical diagnosis or clinical risk assessment.
    </p>
  `;
}

async function loadHistory() {
  try {
    const data = await apiFetch('/risk/history?limit=20', { method: 'GET' });
    const items = data.history || [];
    $('history').innerHTML = items.length ? items.map(item => `
      <div class="rounded-lg border border-slate-700 bg-slate-900/60 p-4 flex items-center justify-between">
        <div>
          <span class="font-semibold ${levelClass(item.risk_level)}">${escapeHtml(item.risk_level)}</span>
          <span class="ml-3">${Number(item.risk_score).toFixed(1)}</span>
          <div class="text-xs text-slate-500 mt-1">${new Date(item.created_at).toLocaleString()}</div>
        </div>
        <div class="text-xs text-slate-400">${item.observations_considered} observations</div>
      </div>
    `).join('') : '<p class="text-slate-400">No risk history yet.</p>';
  } catch (err) {
    $('history').innerHTML = `<p class="text-red-300">${escapeHtml(err.message)}</p>`;
  }
}

$('analyze').addEventListener('click', async () => {
  $('error').textContent = '';
  try {
    const observations = JSON.parse($('observations').value);
    if (!Array.isArray(observations)) throw new Error('Observations must be a JSON array.');
    const result = await apiFetch('/risk/analyze', {
      method: 'POST',
      body: JSON.stringify({
        observations,
        text: $('distressText').value.trim() || null,
        temporal_window_minutes: Number($('window').value)
      })
    });
    renderResult(result);
    await loadHistory();
  } catch (err) {
    $('error').textContent = err.message || 'Risk analysis failed.';
  }
});

$('refresh').addEventListener('click', loadHistory);
loadHistory();
