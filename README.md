# 倉記 Crate — 庫存管理系統

純前端網頁（HTML/CSS/JS，免 build 工具），資料儲存在 Firebase Firestore（免費額度足夠小團隊使用）。
登入用**寫死在程式碼裡的 3 組固定帳號**，不需要 Firebase Authentication，設定最簡單。
功能：庫存新增編輯刪除（含存放位置）、依客戶產生「點交表」並列印/存 PDF、點交歷史紀錄。

---

## 第一步：建立 Firebase 專案（只需要 Firestore，約 3 分鐘）

1. 前往 https://console.firebase.google.com/ ，用 Google 帳號登入，新增專案
2. 左側選單進入 **Build → Firestore Database** → 「建立資料庫」→ 選「以正式版模式啟動」→ 選一個離你近的地區 → 完成
3. 點 Firestore 左上「規則 Rules」分頁，把內容換成：

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

   ⚠️ 注意：因為這個版本沒有用 Firebase Authentication，這條規則等於「任何人只要拿到你的
   Firestore 網址都能讀寫資料」。只適合內部使用、資料不敏感的情況。如果之後想要更嚴謹的權限
   控管，可以再加回 Firebase Authentication（跟我說一聲，我可以幫你改回去）。

4. 回到專案總覽頁（左上齒輪 → 專案設定），往下捲到「你的應用程式」，點 `</>` 圖示註冊網頁應用程式，
   拿到 `firebaseConfig` 設定（這個專案已經幫你填好 `assets/firebase-config.js` 了，通常不用再動）

---

## 第二步：設定帳號密碼

打開 `assets/auth.js`，最上面有這一段：

```js
const ACCOUNTS = [
  { username: 'admin',  password: 'admin123',  displayName: '管理員' },
  { username: 'staff1', password: 'staff123',  displayName: '員工一' },
  { username: 'staff2', password: 'staff456',  displayName: '員工二' },
];
```

把 `username` / `password` / `displayName` 改成你要的帳號密碼就好，可以加更多組，
或刪減成兩組、四組都行。

---

## 第三步：本機測試（選用）

```
cd inventory-app
python3 -m http.server 8000
```

瀏覽器開 `http://localhost:8000`，用剛剛設定好的帳號密碼登入。

---

## 第四步：放到 GitHub Pages

1. 在 GitHub 建立一個新的 repository（例如 `crate-inventory`），設為 Public
2. push 上去：

   ```
   cd inventory-app
   git init
   git add .
   git commit -m "初始化庫存管理系統"
   git branch -M main
   git remote add origin https://github.com/你的帳號/crate-inventory.git
   git push -u origin main
   ```

3. GitHub repo 頁面 → **Settings → Pages** → Source 選 `main` branch、資料夾選 `/ (root)` → Save
4. 等 1-2 分鐘，頁面會出現網址：`https://你的帳號.github.io/crate-inventory/`

這個版本不需要在 Firebase 設定「Authorized domains」，因為沒有用 Firebase Authentication。

---

## 檔案結構

```
inventory-app/
├── index.html            登入頁
├── dashboard.html         主控台（庫存管理 / 點交表 / 歷史紀錄）
├── assets/
│   ├── style.css           版面樣式
│   ├── firebase-config.js  Firebase 專案設定（連 Firestore 用）
│   ├── auth.js              登入邏輯 + 3 組固定帳號設定
│   ├── app.js                主控台共用邏輯（登入檢查、分頁切換、登出）
│   ├── inventory.js          庫存 CRUD
│   └── handover.js           點交表建立、列印、歷史紀錄
└── README.md
```
