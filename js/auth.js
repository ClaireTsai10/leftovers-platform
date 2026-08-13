/**
 * auth.js — 商家認證模組
 * 負責登入、登出、註冊邏輯，並渲染 #view-auth 的 HTML 結構
 */

import { getMerchants, saveMerchant, setSession, seedDemoData } from './storage.js';
import { showView, showToast } from './utils.js';
import { renderMerchantView } from './merchant-view.js';

// ── 密碼 Hash（Demo 等級，用 btoa 簡易編碼）────────────────────
function hashPassword(pw) {
  return btoa(unescape(encodeURIComponent(pw)));
}

// ── 認證邏輯 ─────────────────────────────────────────────────
export function login(username, password) {
  const merchants = getMerchants();
  const merchant = merchants.find(
    m => m.username === username && m.passwordHash === hashPassword(password)
  );
  if (!merchant) return { ok: false, message: '帳號或密碼錯誤' };
  setSession({ merchantId: merchant.id, username: merchant.username });
  return { ok: true, merchant };
}

/**
 * @param {object} data — { name, address, phone, category, username, password }
 */
export function register(data) {
  const merchants = getMerchants();
  if (merchants.find(m => m.username === data.username)) {
    return { ok: false, message: '此帳號名稱已被使用' };
  }
  const newMerchant = {
    name:         data.name,
    address:      data.address,
    phone:        data.phone,
    category:     data.category,
    username:     data.username,
    passwordHash: hashPassword(data.password),
  };
  const saved = saveMerchant(newMerchant);
  setSession({ merchantId: saved.id, username: saved.username });
  return { ok: true, merchant: saved };
}

// ── View 渲染 ─────────────────────────────────────────────────
export function initAuthView() {
  seedDemoData(); // 首次載入時 seed 假資料

  const section = document.getElementById('view-auth');
  section.innerHTML = `
    <div class="max-w-md mx-auto px-4 py-10">
      <!-- Tab 切換 -->
      <div class="flex rounded-xl overflow-hidden border border-stone-200 mb-6">
        <button id="tab-login"
          class="flex-1 py-2.5 text-sm font-medium bg-orange-500 text-white transition">
          商家登入
        </button>
        <button id="tab-register"
          class="flex-1 py-2.5 text-sm font-medium bg-white text-stone-500 hover:bg-stone-50 transition">
          新商家註冊
        </button>
      </div>

      <!-- 登入表單 -->
      <form id="form-login" class="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h2 class="text-lg font-bold text-stone-700">商家登入</h2>
        <div>
          <label class="block text-sm text-stone-600 mb-1">帳號</label>
          <input id="login-username" type="text" placeholder="請輸入帳號"
            class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm text-stone-600 mb-1">密碼</label>
          <input id="login-password" type="password" placeholder="請輸入密碼"
            class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <p id="login-error" class="text-red-500 text-xs hidden"></p>
        <button type="submit"
          class="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition">
          登入
        </button>
        <p class="text-xs text-stone-400 text-center">
          Demo 帳號：wangbakery / grannyfood / happysoy（密碼均為 demo1234）
        </p>
      </form>

      <!-- 註冊表單 -->
      <form id="form-register" class="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 hidden">
        <h2 class="text-lg font-bold text-stone-700">新商家註冊</h2>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="block text-sm text-stone-600 mb-1">店家名稱 <span class="text-red-400">*</span></label>
            <input id="reg-name" type="text" required placeholder="例：老王麵包坊"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div class="col-span-2">
            <label class="block text-sm text-stone-600 mb-1">地址 <span class="text-red-400">*</span></label>
            <input id="reg-address" type="text" required placeholder="高雄市前金區…"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">電話</label>
            <input id="reg-phone" type="tel" placeholder="07-XXXXXXX"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">商家類別 <span class="text-red-400">*</span></label>
            <select id="reg-category"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="麵包店">麵包店</option>
              <option value="自助餐">自助餐</option>
              <option value="生鮮超市">生鮮超市</option>
              <option value="便利商店">便利商店</option>
              <option value="咖啡飲品">咖啡飲品</option>
              <option value="日式料理">日式料理</option>
              <option value="中式餐廳">中式餐廳</option>
              <option value="西式餐廳">西式餐廳</option>
              <option value="小吃攤">小吃攤</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">帳號 <span class="text-red-400">*</span></label>
            <input id="reg-username" type="text" required placeholder="英數字"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">密碼 <span class="text-red-400">*</span></label>
            <input id="reg-password" type="password" required placeholder="至少 6 碼"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <p id="reg-error" class="text-red-500 text-xs hidden"></p>
        <button type="submit"
          class="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition">
          建立帳號並登入
        </button>
      </form>

      <!-- 返回使用者介面 -->
      <button id="auth-back-to-user"
        class="mt-4 w-full text-center text-sm text-stone-400 hover:text-orange-500 transition">
        ← 回到剩食地圖（使用者介面）
      </button>
    </div>
  `;

  bindAuthEvents();
}

function bindAuthEvents() {
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');
  const formLogin    = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  // Tab 切換
  tabLogin.addEventListener('click', () => {
    tabLogin.className    = tabLogin.className.replace('bg-white text-stone-500', 'bg-orange-500 text-white');
    tabRegister.className = tabRegister.className.replace('bg-orange-500 text-white', 'bg-white text-stone-500');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.className = tabRegister.className.replace('bg-white text-stone-500', 'bg-orange-500 text-white');
    tabLogin.className    = tabLogin.className.replace('bg-orange-500 text-white', 'bg-white text-stone-500');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  });

  // 登入
  formLogin.addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');

    const result = login(username, password);
    if (!result.ok) {
      errEl.textContent = result.message;
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');
    showToast(`歡迎回來，${result.merchant.name}！`, 'success');
    renderMerchantView();
    showView('merchant');
  });

  // 註冊
  formRegister.addEventListener('submit', e => {
    e.preventDefault();
    const errEl    = document.getElementById('reg-error');
    const password = document.getElementById('reg-password').value;
    if (password.length < 6) {
      errEl.textContent = '密碼至少需要 6 碼';
      errEl.classList.remove('hidden');
      return;
    }
    const data = {
      name:     document.getElementById('reg-name').value.trim(),
      address:  document.getElementById('reg-address').value.trim(),
      phone:    document.getElementById('reg-phone').value.trim(),
      category: document.getElementById('reg-category').value,
      username: document.getElementById('reg-username').value.trim(),
      password,
    };
    const result = register(data);
    if (!result.ok) {
      errEl.textContent = result.message;
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');
    showToast(`${result.merchant.name} 註冊成功！`, 'success');
    renderMerchantView();
    showView('merchant');
  });

  // 返回使用者介面
  document.getElementById('auth-back-to-user')
    .addEventListener('click', () => showView('user'));
}
