// ============================================================
// 登入邏輯 — 固定 3 組帳號（寫死在這個檔案裡，不用 Firebase Auth）
//
// 想改帳號密碼或姓名，直接改下面 ACCOUNTS 這個陣列即可。
// 注意：這種方式帳密是明文寫在網頁程式碼裡，任何人打開瀏覽器
// 「檢視原始碼」都看得到，只適合內部小團隊、資料不算機密的情況。
// ============================================================

const ACCOUNTS = [
  { username: 'admin',  password: 'admin123',  displayName: '管理員' },
  { username: 'staff1', password: 'staff123',  displayName: '員工一' },
  { username: 'staff2', password: 'staff456',  displayName: '員工二' },
];

const loginForm = document.getElementById('login-form');

// 若已經登入過，直接跳到主控台
if (localStorage.getItem('crate_session')) {
  window.location.href = 'dashboard.html';
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const errBox = document.getElementById('login-error');
  errBox.textContent = '';

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  const account = ACCOUNTS.find((a) => a.username === username && a.password === password);
  if (!account) {
    errBox.textContent = '帳號或密碼不正確';
    return;
  }

  localStorage.setItem('crate_session', JSON.stringify({
    username: account.username,
    displayName: account.displayName,
  }));
  window.location.href = 'dashboard.html';
});
