/**
 * merchant-view.js — 商家管理 CRUD 介面
 * 渲染 #view-merchant，提供剩食物品的新增、編輯、刪除
 */

import {
  getSession,
  getMerchantById,
  getFoodItemsByMerchant,
  saveFoodItem,
  deleteFoodItem,
  saveMerchant,
} from './storage.js';
import { openModal, closeModal, showToast } from './utils.js';

const UNITS = ['個', '份', '盒', '條', '串', '杯', '片', '袋'];
const CATEGORIES = ['麵包甜點', '便當熟食', '蔬果', '其他'];

// ── 初始化（掛載 HTML 骨架）─────────────────────────────────────
export function initMerchantView() {
  const section = document.getElementById('view-merchant');
  section.innerHTML = `
    <div class="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <!-- 商家資訊 card -->
      <div id="merchant-info-card"
        class="bg-white rounded-2xl border border-stone-200 p-5 flex items-start justify-between gap-4">
        <div id="merchant-info-content" class="flex-1 min-w-0">
          <!-- 由 renderMerchantView 填入 -->
        </div>
        <button id="btn-edit-merchant"
          class="flex-shrink-0 text-sm px-3 py-1.5 border border-stone-300 rounded-lg hover:border-orange-400 hover:text-orange-500 transition">
          編輯商家資料
        </button>
      </div>

      <!-- 剩食物品區 -->
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-stone-700">📦 我的剩食物品</h2>
        <button id="btn-add-item"
          class="text-sm px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition">
          ＋ 新增物品
        </button>
      </div>

      <!-- 物品列表 -->
      <div id="food-item-list" class="space-y-3">
        <!-- 由 renderFoodList 填入 -->
      </div>

    </div>
  `;
}

// ── 完整渲染（登入後呼叫）───────────────────────────────────────
export function renderMerchantView() {
  const session  = getSession();
  if (!session) return;

  const merchant = getMerchantById(session.merchantId);
  if (!merchant) return;

  // 商家資訊
  const infoEl = document.getElementById('merchant-info-content');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="flex items-center gap-2 mb-1">
        <span class="text-lg font-bold text-stone-800">${escHtml(merchant.name)}</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
          ${escHtml(merchant.category)}
        </span>
      </div>
      <p class="text-sm text-stone-500">📍 ${escHtml(merchant.address)}</p>
      ${merchant.phone ? `<p class="text-sm text-stone-500">📞 ${escHtml(merchant.phone)}</p>` : ''}
      ${merchant.lat && merchant.lng
        ? `<p class="text-xs text-stone-400 mt-1">座標：${merchant.lat}, ${merchant.lng}</p>`
        : `<p class="text-xs text-red-400 mt-1">⚠️ 尚未設定座標，地圖上不會顯示</p>`}
    `;
  }

  renderFoodList(session.merchantId);
  bindMerchantViewEvents(merchant);
}

// ── 剩食列表渲染 ─────────────────────────────────────────────────
function renderFoodList(merchantId) {
  const items   = getFoodItemsByMerchant(merchantId);
  const listEl  = document.getElementById('food-item-list');
  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-16 empty-state">
        <div class="text-5xl mb-3">🍽️</div>
        <p class="text-stone-400">目前沒有剩食物品</p>
        <p class="text-stone-300 text-sm mt-1">點擊「新增物品」開始發佈剩食</p>
      </div>`;
    return;
  }

  const statusLabel = { available: '可領取', claimed: '已領完', expired: '已過期' };
  const statusColor = {
    available: 'bg-green-100 text-green-700',
    claimed:   'bg-stone-100 text-stone-500',
    expired:   'bg-red-100 text-red-400',
  };

  listEl.innerHTML = items.map(item => `
    <div class="food-card bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3"
      data-id="${item.id}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-stone-800">${escHtml(item.name)}</span>
          <span class="text-sm text-orange-500 font-semibold">${item.quantity} ${escHtml(item.unit)}</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${statusColor[item.status] || 'bg-stone-100 text-stone-500'}">
            ${statusLabel[item.status] || item.status}
          </span>
        </div>
        <p class="text-sm text-stone-500 mt-1">
          🕐 領取時間：${item.pickupStart} – ${item.pickupEnd}
          <span class="text-stone-300 ml-2">${item.date}</span>
        </p>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <button class="btn-edit-item text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:border-orange-400 hover:text-orange-500 transition"
          data-id="${item.id}">編輯</button>
        <button class="btn-delete-item text-xs px-3 py-1.5 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 transition"
          data-id="${item.id}">刪除</button>
      </div>
    </div>
  `).join('');

  // 綁定列表按鈕事件
  listEl.querySelectorAll('.btn-edit-item').forEach(btn => {
    btn.addEventListener('click', () => openItemModal(btn.dataset.id));
  });
  listEl.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteItem(btn.dataset.id));
  });
}

