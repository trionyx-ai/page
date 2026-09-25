// ============================================================
// 點交表:挑選品項 → 產生可列印確認單 → 存紀錄 → （可選）扣庫存
// ============================================================

let hoLineItems = []; // [{itemId, name, sku, location, qty}]
let hoSearchTerm = '';

document.getElementById('ho-date').value = todayISO();

document.addEventListener('crate:items-updated', renderPickList);

document.getElementById('ho-search').addEventListener('input', (e) => {
  hoSearchTerm = e.target.value;
  renderPickList();
});

function renderPickList() {
  const term = hoSearchTerm.trim().toLowerCase();
  const list = inventoryItems.filter((it) => {
    if (!term) return true;
    return [it.name, it.sku, it.location].some((v) => (v || '').toLowerCase().includes(term));
  });

  const el = document.getElementById('ho-pick-list');
  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:24px 14px;">找不到符合的品項</div>`;
    return;
  }

  el.innerHTML = list.map((it) => `
    <div class="pick-row">
      <div class="info">
        <b>${escapeHtml(it.name)}</b>${it.nameEn ? ` <span style="color:var(--ink-soft);">/ ${escapeHtml(it.nameEn)}</span>` : ''}
        <div class="meta">${escapeHtml(it.sku || '—')} · ${escapeHtml(it.location || '未指定')} · 庫存 ${escapeHtml(it.quantity)}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="number" min="1" value="1" style="width:56px;padding:5px 6px;border:1px solid var(--line-strong);border-radius:3px;" id="qty-${it.id}">
        <button class="btn btn-sm btn-amber" data-add="${it.id}">加入</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addLineItem(btn.dataset.add));
  });
}

function addLineItem(itemId) {
  const it = inventoryItems.find((x) => x.id === itemId);
  if (!it) return;
  const qtyInput = document.getElementById(`qty-${itemId}`);
  const qty = Math.max(1, Number(qtyInput.value) || 1);

  const existing = hoLineItems.find((li) => li.itemId === itemId);
  if (existing) {
    existing.qty += qty;
  } else {
    hoLineItems.push({ itemId, name: it.name, nameEn: it.nameEn || '', sku: it.sku || '', location: it.location || '', qty });
  }
  renderLineItems();
}

function renderLineItems() {
  const el = document.getElementById('ho-line-items');
  if (hoLineItems.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:24px 14px;">尚未加入任何品項</div>`;
    return;
  }
  el.innerHTML = hoLineItems.map((li) => `
    <div class="line-item">
      <div class="info">
        <b>${escapeHtml(li.name)}</b>
        <div class="meta">數量 ${escapeHtml(li.qty)} × 位置 ${escapeHtml(li.location || '未指定')}</div>
      </div>
      <button class="x" data-remove="${li.itemId}" title="移除">✕</button>
    </div>
  `).join('');
  el.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      hoLineItems = hoLineItems.filter((li) => li.itemId !== btn.dataset.remove);
      renderLineItems();
    });
  });
}

// ---------- 產生點交表 ----------
document.getElementById('ho-generate-btn').addEventListener('click', async () => {
  const errBox = document.getElementById('ho-error');
  errBox.textContent = '';

  const customer = document.getElementById('ho-customer').value.trim();
  const contact = document.getElementById('ho-contact').value.trim();
  const date = document.getElementById('ho-date').value || todayISO();
  const deliverer = document.getElementById('ho-deliverer').value.trim();
  const notes = document.getElementById('ho-notes').value.trim();
  const deduct = document.getElementById('ho-deduct').checked;

  if (!customer) { errBox.textContent = '請填寫客戶 / 收件單位'; return; }
  if (hoLineItems.length === 0) { errBox.textContent = '請至少加入一項品項'; return; }

  if (deduct) {
    for (const li of hoLineItems) {
      const stock = inventoryItems.find((x) => x.id === li.itemId);
      if (!stock || Number(stock.quantity) < li.qty) {
        errBox.textContent = `「${li.name}」庫存不足（現有 ${stock ? stock.quantity : 0}，需要 ${li.qty}）`;
        return;
      }
    }
  }

  const btn = document.getElementById('ho-generate-btn');
  btn.disabled = true;
  btn.textContent = '產生中…';

  const docNo = 'HO-' + date.replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  const record = {
    docNo, customer, contact, date, deliverer, notes,
    items: hoLineItems.map((li) => ({ ...li })),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: currentUser ? (currentUser.displayName || currentUser.email) : null,
  };

  try {
    await db.collection('handovers').add(record);

    if (deduct) {
      const batch = db.batch();
      hoLineItems.forEach((li) => {
        const stock = inventoryItems.find((x) => x.id === li.itemId);
        const newQty = Math.max(0, Number(stock.quantity) - li.qty);
        batch.update(db.collection('items').doc(li.itemId), { quantity: newQty });
      });
      await batch.commit();
    }

    renderSheet(record);
    showToast('點交表已產生,準備列印');
    window.print();

    // 重設表單
    hoLineItems = [];
    renderLineItems();
    document.getElementById('ho-customer').value = '';
    document.getElementById('ho-contact').value = '';
    document.getElementById('ho-notes').value = '';
    document.getElementById('ho-date').value = todayISO();
  } catch (err) {
    console.error(err);
    errBox.textContent = '產生失敗:' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '產生點交表並準備列印';
  }
});

