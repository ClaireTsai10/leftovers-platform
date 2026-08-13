/**
 * map.js — Leaflet 地圖模組
 * 初始化地圖、渲染商家 Marker、提供 flyTo 操作
 */

// 預設中心：高雄市前金區
const DEFAULT_CENTER = [22.6273, 120.3014];
const DEFAULT_ZOOM   = 15;

let mapInstance  = null;
const markerMap  = {}; // merchantId => Leaflet Marker

export function initMap(containerId = 'map') {
  // 若已初始化則先清除（view 重新顯示時避免重複）
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapInstance = L.map(containerId, {
    center: DEFAULT_CENTER,
    zoom:   DEFAULT_ZOOM,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapInstance);

  return mapInstance;
}

/**
 * 渲染所有有剩食商家的 Marker
 * @param {Array} merchants — 商家陣列
 * @param {Array} foodItems — available 狀態的剩食陣列
 */
export function renderMarkers(merchants, foodItems) {
  if (!mapInstance) return;

  // 清除舊有 markers
  Object.values(markerMap).forEach(m => m.remove());
  Object.keys(markerMap).forEach(k => delete markerMap[k]);

  // 以 merchantId 分組剩食
  const itemsByMerchant = {};
  foodItems.forEach(item => {
    if (!itemsByMerchant[item.merchantId]) itemsByMerchant[item.merchantId] = [];
    itemsByMerchant[item.merchantId].push(item);
  });

  merchants.forEach(merchant => {
    const items = itemsByMerchant[merchant.id];
    if (!items || items.length === 0) return; // 無剩食則不標記
    if (!merchant.lat || !merchant.lng) return; // 無座標則跳過

    const marker = L.marker([merchant.lat, merchant.lng], {
      icon: createCustomIcon(),
    }).addTo(mapInstance);

    const itemsHtml = items.slice(0, 3).map(f =>
      `<li>• ${escHtml(f.name)} ${f.quantity}${escHtml(f.unit)}
       <span style="color:#888;font-size:11px">（${f.pickupStart}–${f.pickupEnd}）</span></li>`
    ).join('');
    const moreText = items.length > 3 ? `<li style="color:#888">…等 ${items.length} 項</li>` : '';

    marker.bindPopup(`
      <div style="min-width:160px;font-family:system-ui,sans-serif">
        <strong style="font-size:14px">${escHtml(merchant.name)}</strong>
        <span style="font-size:11px;color:#888;margin-left:6px">${escHtml(merchant.category)}</span>
        <ul style="margin:6px 0 0;padding:0;list-style:none;font-size:12px;line-height:1.7">
          ${itemsHtml}${moreText}
        </ul>
        <p style="font-size:11px;color:#aaa;margin-top:4px">📍 ${escHtml(merchant.address)}</p>
      </div>
    `);

    markerMap[merchant.id] = marker;
  });
}

/**
 * 飛到指定商家座標並開啟 Popup
 * @param {string} merchantId
 */
export function flyToMerchant(merchantId) {
  const marker = markerMap[merchantId];
  if (!marker || !mapInstance) return;
  mapInstance.flyTo(marker.getLatLng(), 17, { duration: 0.8 });
  setTimeout(() => marker.openPopup(), 900);
}

// ── 自訂 Marker 圖示（橘色圓點）────────────────────────────────
function createCustomIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      background:#f97316;border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.25);
      transform:rotate(-45deg);
    "></div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 30],
    popupAnchor:[0, -32],
  });
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
