// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
  }
});

// Simple toast helper (placeholder; enhanced later)
export function showToast(message, type = 'info') {
  const container = document.createElement('div');
  container.textContent = message;
  container.className =
    'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow ' +
    (type === 'success'
      ? 'bg-teal-500 text-slate-900'
      : type === 'error'
      ? 'bg-rose-500 text-white'
      : 'bg-slate-700 text-white');
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 2500);
}
