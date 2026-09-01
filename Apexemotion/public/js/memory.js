import { apiFetch } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('memoryForm');
  const list = document.getElementById('memoryList');
  const status = document.getElementById('status');
  const refreshBtn = document.getElementById('refreshBtn');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function render(items) {
    if (!items.length) {
      list.innerHTML = '<p class="text-slate-400">No saved memories yet.</p>';
      return;
    }

    list.innerHTML = items.map((m) => `
      <article class="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold">${escapeHtml(m.title)}</h3>
            <p class="mt-1 text-slate-300">${escapeHtml(m.fact)}</p>
            <p class="mt-2 text-xs text-slate-500">
              Importance ${Number(m.importance)}/5 · ${escapeHtml(m.source)}
            </p>
          </div>
          <button data-delete="${m.id}" class="text-xs text-red-300 hover:text-red-200">Delete</button>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await apiFetch(`/memory/${button.dataset.delete}`, { method: 'DELETE' });
          await load();
        } catch (err) {
          status.textContent = err.message || 'Unable to delete memory.';
        }
      });
    });
  }

  async function load() {
    try {
      const data = await apiFetch('/memory', { method: 'GET' });
      render(data.memories || []);
    } catch (err) {
      list.innerHTML = `<p class="text-red-300">${escapeHtml(err.message || 'Unable to load memories.')}</p>`;
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Saving...';
    try {
      await apiFetch('/memory', {
        method: 'POST',
        body: JSON.stringify({
          title: document.getElementById('title').value.trim(),
          fact: document.getElementById('fact').value.trim(),
          importance: Number(document.getElementById('importance').value),
        }),
      });
      form.reset();
      document.getElementById('importance').value = '3';
      status.textContent = 'Memory saved.';
      await load();
    } catch (err) {
      status.textContent = err.message || 'Unable to save memory.';
    }
  });

  refreshBtn?.addEventListener('click', load);
  load();
});
