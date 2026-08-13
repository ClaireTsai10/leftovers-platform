# 地圖回歸計畫 — Nominatim 自動 Geocoding + 使用者地圖介面

## Top-Level Overview

**目標**：將 Leaflet 地圖加回使用者介面（地圖在上、卡片列表在下），同時維持商家零門檻註冊——座標由系統在商家儲存地址時，自動透過 Nominatim (OpenStreetMap) API 轉換，無需商家手動輸入。

**核心設計決策**：
- 商家資料中新增 `lat`、`lng` 欄位，由 geocoding 自動填入
- 新增 `geocode.js` 模組，封裝 Nominatim API 呼叫
- Geocoding 失敗時，商家管理介面顯示警告 + 備援手動輸入欄位
- 使用者介面：地圖在上（Leaflet）、卡片列表在下，點擊卡片 flyTo 對應 Marker

**非目標**：
- 不在商家「註冊表單」中加入座標欄位（門檻極低原則不變）
- 不使用付費地圖 API
- Nominatim 速率限制（1 req/sec）在黑客松 Demo 規模下可接受，不做排程處理

---

## 受影響檔案

| 檔案 | 變更類型 | 說明 |
|---|---|---|
| `js/geocode.js` | 新增 | Nominatim geocoding 封裝模組 |
| `js/storage.js` | 修改 | seed 假資料補上 lat/lng；saveMerchant 不動（欄位直接存入） |
| `js/merchant-view.js` | 修改 | 商家編輯 Modal 加入 geocoding 觸發邏輯 + 備援手動輸入欄位 |
| `js/user-view.js` | 修改 | 加回地圖區塊（在上）+ 卡片列表（在下）+ 點擊 flyTo |
| `js/map.js` | 不動 | 現有 initMap / renderMarkers / flyToMerchant 邏輯不需改動 |
| `style.css` | 微調 | 確認 #map 高度設定 |

---

## Milestone 子任務

---

### T1 — 新增 geocode.js 模組

**Intent**：封裝 Nominatim API，提供可獨立測試的 geocoding 函式，讓其他模組只需呼叫 `geocodeAddress(address)` 即可取得座標。

**Expected Outcomes**：
- `geocodeAddress(address)` 回傳 `{ lat, lng }` 或 `null`
- 帶入「高雄市前金區中正四路 56 號」能取得合理座標
- 包含 timeout 保護（5 秒）與錯誤靜默處理

**Todo List**：
1. 建立 `js/geocode.js`
2. 實作 `geocodeAddress(address)`：
   - 呼叫 `https://nominatim.openstreetmap.org/search?format=json&limit=1&q={address}`
   - 加入 `User-Agent` header（Nominatim 要求）
   - 回傳第一筆結果的 `{ lat: parseFloat(lat), lng: parseFloat(lon) }`
   - 任何錯誤（網路、空結果、timeout）回傳 `null`

**Relevant Context**：
- Nominatim 端點：`https://nominatim.openstreetmap.org/search`
- 必要 query params：`format=json`, `limit=1`, `q=<地址>`
- Nominatim 使用政策要求加 `User-Agent` header

**Status**: [ ] pending

---

### T2 — 商家管理：儲存地址時自動 geocoding + 備援手動輸入

**Intent**：讓商家在「編輯商家資料」儲存地址時，自動觸發 geocoding 取得 lat/lng；若失敗，顯示警告並提供備援手動輸入欄位，確保商家仍可在地圖上顯示。

**Expected Outcomes**：
- 商家儲存地址後，系統自動呼叫 geocoding，成功則寫入 lat/lng
- 失敗時，商家管理介面出現橘色警告 + 手動輸入 lat/lng 欄位
- 商家資訊卡片改顯示定位狀態（✅ 已定位 / ⚠️ 定位失敗）

**Todo List**：
1. 在 `merchant-view.js` 的商家編輯 Modal submit handler 中，儲存後非同步呼叫 `geocodeAddress(address)`
2. 若 geocoding 成功：呼叫 `saveMerchant({ ...updated, lat, lng })`，Toast 顯示「地址定位成功 📍」
3. 若 geocoding 失敗：顯示橘色警告區塊，內含手動輸入 lat/lng 的 input，讓商家可自行貼上座標後再次儲存
4. 商家資訊卡片的「座標狀態」改為：已定位（綠色 ✅）或 待定位（橘色 ⚠️）
5. 為 seed 假資料中的 5 間商家補上正確 lat/lng（在 `storage.js` 直接填入，無需 API 呼叫）

**Relevant Context**：
- `geocodeAddress` 是 async 函式，submit handler 需改為 async
- 手動備援欄位只在 geocoding 失敗後出現，不預設顯示（維持極低門檻）
- geocoding 期間在 Toast 顯示「正在定位地址…」loading 提示

**Status**: [ ] pending

---

### T3 — 使用者介面：加回地圖（上）+ 卡片列表（下）+ 點擊 flyTo

**Intent**：在使用者介面頂部放置 Leaflet 地圖，底部保留卡片列表與進階篩選，點擊卡片時地圖 flyTo 對應商家 Marker。

**Expected Outcomes**：
- 使用者介面上半為 Leaflet 地圖（360px 高），下半為進階篩選 + 卡片列表
- 有座標的商家顯示橘色 Marker；Popup 顯示店名、可領取物資摘要
- 點擊卡片後地圖 flyTo 該商家，卡片 highlighted（橘色邊框）
- 無座標商家只顯示在卡片列表，不出現在地圖上

**Todo List**：
1. 在 `user-view.js` 的 HTML 結構中，在篩選面板之前加入 `<div id="map">` 容器
2. import `initMap`, `renderMarkers`, `flyToMerchant` from `./map.js`
3. `initUserView` 中以 `setTimeout(..., 50)` 延遲初始化地圖（確保容器已渲染）
4. `refreshUserView` 中同步呼叫 `renderMarkers(allMerchants, allItems)`
5. 卡片點擊事件：呼叫 `flyToMerchant(merchantId)`，並 highlight 卡片（加 `highlighted` class）

**Relevant Context**：
- `map.js` 的 `renderMarkers` 已處理「無座標跳過」邏輯，不需修改
- `style.css` 中 `#map { height: 360px }` 已存在，確認即可
- `flyToMerchant` 已有 `mapInstance` 為 null 時的保護，安全呼叫

**Status**: [ ] pending

---

## 整合注意事項

- **T1 必須先完成**，T2 才能 import `geocodeAddress`
- **T2 必須先完成**（seed 假資料補座標），T3 地圖才有 Marker 可顯示
- Nominatim 在 localhost 開發時可正常呼叫，不需 CORS proxy
- 地圖容器 `#map` 必須在 DOM 渲染後才能 `initMap()`，`setTimeout` 50ms 是必要的
