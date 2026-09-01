import { apiFetch } from './api.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

async function load() {
  try {
    const [contact, settings, history] = await Promise.all([
      apiFetch('/alert/contact', {method:'GET'}),
      apiFetch('/alert/settings', {method:'GET'}),
      apiFetch('/alert/history?limit=30', {method:'GET'})
    ]);
    if (contact.contact) {
      $('name').value = contact.contact.name || '';
      $('email').value = contact.contact.email || '';
    }
    $('enabled').checked = !!settings.enabled;
    $('threshold').value = settings.threshold || 'HIGH';
    $('cooldown').value = settings.cooldown_minutes || 60;
    renderHistory(history.alerts || []);
  } catch (e) {
    $('status').textContent = e.message || 'Unable to load alert settings.';
  }
}

function renderHistory(items) {
  $('history').innerHTML = items.length ? items.map(a => `
    <div class="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
      <div class="flex justify-between gap-3">
        <div>
          <span class="font-semibold">${esc(a.status).toUpperCase()}</span>
          <span class="ml-3">${esc(a.risk_level)} — ${Number(a.risk_score).toFixed(1)}</span>
          <div class="text-xs text-slate-500 mt-1">${new Date(a.created_at).toLocaleString()}</div>
        </div>
        <span class="text-xs text-slate-400">${esc(a.contact_email)}</span>
      </div>
      ${a.provider_message ? `<div class="text-xs text-slate-500 mt-2">${esc(a.provider_message)}</div>` : ''}
    </div>
  `).join('') : '<p class="text-slate-400">No alert history.</p>';
}

$('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await apiFetch('/alert/contact', {
      method:'POST',
      body:JSON.stringify({name:$('name').value.trim(), email:$('email').value.trim(), enabled:true})
    });
    $('status').textContent = 'Trusted contact saved.';
    await load();
  } catch (err) { $('status').textContent = err.message; }
});

$('removeContact').addEventListener('click', async () => {
  try {
    await apiFetch('/alert/contact', {method:'DELETE'});
    $('name').value = ''; $('email').value = '';
    $('status').textContent = 'Trusted contact removed.';
    await load();
  } catch (err) { $('status').textContent = err.message; }
});

$('saveSettings').addEventListener('click', async () => {
  try {
    await apiFetch('/alert/settings', {
      method:'PATCH',
      body:JSON.stringify({
        enabled:$('enabled').checked,
        threshold:$('threshold').value,
        cooldown_minutes:Number($('cooldown').value)
      })
    });
    $('status').textContent = 'Alert settings saved.';
    await load();
  } catch (err) { $('status').textContent = err.message; }
});

$('testAlert').addEventListener('click', async () => {
  $('status').textContent = 'Sending test email...';
  try {
    const result = await apiFetch('/alert/test', {
      method:'POST',
      body:JSON.stringify({risk_level:'HIGH', risk_score:75})
    });
    $('status').textContent = result.sent ? 'Email accepted by provider. Check the trusted contact inbox.' : `Test not sent: ${result.reason}`;
    await load();
  } catch (err) { $('status').textContent = err.message; }
});

load();
