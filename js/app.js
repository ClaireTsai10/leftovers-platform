/**
 * app.js — SPA 路由控制器（入口）
 * 負責初始化各 view 並綁定全域事件；UI 工具函式統一在 utils.js
 */

import { getSession, clearSession }        from './storage.js';
import { showView, showToast, closeModal } from './utils.js';
import { initAuthView }              from './auth.js';
import { initMerchantView }          from './merchant-view.js';
import { initUserView }              from './user-view.js';

document.addEventListener('DOMContentLoaded', () => {
  // 初始化各 view（注入 HTML 結構）
  initAuthView();
  initMerchantView();
  initUserView();

  // 點擊 modal 遮罩關閉
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // 登出按鈕
  document.getElementById('nav-logout').addEventListener('click', () => {
    clearSession();
    showView('user');
    showToast('已登出', 'default');
  });

  // Logo 點擊回使用者介面
  document.getElementById('nav-logo').addEventListener('click', () => showView('user'));

  // 商家登入按鈕
  document.getElementById('nav-to-merchant').addEventListener('click', () => showView('auth'));

  // 根據 session 決定初始 view
  const session = getSession();
  showView(session ? 'merchant' : 'user');
});
