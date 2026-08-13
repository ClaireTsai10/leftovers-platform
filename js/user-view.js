/**
 * user-view.js — 使用者瀏覽介面
 * 地圖在上 + 進階篩選 + 卡片列表在下
 * 點擊卡片 flyTo 對應商家 Marker
 */

import { getMerchants, getAvailableFoodItems } from './storage.js';
import { initMap, renderMarkers, flyToMerchant } from './map.js';

const MERCHANT_CATS = ['全部', '麵包店', '自助餐', '生鮮超市', '便利商店', '咖啡飲品', '日式料理', '中式餐廳', '西式餐廳', '小吃攤', '其他'];
const FOOD_CATS     = ['全部', '麵包', '熟食', '蔬菜', '水果', '飲品', '甜點', '其他'];

// 篩選狀態
let filter = {
  keyword:     '',
  offerType:   'all',   // 'all' | 'free' | 'discount'
  merchantCat: '全部',
  foodCat:     '全部',
  maxPrice:    '',      // '' = 無上限
};

// ── 初始化（掛載 HTML 骨架）─────────────────────────────────────
export function initUserView() {
  const section = document.getElementById('view-user');
  section.innerHTML = `
    <div class="max-w-4xl mx-auto px-4 py-6 space-y-5">

      <!-- 標語 -->
      <div class="text-center py-4">
        <h1 class="text-2xl font-bold text-stone-800">
          打烊前的<span class="text-orange-500">溫暖</span>，等你來帶走
        </h1>
        <p class="text-sm text-stone-400 mt-1">高雄市前金區・免費剩食 ＆ 打折惜食</p>
      </div>

      <!-- 地圖 -->
      <div id="map" class="rounded-xl overflow-hidden border border-stone-200 shadow-sm"></div>

      <!-- 搜尋列 -->
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">🔍</span>
        <input id="user-search" type="text" placeholder="搜尋店名或食物名稱…"
          class="form-input w-full border border-stone-300 rounded-xl pl-9 pr-4 py-2.5 text-sm" />
      </div>

      <!-- 進階篩選面板 -->
      <div class="bg-white border border-stone-200 rounded-2xl p-4 space-y-4">

        <!-- 物資類型 -->
        <div>
          <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">物資類型</p>
          <div class="flex gap-2">
            <button class="offer-btn tag-btn active text-sm px-4 py-1.5 rounded-full border border-stone-300 transition" data-offer="all">全部</button>
            <button class="offer-btn tag-btn text-sm px-4 py-1.5 rounded-full border border-stone-300 transition" data-offer="free">
              <span class="text-emerald-600">●</span> 免費領取
            </button>
            <button class="offer-btn tag-btn text-sm px-4 py-1.5 rounded-full border border-stone-300 transition" data-offer="discount">
              <span class="text-blue-500">●</span> 打折販售
            </button>
          </div>
        </div>

        <!-- 商家類別 -->
        <div>
          <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">商家類別</p>
          <div id="merchant-cat-tags" class="flex gap-2 flex-wrap">
            ${MERCHANT_CATS.map((c, i) => `
              <button class="mcat-btn tag-btn text-sm px-3 py-1 rounded-full border border-stone-300 transition ${i === 0 ? 'active' : ''}"
                data-mcat="${c}">${c}</button>
            `).join('')}
          </div>
        </div>

        <!-- 食物類別 -->
        <div>
          <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">食物類別</p>
          <div id="food-cat-tags" class="flex gap-2 flex-wrap">
            ${FOOD_CATS.map((c, i) => `
              <button class="fcat-btn tag-btn text-sm px-3 py-1 rounded-full border border-stone-300 transition ${i === 0 ? 'active' : ''}"
                data-fcat="${c}">${c}</button>
            `).join('')}
          </div>
        </div>

        <!-- 價格上限（僅打折時有意義） -->
        <div id="price-filter-row">
          <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">打折最高價格（元）</p>
          <div class="flex items-center gap-3">
            <input id="max-price" type="number" min="0" placeholder="不限"
              class="form-input w-32 border border-stone-300 rounded-lg px-3 py-1.5 text-sm" />
            <span class="text-xs text-stone-400">空白 = 不限上限</span>
          </div>
        </div>

      </div>

      <!-- 結果標題 -->
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-stone-700">🍱 可領取物資</h2>
        <span id="item-count" class="text-sm text-stone-400"></span>
      </div>

      <!-- 卡片列表 -->
      <div id="user-card-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-10">
        <!-- 由 renderCards 填入 -->
      </div>

    </div>
  `;

  // 延遲初始化地圖，確保 #map 容器已渲染
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
  const listEl  = document.getElementById('user-card-list');
  const countEl = document.getElementById('item-count');
  if (!listEl) return;

  // 組合卡片資料
  let cards = foodItems.map(item => {
    const merchant = merchants.find(m => m.id === item.merchantId);
    return merchant ? { item, merchant } : null;
  }).filter(Boolean);

  // 篩選：物資類型
  if (filter.offerType !== 'all') {
    cards = cards.filter(({ item }) => item.offerType === filter.offerType);
  }

  // 篩選：商家類別
  if (filter.merchantCat !== '全部') {
    cards = cards.filter(({ merchant }) => merchant.category === filter.merchantCat);
  }

  // 篩選：食物類別
  if (filter.foodCat !== '全部') {
    cards = cards.filter(({ item }) => item.foodCategory === filter.foodCat);
  }

  // 篩選：價格上限（只對打折品有效）
  if (filter.maxPrice !== '') {
    const max = parseFloat(filter.maxPrice);
    cards = cards.filter(({ item }) =>
      item.offerType === 'free' || (item.price != null && item.price <= max)
    );
  }

  // 篩選：關鍵字
  if (filter.keyword) {
    const kw = filter.keyword.toLowerCase();
    cards = cards.filter(({ item, merchant }) =>
      merchant.name.toLowerCase().includes(kw) ||
      item.name.toLowerCase().includes(kw) ||
      (item.foodCategory ?? '').toLowerCase().includes(kw)
    );
  }

  if (countEl) countEl.textContent = `共 ${cards.length} 筆`;

  if (cards.length === 0) {
    listEl.innerHTML = `
      <div class="col-span-3 text-center py-16 empty-state">
        <div class="text-5xl mb-3">🔎</div>
        <p class="text-stone-400">找不到符合條件的物資</p>
        <p class="text-stone-300 text-sm mt-1">試試看調整篩選條件</p>
      </div>`;
    return;
  }

  listEl.innerHTML = cards.map(({ item, merchant }) => {
    const isFree = item.offerType === 'free';
    const offerBadge = isFree
      ? `<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">免費</span>`
      : `<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-semibold">$ ${item.price}</span>`;
    const priceLine = isFree
      ? `<span class="text-lg font-bold text-emerald-500">免費</span>`
      : `<span class="text-lg font-bold text-blue-500">$${item.price}</span>
         <span class="text-xs text-stone-400 ml-1">/ ${escHtml(item.unit)}</span>`;
    const hasCoords = merchant.lat && merchant.lng;

    return `
    <div class="food-card bg-white border border-stone-200 rounded-2xl p-4 ${hasCoords ? 'cursor-pointer' : 'cursor-default'}"
      data-merchant-id="${merchant.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex flex-wrap gap-1">
          <span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">${escHtml(merchant.category)}</span>
          ${item.foodCategory ? `<span class="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">${escHtml(item.foodCategory)}</span>` : ''}
        </div>
        ${offerBadge}
      </div>
      <h3 class="font-semibold text-stone-800 text-base mb-0.5">${escHtml(item.name)}</h3>
      <p class="text-sm text-stone-500 mb-2">${escHtml(merchant.name)}</p>
      <div class="flex items-end justify-between">
        <div>
          ${priceLine}
          <div class="text-sm text-stone-500 mt-0.5">${item.quantity} ${escHtml(item.unit)} 可領</div>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
        <span>🕐 ${item.pickupStart} – ${item.pickupEnd}</span>
        <span>${hasCoords ? '📍 查看地圖' : '📍 ' + escHtml(merchant.address.length > 12 ? merchant.address.slice(0, 12) + '…' : merchant.address)}</span>
      </div>
    </div>
  `}).join('');

  // 點擊有座標的卡片 → flyTo + highlight
  listEl.querySelectorAll('.food-card[data-merchant-id]').forEach(card => {
    const merchantId = card.dataset.merchantId;
    const m = cards.find(c => c.merchant.id === merchantId)?.merchant;
    if (!m?.lat || !m?.lng) return;
    card.addEventListener('click', () => {
      listEl.querySelectorAll('.food-card').forEach(c => c.classList.remove('highlighted'));
      card.classList.add('highlighted');
      flyToMerchant(merchantId);
      // 讓頁面捲回地圖位置
      document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── 事件綁定 ─────────────────────────────────────────────────────
function bindUserViewEvents() {
  // 搜尋
  document.getElementById('user-search')?.addEventListener('input', e => {
    filter.keyword = e.target.value.trim();
    refreshUserView();
  });

  // 物資類型按鈕
  document.querySelectorAll('.offer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filter.offerType = btn.dataset.offer;
      document.querySelectorAll('.offer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 有選打折才顯示價格篩選
      const priceRow = document.getElementById('price-filter-row');
      priceRow.style.display = filter.offerType === 'free' ? 'none' : '';
      refreshUserView();
    });
  });

  // 商家類別 Tags
  document.getElementById('merchant-cat-tags')?.addEventListener('click', e => {
    const btn = e.target.closest('.mcat-btn');
    if (!btn) return;
    filter.merchantCat = btn.dataset.mcat;
    document.querySelectorAll('.mcat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refreshUserView();
  });

  // 食物類別 Tags
  document.getElementById('food-cat-tags')?.addEventListener('click', e => {
    const btn = e.target.closest('.fcat-btn');
    if (!btn) return;
    filter.foodCat = btn.dataset.fcat;
    document.querySelectorAll('.fcat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refreshUserView();
  });

  // 價格上限
  document.getElementById('max-price')?.addEventListener('input', e => {
    filter.maxPrice = e.target.value;
    refreshUserView();
  });
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
