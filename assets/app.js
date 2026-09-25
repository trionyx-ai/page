// ============================================================
// 主控台共用邏輯：登入檢查（讀 localStorage）、分頁切換、登出、小工具
//
// 注意：currentUser 在這裡用 let 宣告在最外層，dashboard.html 裡
// 接下來載入的 inventory.js / handover.js 可以直接讀到這個變數 ——
// 因為 <script src="..."> 標籤是照順序「完整執行完一個才會執行下一個」，
// 不需要用事件或 setTimeout 去等，那樣反而在網路比較慢時會出現「有時候
// 要重新整理才看得到資料」的問題。
// ============================================================

let currentUser = null;

const session = localStorage.getItem('crate_session');
if (!session) {
  window.location.href = 'index.html';
} else {
  currentUser = JSON.parse(session);
  document.getElementById('who-email').textContent = currentUser.displayName;
  const delivererField = document.getElementById('ho-deliverer');
  if (delivererField && !delivererField.value) {
    delivererField.value = currentUser.displayName;
  }
}

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('crate_session');
  window.location.href = 'index.html';
});

// ---------- 分頁切換 ----------
const navButtons = document.querySelectorAll('.nav-btn');
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    navButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
    document.getElementById('view-' + btn.dataset.view).classList.remove('hidden');
    document.getElementById('app-shell').classList.remove('nav-open');
  });
});

const mobileToggle = document.getElementById('mobile-nav-toggle');
if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
    document.getElementById('app-shell').classList.toggle('nav-open');
  });
}

// ---------- Toast ----------
function showToast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ---------- 共用工具 ----------
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
