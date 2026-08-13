/**
 * storage.js — localStorage 抽象層
 * 唯一允許直接呼叫 localStorage 的模組
 * 所有 key 統一使用 lf_ 前綴
 */

const KEYS = {
  MERCHANTS:  'lf_merchants',
  FOOD_ITEMS: 'lf_food_items',
  SESSION:    'lf_session',
};

// ── 通用 helper ──────────────────────────────────────────────
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? null;
  } catch {
    return null;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── 商家 ─────────────────────────────────────────────────────
export function getMerchants() {
  return load(KEYS.MERCHANTS) ?? [];
}

export function getMerchantById(id) {
  return getMerchants().find(m => m.id === id) ?? null;
}

export function saveMerchant(merchantData) {
  const merchants = getMerchants();
  const idx = merchants.findIndex(m => m.id === merchantData.id);
  if (idx >= 0) {
    merchants[idx] = { ...merchants[idx], ...merchantData };
  } else {
    merchants.push({ id: genId('m'), ...merchantData });
  }
  save(KEYS.MERCHANTS, merchants);
  return merchants.find(m => m.username === merchantData.username);
}

export function deleteMerchant(id) {
  save(KEYS.MERCHANTS, getMerchants().filter(m => m.id !== id));
  save(KEYS.FOOD_ITEMS, getFoodItems().filter(f => f.merchantId !== id));
}

// ── 剩食物品 ─────────────────────────────────────────────────
export function getFoodItems() {
  return load(KEYS.FOOD_ITEMS) ?? [];
}

export function getFoodItemsByMerchant(merchantId) {
  return getFoodItems().filter(f => f.merchantId === merchantId);
}

export function getAvailableFoodItems() {
  return getFoodItems().filter(f => f.status === 'available');
}

/**
 * 新增或更新剩食物品
 * @param {object} itemData — 若含 id 則更新，否則新增
 * offerType: 'free' | 'discount'
 * price: number | null（discount 時必填）
 * foodCategory: string
 */
export function saveFoodItem(itemData) {
  const items = getFoodItems();
  if (itemData.id) {
    const idx = items.findIndex(f => f.id === itemData.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...itemData };
  } else {
    items.push({ id: genId('fi'), status: 'available', ...itemData });
  }
  save(KEYS.FOOD_ITEMS, items);
}

export function deleteFoodItem(id) {
  save(KEYS.FOOD_ITEMS, getFoodItems().filter(f => f.id !== id));
}

// ── Session ──────────────────────────────────────────────────
export function getSession() {
  return load(KEYS.SESSION);
}

export function setSession(sessionData) {
  save(KEYS.SESSION, sessionData);
}

export function clearSession() {
  localStorage.removeItem(KEYS.SESSION);
}

// ── 假資料 Seed（若 lf_merchants 為空自動執行）────────────────
export function seedDemoData() {
  if (getMerchants().length > 0) return;

  const today = new Date().toISOString().split('T')[0];

  const merchants = [
    {
      id: 'm_demo_01',
      name: '老王麵包坊',
      address: '高雄市前金區中正四路 56 號',
      phone: '07-2212345',
      category: '麵包店',
      username: 'wangbakery',
      passwordHash: btoa('demo1234'),
    },
    {
      id: 'm_demo_02',
      name: '阿嬤自助餐',
      address: '高雄市前金區七賢二路 88 號',
      phone: '07-2219876',
      category: '自助餐',
      username: 'grannyfood',
      passwordHash: btoa('demo1234'),
    },
    {
      id: 'm_demo_03',
      name: '前金生鮮超市',
      address: '高雄市前金區成功一路 210 號',
      phone: '07-2210001',
      category: '生鮮超市',
      username: 'fruitshop',
      passwordHash: btoa('demo1234'),
    },
    {
      id: 'm_demo_04',
      name: '幸福便利商店',
      address: '高雄市前金區市中一路 34 號',
      phone: '07-2213344',
      category: '便利商店',
      username: 'happysoy',
      passwordHash: btoa('demo1234'),
    },
    {
      id: 'm_demo_05',
      name: '金城咖啡',
      address: '高雄市前金區金城路 112 號',
      phone: '07-2215566',
      category: '咖啡飲品',
      username: 'jinchengbox',
      passwordHash: btoa('demo1234'),
    },
  ];

  const foodItems = [
    // 老王麵包坊
    { id: 'fi_d01', merchantId: 'm_demo_01', name: '法國麵包', quantity: 4, unit: '條', pickupStart: '17:00', pickupEnd: '19:00', date: today, status: 'available', offerType: 'free',     price: null, foodCategory: '麵包' },
    { id: 'fi_d02', merchantId: 'm_demo_01', name: '奶油餐包', quantity: 8, unit: '個', pickupStart: '17:30', pickupEnd: '19:00', date: today, status: 'available', offerType: 'discount', price: 15,   foodCategory: '麵包' },
    // 阿嬤自助餐
    { id: 'fi_d03', merchantId: 'm_demo_02', name: '控肉飯',   quantity: 3, unit: '份', pickupStart: '18:00', pickupEnd: '19:30', date: today, status: 'available', offerType: 'free',     price: null, foodCategory: '熟食' },
    { id: 'fi_d04', merchantId: 'm_demo_02', name: '炒青菜',   quantity: 2, unit: '份', pickupStart: '18:00', pickupEnd: '19:30', date: today, status: 'available', offerType: 'discount', price: 20,   foodCategory: '蔬菜' },
    // 前金生鮮超市
    { id: 'fi_d05', merchantId: 'm_demo_03', name: '香蕉（熟透）', quantity: 3, unit: '串', pickupStart: '16:30', pickupEnd: '18:30', date: today, status: 'available', offerType: 'discount', price: 30, foodCategory: '水果' },
    { id: 'fi_d06', merchantId: 'm_demo_03', name: '木瓜',     quantity: 2, unit: '個', pickupStart: '16:30', pickupEnd: '18:30', date: today, status: 'available', offerType: 'discount', price: 25,   foodCategory: '水果' },
    // 幸福便利商店
    { id: 'fi_d07', merchantId: 'm_demo_04', name: '關東煮',   quantity: 5, unit: '份', pickupStart: '21:00', pickupEnd: '23:00', date: today, status: 'available', offerType: 'discount', price: 39,   foodCategory: '熟食' },
    { id: 'fi_d08', merchantId: 'm_demo_04', name: '到期御飯糰', quantity: 3, unit: '個', pickupStart: '22:00', pickupEnd: '23:30', date: today, status: 'available', offerType: 'free',   price: null, foodCategory: '熟食' },
    // 金城咖啡
    { id: 'fi_d09', merchantId: 'm_demo_05', name: '拿鐵（大杯）', quantity: 2, unit: '杯', pickupStart: '18:30', pickupEnd: '20:00', date: today, status: 'available', offerType: 'discount', price: 60, foodCategory: '飲品' },
    { id: 'fi_d10', merchantId: 'm_demo_05', name: '起司蛋糕', quantity: 1, unit: '片', pickupStart: '18:30', pickupEnd: '20:00', date: today, status: 'available', offerType: 'discount', price: 45,   foodCategory: '甜點' },
  ];

  save(KEYS.MERCHANTS, merchants);
  save(KEYS.FOOD_ITEMS, foodItems);
}
