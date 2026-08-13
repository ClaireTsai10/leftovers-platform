# 剩食平台開發計畫 — 高雄前金區社區商家剩食對接平台

## Top-Level Overview

**目標**：一天內開發出純前端 SPA，讓高雄市前金區社區商家（麵包店、自助餐等）能在打烊前發佈剩食資訊，讓學生與弱勢家庭即時瀏覽、領取。

**技術棧**：
- HTML5 + Tailwind CSS CDN（切版快，不需 build 流程）
- 原生 JavaScript（ES6 模組）
- Leaflet.js + OpenStreetMap（使用者端地圖標記）
- localStorage（模擬後端資料庫，無需真實 API）

**架構決策**：
- 單頁應用（SPA），以 `app.js` 控制 view 切換，不跳頁
- 資料層統一由 `storage.js` 抽象，其餘模組只呼叫 storage API
- 認證以 localStorage session 模擬，密碼做簡易 hash（非安全等級，僅 Demo 用）

**非目標**：
- 不接真實後端、不部署資料庫
- 不處理真實金流或身份驗證
- 不支援手機 GPS 定位（地址手動輸入，座標手動填入或由地址推算）

---

## 檔案架構

```
/
├── index.html              # 唯一 HTML 入口，包含三個 view 容器
├── style.css               # 少量自訂 CSS（Tailwind 覆蓋不到的部分）
└── js/
    ├── app.js              # 路由控制器，管理 view 切換與初始化
    ├── storage.js          # localStorage 抽象層（CRUD helper）
    ├── auth.js             # 登入 / 登出 / 註冊邏輯
    ├── merchant-view.js    # 商家管理介面（含 CRUD 表單）
    ├── user-view.js        # 使用者瀏覽介面（卡片列表 + 地圖）
    └── map.js              # Leaflet 地圖初始化與標記管理
```

---

## localStorage 資料結構

### `lf_merchants`（陣列）
```json
[
  {
    "id": "m_1720000000000",
    "name": "老王麵包坊",
    "address": "高雄市前金區中正四路 100 號",
    "lat": 22.6273,
    "lng": 120.3014,
    "phone": "07-2345678",
    "category": "麵包甜點",
    "username": "wangbakery",
    "passwordHash": "abc123hashed"
  }
]
```

### `lf_food_items`（陣列）
```json
[
  {
    "id": "fi_1720000000001",
    "merchantId": "m_1720000000000",
    "name": "法國麵包",
    "quantity": 5,
    "unit": "條",
    "pickupStart": "17:00",
    "pickupEnd": "19:00",
    "date": "2024-07-04",
    "status": "available"
  }
]
```
> `status` 可為 `"available"` | `"claimed"` | `"expired"`

### `lf_session`（物件）
```json
{
  "merchantId": "m_1720000000000",
  "username": "wangbakery"
}
```
> 存在即視為已登入，登出時清除此 key。

---

## 跨組平行任務

### 視覺設計組（可立即開始）
1. 設計 Logo 與品牌色票（建議暖橘 + 米白，傳遞「溫暖惜食」感）
2. 設計剩食卡片 UI（需包含：店名、品項、數量、領取時間、距離標籤）
3. 設計商家管理介面的表單版型（新增/編輯剩食物品的 Modal 設計）
4. 設計導覽列與頁首（含 Logo、登入/登出按鈕、切換 view 的 Tab）
5. 設計空狀態插圖（無剩食時的友善提示畫面）

### 內容研究組（可立即開始）
1. 收集前金區真實商家清單（名稱、地址、Google Maps 座標），至少 5–8 間
2. 確認各店家常見剩食品類（麵包、便當、水果等）與慣用單位（個/份/盒）
3. 研究目標用戶（學生、弱勢家庭）的主要領取時段與習慣
4. 撰寫首頁說明文案（平台介紹、使用步驟，20 字以內的 slogan）
5. 準備假資料腳本（8 間商家、每間 2–3 筆剩食物品）供開發測試用

---

## Milestone 子任務

---

### M1 — 版面骨架與 SPA 框架

**Intent**：建立所有 HTML 容器骨架、引入 CDN、實作 view 切換機制，讓後續模組有地方掛載。

**Expected Outcomes**：
- `index.html` 可在瀏覽器開啟，三個 view（auth / merchant / user）可透過 JS 切換顯示
- Tailwind CSS 與 Leaflet.js CDN 正確載入
- `app.js` 能根據 localStorage session 決定初始顯示哪個 view

**Todo List**：
1. 建立 `index.html`，引入 Tailwind CDN、Leaflet CSS/JS CDN
2. 在 `<body>` 中建立三個 `<section>` 容器：`#view-auth`、`#view-merchant`、`#view-user`
3. 撰寫 `js/app.js`，實作 `showView(viewName)` 函式控制顯示/隱藏
4. `app.js` 在 DOMContentLoaded 時讀取 `lf_session`，決定初始 view
5. 加入導覽列（含平台名稱、登出按鈕）

**Relevant Context**：
- view 切換、Toast、Modal 統一在 `utils.js` 以避免循環依賴
- Leaflet CDN：`https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
- Tailwind CDN：`https://cdn.tailwindcss.com`

