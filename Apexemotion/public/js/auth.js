import { apiFetch } from './api.js';
import { showToast } from './ui.js';

// Guard Chat page: redirect guests to Login
document.addEventListener('DOMContentLoaded', () => {
  const isChatPage = location.pathname.endsWith('chat.html');
  const isVoiceCompanionPage = location.pathname.endsWith('voice-companion.html');
  const token = localStorage.getItem('ksm_access_token');
  if ((isChatPage || isVoiceCompanionPage) && !token) {
    showToast('Please login to access chat', 'error');
    location.href = './login.html';
  }
});

// Handle Register
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // ✅ Added
        body: JSON.stringify({ username, email, password }),
      });
      showToast('Registered successfully', 'success');
      setTimeout(() => (location.href = './login.html'), 800);
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
      console.error(err);
    }
  });
}

// Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // ✅ Added
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('ksm_access_token', data.access_token);
      showToast('Login successfully', 'success');
      setTimeout(() => (location.href = './chat.html'), 800);
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
      console.error(err);
    }
  });
}

// Optional: logout helper if you add a logout button later
export function logout() {
  localStorage.removeItem('ksm_access_token');
  showToast('Logged out', 'success');
  location.href = './index.html';
}
