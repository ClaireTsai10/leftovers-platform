# 移除 Geocoding、恢復手動座標輸入計畫

## Top-Level Overview

**目標**：完全移除 Nominatim geocoding 邏輯，在商家「註冊」與「編輯資料」表單中明確恢復 lat/lng 輸入欄位，地圖 Marker 直接讀取 localStorage 中的 lat/lng 欄位。

**原則**：最小變更，只改動與 geocoding 直接相關的部分，Leaflet 地圖、卡片篩選、CRUD 全部保留。

---

## localStorage 資料格式確認

### `lf_merchants`（Array）
```json
[
  {
    "id": "m_demo_01",
    "name": "老王麵包坊",
    "address": "高雄市前金區中正四路 56 號",
    "phone": "07-2212345",
    "category": "麵包店",
    "username": "wangbakery",
    "passwordHash": "ZGVtbzEyMzQ=",
    "lat": 22.6299,
    "lng": 120.3017
  }
]
```
> `lat` 與 `lng` 為獨立 number 欄位。商家未填時為 `null`，地圖不顯示 Marker 但仍可出現在卡片列表。

---

## 受影響檔案

| 檔案 | 動作 |
|---|---|
| `js/geocode.js` | **刪除**（整個移除） |
| `js/auth.js` | 修改：`register()` 加回 lat/lng；註冊表單加回兩個 input；submit handler 加回讀取 |
| `js/merchant-view.js` | 修改：移除 `geocodeAddress` import 與所有 geocoding 邏輯；商家編輯 Modal 備援欄位改為常態顯示；資訊卡移除 geocoding 狀態文字 |
| `js/storage.js` | 不動（seed 已有 lat/lng） |
| `js/map.js` | 不動（直接讀取 lat/lng，邏輯正確） |
| `js/user-view.js` | 不動（地圖與卡片邏輯正確） |

---

## 子任務

### T1 — 刪除 geocode.js

**Intent**：移除不再使用的 Nominatim API 封裝，避免留下無用程式碼。

**Expected Outcomes**：
- `js/geocode.js` 不存在
- 沒有任何其他模組 import 它

**Todo List**：
1. 刪除 `js/geocode.js`
2. 確認 `merchant-view.js` 中的 `import { geocodeAddress }` 行已移除

**Status**: [ ] pending

---

### T2 — auth.js：註冊表單加回 lat/lng

**Intent**：讓新商家在註冊時即可填寫座標，首次儲存就能在地圖上顯示。

**Expected Outcomes**：
- 註冊表單出現緯度、經度兩個 number input（`reg-lat`、`reg-lng`）
- `register()` 函式接收並儲存 lat/lng
- submit handler 讀取這兩個欄位

**Todo List**：
1. `register()` 函式的 `newMerchant` 加入 `lat: parseFloat(data.lat) || null`、`lng: parseFloat(data.lng) || null`
2. 註冊表單 HTML 在地址欄位後加入緯度/經度 input（佔各半寬的 grid，與電話/類別同排）
3. submit handler 在 `data` 物件中加入 `lat` 與 `lng` 欄位的讀取

**Relevant Context**：
- input id：`reg-lat`（緯度）、`reg-lng`（經度），type=number，step=any，非必填
- 置於電話與類別欄位之前，地址之後

**Status**: [ ] pending

---

### T3 — merchant-view.js：移除 geocoding、恢復常態 lat/lng 欄位

**Intent**：移除所有 geocoding 相關程式碼，將隱藏備援座標欄位改為在商家編輯 Modal 中常態顯示，讓商家可隨時修改座標。

**Expected Outcomes**：
- `merchant-view.js` 不再 import `geocodeAddress`
- 商家編輯 Modal submit handler 為同步函式（移除 async/await）
- 商家編輯 Modal 中 lat/lng 為常態顯示欄位（非 hidden，無警告框）
- 商家資訊卡移除 geocoding 狀態提示，改為簡單的座標有無提示

**Todo List**：
1. 移除 `import { geocodeAddress } from './geocode.js'` 這行
2. 商家編輯 Modal HTML：移除 `#geo-fallback` 區塊（含橘色警告框），改為常態的 lat/lng grid
3. submit handler：改回同步、移除所有 geocoding 呼叫，直接讀取 lat/lng input 儲存
4. 商家資訊卡：移除 `geoStatus` 變數與 `<p>${geoStatus}</p>`，改為簡單的座標顯示

**Status**: [ ] pending

---

## 整合注意事項

- T1 必須與 T3 同步完成，避免 import 找不到模組導致頁面崩潰
- `map.js` 的 `renderMarkers` 已有「無 lat/lng 則跳過 Marker」的保護邏輯，不需修改
- seed 假資料 5 間商家的 lat/lng 已存在 `storage.js`，首次開啟即顯示地圖標記
