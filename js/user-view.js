/**
 * user-view.js — 使用者瀏覽介面
 * 渲染 #view-user：Leaflet 地圖 + 剩食卡片列表 + 搜尋/類別篩選
 */

import { getMerchants, getMerchantById, getAvailableFoodItems } from './storage.js';
import { initMap, renderMarkers, flyToMerchant } from './map.js';

const CATEGORIES = ['全部', '麵包甜點', '便當熟食', '蔬果', '其他'];
let currentCategory = '全部';
let currentKeyword  = '';

// ── 初始化（掛載 HTML 骨架）─────────────────────────────────────
export function initUserView() {
  const section = document.getElementById('view-user');
  section.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-6 space-y-5">

      <!-- 標語 -->
      <div class="text-center py-4">
        <h1 class="text-2xl font-bold text-stone-800">
          打烊前的<span class="text-orange-500">溫暖</span>，等你來帶走
        </h1>
        <p class="text-sm text-stone-400 mt-1">高雄市前金區剩食即時地圖</p>
      </div>

      <!-- 搜尋列 -->
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">🔍</span>
        <input id="user-search"
          type="text" placeholder="搜尋店名或食物…"
          class="form-input w-full border border-stone-300 rounded-xl pl-9 pr-4 py-2.5 text-sm
                 focus:border-orange-400" />
      </div>

      <!-- 類別篩選 Tags -->
      <div id="category-tags" class="flex gap-2 flex-wrap">
        ${CATEGORIES.map((c, i) => `
          <button class="tag-btn text-sm px-4 py-1.5 rounded-full border border-stone-300
            hover:border-orange-400 hover:text-orange-500 transition ${i === 0 ? 'active' : ''}"
            data-cat="${c}">${c}</button>
        `).join('')}
      </div>

      <!-- 地圖 -->
      <div id="map" class="rounded-xl overflow-hidden border border-stone-200"></div>

      <!-- 卡片列表標題 -->
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-stone-700">🍱 可領取剩食</h2>
        <span id="item-count" class="text-sm text-stone-400"></span>
      </div>

      <!-- 卡片列表 -->
      <div id="user-card-list" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-10">
        <!-- 由 renderCards 填入 -->
      </div>

    </div>
  `;

  // 等 DOM 穩定後初始化地圖（避免容器尚未渲染）
  setTimeout(() => {
    initMap('map');
    refreshUserView();
    bindUserViewEvents();
  }, 50);
}

// ── 重新整理地圖 + 卡片 ──────────────────────────────────────────
export function refreshUserView() {
  const allMerchants = getMerchants();
  const allItems     = getAvailableFoodItems();

  renderMarkers(allMerchants, allItems);
  renderCards(allMerchants, allItems);
}

// ── 卡片渲染 ─────────────────────────────────────────────────────
function renderCards(merchants, foodItems) {
  const listEl = document.getElementById('user-card-list');
  const countEl= document.getElementById('item-count');
  if (!listEl) return;

  // 組合：每張卡片對應一筆剩食 + 商家資料
  let cards = foodItems.map(item => {
    const merchant = merchants.find(m => m.id === item.merchantId);
    return merchant ? { item, merchant } : null;
  }).filter(Boolean);

  // 類別篩選
  if (currentCategory !== '全部') {
    cards = cards.filter(({ merchant }) => merchant.category === currentCategory);
  }

  // 關鍵字搜尋（店名 or 品名）
  if (currentKeyword) {
    const kw = currentKeyword.toLowerCase();
    cards = cards.filter(({ item, merchant }) =>
      merchant.name.toLowerCase().includes(kw) ||
      item.name.toLowerCase().includes(kw)
    );
  }

  if (countEl) countEl.textContent = `共 ${cards.length} 筆`;

  if (cards.length === 0) {
    listEl.innerHTML = `
      <div class="col-span-2 text-center py-16 empty-state">
        <div class="text-5xl mb-3">🔎</div>
        <p class="text-stone-400">找不到符合條件的剩食</p>
        <p class="text-stone-300 text-sm mt-1">試試看清除篩選條件</p>
      </div>`;
    return;
  }

  listEl.innerHTML = cards.map(({ item, merchant }) => `
    <div class="food-card bg-white border border-stone-200 rounded-2xl p-4 cursor-pointer"
      data-merchant-id="${merchant.id}" data-item-id="${item.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div>
          <span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
            ${escHtml(merchant.category)}
          </span>
        </div>
        <div class="text-right">
          <span class="text-lg font-bold text-orange-500">${item.quantity}</span>
          <span class="text-sm text-stone-500">${escHtml(item.unit)}</span>
        </div>
      </div>
      <h3 class="font-semibold text-stone-800 mb-0.5">${escHtml(item.name)}</h3>
      <p class="text-sm text-stone-500">${escHtml(merchant.name)}</p>
      <div class="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
        <span>🕐 ${item.pickupStart} – ${item.pickupEnd}</span>
        ${merchant.lat && merchant.lng
          ? `<span class="text-orange-400 font-medium">📍 查看地圖</span>`
          : `<span>📍 ${escHtml(merchant.address.slice(0, 10))}…</span>`}
      </div>
    </div>
  `).join('');

  // 點擊卡片飛到地圖
  listEl.querySelectorAll('.food-card').forEach(card => {
    card.addEventListener('click', () => {
      const merchantId = card.dataset.merchantId;
      flyToMerchant(merchantId);

      // highlight 卡片
      listEl.querySelectorAll('.food-card').forEach(c => c.classList.remove('highlighted'));
      card.classList.add('highlighted');
    });
  });
}

// ── 事件綁定 ─────────────────────────────────────────────────────
function bindUserViewEvents() {
  // 搜尋
  const searchInput = document.getElementById('user-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      currentKeyword = e.target.value.trim();
      refreshUserView();
    });
  }

  // 類別 Tag
  const tagsEl = document.getElementById('category-tags');
  if (tagsEl) {
    tagsEl.addEventListener('click', e => {
      const btn = e.target.closest('.tag-btn');
      if (!btn) return;
      currentCategory = btn.dataset.cat;
      tagsEl.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshUserView();
    });
  }
}

// ── 工具 ──────────────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