// ── 事件綁定 ─────────────────────────────────────────────────────
function bindMerchantViewEvents(merchant) {
  const addBtn       = document.getElementById('btn-add-item');
  const editMchBtn   = document.getElementById('btn-edit-merchant');

  if (addBtn) {
    addBtn.onclick = () => openItemModal(null);
  }
  if (editMchBtn) {
    editMchBtn.onclick = () => openMerchantEditModal(merchant);
  }
}

// ── 剩食物品 Modal ────────────────────────────────────────────────
function openItemModal(itemId) {
  const session = getSession();
  const items   = getFoodItemsByMerchant(session.merchantId);
  const item    = itemId ? items.find(f => f.id === itemId) : null;
  const isEdit  = !!item;

  const unitOptions = UNITS.map(u =>
    `<option value="${u}" ${item?.unit === u ? 'selected' : ''}>${u}</option>`
  ).join('');

  const statusOptions = ['available', 'claimed', 'expired'].map(s => {
    const label = { available: '可領取', claimed: '已領完', expired: '已過期' }[s];
    return `<option value="${s}" ${item?.status === s ? 'selected' : ''}>${label}</option>`;
  }).join('');

  const today = new Date().toISOString().split('T')[0];

  openModal(`
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-base font-bold text-stone-800">${isEdit ? '編輯剩食物品' : '新增剩食物品'}</h3>
        <button id="modal-close" class="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
      </div>
      <form id="form-item" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="block text-sm text-stone-600 mb-1">品名 <span class="text-red-400">*</span></label>
            <input id="item-name" type="text" required value="${escHtml(item?.name ?? '')}"
              placeholder="例：法國麵包"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">數量 <span class="text-red-400">*</span></label>
            <input id="item-quantity" type="number" min="1" required value="${item?.quantity ?? 1}"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">單位</label>
            <select id="item-unit"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
              ${unitOptions}
            </select>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">領取開始</label>
            <input id="item-pickup-start" type="time" value="${item?.pickupStart ?? '17:00'}"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">領取結束</label>
            <input id="item-pickup-end" type="time" value="${item?.pickupEnd ?? '19:00'}"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">日期</label>
            <input id="item-date" type="date" value="${item?.date ?? today}"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          ${isEdit ? `
          <div>
            <label class="block text-sm text-stone-600 mb-1">狀態</label>
            <select id="item-status"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
              ${statusOptions}
            </select>
          </div>` : ''}
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" id="modal-cancel"
            class="flex-1 py-2.5 border border-stone-300 rounded-lg text-sm hover:bg-stone-50 transition">
            取消
          </button>
          <button type="submit"
            class="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition">
            ${isEdit ? '儲存變更' : '新增物品'}
          </button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('modal-close').onclick  = closeModal;
  document.getElementById('modal-cancel').onclick = closeModal;

  document.getElementById('form-item').addEventListener('submit', e => {
    e.preventDefault();
    const session = getSession();
    const data = {
      ...(isEdit ? { id: itemId } : {}),
      merchantId:  session.merchantId,
      name:        document.getElementById('item-name').value.trim(),
      quantity:    parseInt(document.getElementById('item-quantity').value, 10),
      unit:        document.getElementById('item-unit').value,
      pickupStart: document.getElementById('item-pickup-start').value,
      pickupEnd:   document.getElementById('item-pickup-end').value,
      date:        document.getElementById('item-date').value,
      status:      isEdit ? document.getElementById('item-status').value : 'available',
    };
    saveFoodItem(data);
    closeModal();
    renderFoodList(session.merchantId);
    showToast(isEdit ? '已更新物品' : '已新增物品 🎉', 'success');
  });
}

// ── 刪除確認 ─────────────────────────────────────────────────────
function confirmDeleteItem(itemId) {
  const session = getSession();
  openModal(`
    <div class="p-6 text-center space-y-4">
      <div class="text-4xl">🗑️</div>
      <h3 class="text-base font-bold text-stone-800">確定要刪除這筆物品？</h3>
      <p class="text-sm text-stone-500">此動作無法復原。</p>
      <div class="flex gap-3">
        <button id="confirm-cancel"
          class="flex-1 py-2.5 border border-stone-300 rounded-lg text-sm hover:bg-stone-50 transition">
          取消
        </button>
        <button id="confirm-delete"
          class="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition">
          確認刪除
        </button>
      </div>
    </div>
  `);
  document.getElementById('confirm-cancel').onclick = closeModal;
  document.getElementById('confirm-delete').onclick = () => {
    deleteFoodItem(itemId);
    closeModal();
    renderFoodList(session.merchantId);
    showToast('已刪除物品', 'default');
  };
}

// ── 商家資料編輯 Modal ────────────────────────────────────────────
function openMerchantEditModal(merchant) {
  const catOptions = CATEGORIES.map(c =>
    `<option value="${c}" ${merchant.category === c ? 'selected' : ''}>${c}</option>`
  ).join('');

  openModal(`
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-base font-bold text-stone-800">編輯商家資料</h3>
        <button id="modal-close" class="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
      </div>
      <form id="form-merchant-edit" class="space-y-3">
        <div>
          <label class="block text-sm text-stone-600 mb-1">店家名稱</label>
          <input id="mch-name" type="text" value="${escHtml(merchant.name)}"
            class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm text-stone-600 mb-1">地址</label>
          <input id="mch-address" type="text" value="${escHtml(merchant.address)}"
            class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-stone-600 mb-1">緯度（lat）</label>
            <input id="mch-lat" type="number" step="any" value="${merchant.lat ?? ''}"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">經度（lng）</label>
            <input id="mch-lng" type="number" step="any" value="${merchant.lng ?? ''}"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">電話</label>
            <input id="mch-phone" type="tel" value="${escHtml(merchant.phone ?? '')}"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">類別</label>
            <select id="mch-category"
              class="form-input w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
              ${catOptions}
            </select>
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" id="modal-cancel"
            class="flex-1 py-2.5 border border-stone-300 rounded-lg text-sm hover:bg-stone-50 transition">
            取消
          </button>
          <button type="submit"
            class="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition">
            儲存
          </button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('modal-close').onclick  = closeModal;
  document.getElementById('modal-cancel').onclick = closeModal;

  document.getElementById('form-merchant-edit').addEventListener('submit', e => {
    e.preventDefault();
    const updated = {
      ...merchant,
      name:     document.getElementById('mch-name').value.trim(),
      address:  document.getElementById('mch-address').value.trim(),
      lat:      parseFloat(document.getElementById('mch-lat').value) || null,
      lng:      parseFloat(document.getElementById('mch-lng').value) || null,
      phone:    document.getElementById('mch-phone').value.trim(),
      category: document.getElementById('mch-category').value,
    };
    saveMerchant(updated);
    closeModal();
    renderMerchantView();
    showToast('商家資料已更新', 'success');
  });
}

// ── 工具：HTML 跳脫 ──────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