// ---------- 列印版面（全英文，客戶看的正式單據）----------
function renderSheet(record) {
  const rows = record.items.map((li) => `
    <tr>
      <td><b>${escapeHtml(li.nameEn || li.name)}</b>${li.sku ? ` <span style="color:#8C99A0;">(${escapeHtml(li.sku)})</span>` : ''}</td>
      <td style="text-align:right;">${escapeHtml(li.qty)}</td>
    </tr>
  `).join('');

  document.getElementById('sheet-render').innerHTML = `
    <div class="sheet">
      <div class="sheet-head">
        <h1>Delivery Confirmation</h1>
        <div class="doc-no">Doc No. ${escapeHtml(record.docNo)}<br>Date ${escapeHtml(record.date)}</div>
      </div>
      <div class="sheet-meta">
        <div><span>Customer</span>${escapeHtml(record.customer)}</div>
        <div><span>Contact</span>${escapeHtml(record.contact || '—')}</div>
        <div><span>Delivered By</span>${escapeHtml(record.deliverer || '—')}</div>
        <div><span>Items</span>${record.items.length}</div>
      </div>
      <table>
        <thead><tr><th>Item</th><th style="text-align:right;">Qty</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${record.notes ? `<div class="sheet-notes"><b>Notes:</b> ${escapeHtml(record.notes)}</div>` : ''}
      <div class="sheet-sign">
        <div class="line"><b>&nbsp;</b>Delivered By (Signature)</div>
        <div class="line"><b>&nbsp;</b>Received By (Signature)</div>
      </div>
    </div>
  `;
}

// ---------- 歷史紀錄 ----------
db.collection('handovers').orderBy('createdAt', 'desc').onSnapshot((snap) => {
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderHistory(records);
}, (err) => {
  console.error(err);
});

function renderHistory(records) {
  const tbody = document.getElementById('history-tbody');
  const emptyState = document.getElementById('history-empty');
  if (records.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  tbody.innerHTML = records.map((r) => `
    <tr>
      <td class="mono">${escapeHtml(r.docNo || r.id)}</td>
      <td><b>${escapeHtml(r.customer)}</b></td>
      <td class="mono">${escapeHtml(r.date)}</td>
      <td class="num">${(r.items || []).length}</td>
      <td>${escapeHtml(r.deliverer || '—')}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-view="${r.id}">查看明細</button>
          <button class="btn btn-danger btn-sm" data-delete-ho="${r.id}">刪除</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = records.find((x) => x.id === btn.dataset.view);
      if (!r) return;
      openHoDetailModal(r);
    });
  });

  tbody.querySelectorAll('[data-delete-ho]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = records.find((x) => x.id === btn.dataset.deleteHo);
      if (!r) return;
      deleteHandover(r);
    });
  });
}

async function deleteHandover(record) {
  if (!confirm(`確定要刪除「${record.customer}」（單號 ${record.docNo}）這筆點交紀錄嗎？此動作無法復原,且不會把庫存數量加回去。`)) return;
  try {
    await db.collection('handovers').doc(record.id).delete();
    showToast('已刪除點交紀錄');
  } catch (err) {
    console.error(err);
    showToast('刪除失敗:' + err.message);
  }
}

// ---------- 點交明細（網站上看，含原存放位置）----------
let hoDetailRecord = null;
const hoDetailModal = document.getElementById('ho-detail-modal');

function openHoDetailModal(record) {
  hoDetailRecord = record;
  const rows = (record.items || []).map((li) => `
    <tr>
      <td>
        <b>${escapeHtml(li.name)}</b>
        ${li.nameEn ? `<div style="font-size:11.5px;color:var(--ink-soft);">${escapeHtml(li.nameEn)}</div>` : ''}
      </td>
      <td><span class="loc-tag">${escapeHtml(li.location || '未指定')}</span></td>
      <td class="num">${escapeHtml(li.qty)}</td>
    </tr>
  `).join('');

  document.getElementById('ho-detail-body').innerHTML = `
    <div class="sheet-meta" style="margin-bottom:16px;">
      <div><span>客戶 / 收件單位</span>${escapeHtml(record.customer)}</div>
      <div><span>聯絡人</span>${escapeHtml(record.contact || '—')}</div>
      <div><span>日期</span>${escapeHtml(record.date)}</div>
      <div><span>交付人</span>${escapeHtml(record.deliverer || '—')}</div>
    </div>
    <table>
      <thead><tr><th>品名</th><th>原存放位置</th><th class="num">數量</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${record.notes ? `<div class="sheet-notes" style="margin-top:14px;"><b>備註：</b>${escapeHtml(record.notes)}</div>` : ''}
  `;
  hoDetailModal.classList.remove('hidden');
}

function closeHoDetailModal() {
  hoDetailModal.classList.add('hidden');
}

document.getElementById('ho-detail-close').addEventListener('click', closeHoDetailModal);
document.getElementById('ho-detail-cancel').addEventListener('click', closeHoDetailModal);
hoDetailModal.addEventListener('click', (e) => { if (e.target === hoDetailModal) closeHoDetailModal(); });
document.getElementById('ho-detail-print').addEventListener('click', () => {
  if (!hoDetailRecord) return;
  renderSheet(hoDetailRecord);
  window.print();
});
