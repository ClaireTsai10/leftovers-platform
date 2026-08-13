/**
 * utils.js — 全域 UI 工具函式
 * 獨立模組，避免循環依賴
 * 提供：showView、showToast、openModal、closeModal
 */

const VIEWS = ['view-auth', 'view-merchant', 'view-user'];

// ── View 切換 ────────────────────────────────────────────────
export function showView(name) {
  VIEWS.forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById(`view-${name}`).classList.remove('hidden');
  _updateNavbar(name);
}

function _updateNavbar(viewName) {
  // 延遲讀取 session，避免 import 時 storage 尚未初始化
  const raw     = localStorage.getItem('lf_session');
  const session = raw ? JSON.parse(raw) : null;

  const toMerchantBtn = document.getElementById('nav-to-merchant');
  const logoutBtn     = document.getElementById('nav-logout');
  const merchantName  = document.getElementById('nav-merchant-name');

  toMerchantBtn.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  merchantName.classList.add('hidden');

  if (viewName === 'user') {
    toMerchantBtn.classList.remove('hidden');
  } else if (viewName === 'merchant' && session) {
    merchantName.textContent = `👋 ${session.username}`;
    merchantName.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
  }
}

// ── Toast 通知 ───────────────────────────────────────────────
let _toastTimer = null;
export function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  const colorMap = { success: 'bg-green-600', error: 'bg-red-500', default: 'bg-stone-800' };
  const bg = colorMap[type] || 'bg-stone-800';

  toast.textContent = message;
  // 替換所有 bg-* class
  toast.className = toast.className
    .split(' ')
    .filter(c => !c.startsWith('bg-'))
    .concat([bg, 'show'])
    .join(' ');

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ── Modal ────────────────────────────────────────────────────
export function openModal(htmlContent) {
  document.getElementById('modal-box').innerHTML = htmlContent;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-box').innerHTML = '';
}