**Status**: [x] done

---

### M2 — 資料層 + 商家認證

**Intent**：建立統一的 localStorage 存取介面，並實作商家帳號註冊與登入，讓 M3 的 CRUD 有資料基礎。

**Expected Outcomes**：
- `storage.js` 提供 `getMerchants()`、`saveMerchant()`、`getFoodItems()`、`saveFoodItem()`、`deleteFoodItem()`、`getSession()`、`setSession()`、`clearSession()` 等函式
- 商家可完成「註冊帳號 → 登入 → 跳至管理介面」流程
- 登出後清除 session，回到登入頁

**Todo List**：
1. 撰寫 `js/storage.js`，所有函式操作 `lf_*` key，統一處理 JSON 序列化
2. 撰寫 `js/auth.js`，實作 `login(username, password)`、`logout()`、`register(merchantData)` 
3. 密碼儲存使用簡易 hash（`btoa()` 或自訂 XOR，Demo 等級即可）
4. 在 `#view-auth` 中建立登入表單與商家註冊表單（Tab 切換）
5. 登入成功呼叫 `app.js` 的 `showView('merchant')`，登出呼叫 `showView('auth')`
6. 載入預設假資料（若 `lf_merchants` 為空，自動 seed 假資料）

**Relevant Context**：
- 假資料腳本由「內容研究組」提供（參考上方跨組任務）
- `storage.js` 是唯一允許直接呼叫 `localStorage` 的模組

**Status**: [x] done

---

### M3 — 商家管理 CRUD 介面

**Intent**：讓已登入商家能完整管理自己的剩食物品（新增、修改、刪除、查看），這是平台的供給端核心功能。

**Expected Outcomes**：
- 商家管理頁顯示該商家目前所有剩食物品的列表
- 可透過 Modal 表單新增物品（品名、數量、單位、領取起迄時間）
- 可編輯與刪除各筆物品
- 所有操作即時反映在畫面與 localStorage

**Todo List**：
1. 撰寫 `js/merchant-view.js`，在 `#view-merchant` 渲染物品列表
2. 實作「新增物品」按鈕，點擊開啟 Modal 表單
3. Modal 表單欄位：品名（text）、數量（number）、單位（select：個/份/盒/條）、領取開始/結束時間（time input）
4. 表單送出呼叫 `storage.saveFoodItem()`，寫入 `lf_food_items`，關閉 Modal 並重繪列表
5. 每筆物品卡片提供「編輯」按鈕（預填表單重開 Modal）與「刪除」按鈕（確認後呼叫 `storage.deleteFoodItem()`）
6. 商家資料編輯功能（地址、電話、座標），以獨立的 section 呈現

**Relevant Context**：
- `merchantId` 從 `storage.getSession().merchantId` 取得，篩選只屬於該商家的物品
- Modal 使用 Tailwind 的 `fixed inset-0 bg-black/50` 遮罩實作

**Status**: [x] done

---

### M4 — 使用者地圖瀏覽介面

**Intent**：讓使用者（學生/弱勢家庭）能快速看到附近有剩食的商家，並查看各商家的物品清單，這是平台的需求端核心功能。

**Expected Outcomes**：
- Leaflet 地圖顯示，預設中心設在高雄市前金區（`lat: 22.6273, lng: 120.3014`）
- 每間有剩食的商家在地圖上有一個標記（Marker），點擊彈出簡介
- 地圖下方（或側邊）有卡片列表，顯示所有可領取的剩食，支援關鍵字搜尋
- 每張卡片顯示：店名、品項名稱、數量、領取時間

**Todo List**：
1. 撰寫 `js/map.js`，`initMap()` 初始化 Leaflet 地圖並掛載到 `#map` 容器
2. `renderMarkers(merchants, foodItems)` 函式：對每間有 `status: "available"` 物品的商家建立 Marker，Popup 顯示店名與物品摘要
3. 撰寫 `js/user-view.js`，從 storage 讀取所有 available 物品，渲染為卡片列表
4. 實作關鍵字搜尋 input，即時 filter 卡片（匹配店名或品項名稱）
5. 點擊卡片時，地圖 fly to 該商家座標並開啟對應 Marker 的 Popup
6. 加入「類別篩選」Tag（麵包甜點 / 便當熟食 / 蔬果 / 其他）

**Relevant Context**：
- Leaflet Marker 需搭配商家的 `lat`、`lng` 欄位
- 若商家未填座標（lat/lng 為 null），在卡片列表顯示但不加地圖標記

**Status**: [x] done

---

## 整合注意事項

- **假資料 seed**：M2 完成後務必確認假資料可正確 seed 進 localStorage，M4 才能有地圖標記可測試
- **模組間溝通**：所有模組只透過 `storage.js` 讀寫資料，禁止直接呼叫 `localStorage`（避免 key 名衝突）
- **視覺一致性**：Tailwind class 使用 `orange-500` 作為主色，`stone-50` 作為背景，維持暖色調
- **跨組交付物**：視覺設計組的設計稿與內容研究組的假資料，最晚在 M2 完成前交付，供 M3/M4 使用
