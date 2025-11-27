// 註冊 Service Worker 實現 PWA 離線功能
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker: 註冊成功'))
      .catch(err => console.error('Service Worker: 註冊失敗', err));
  });
}

// --- 請將此段代碼貼入 app.js 中 ---

// 導航按鈕功能：點擊後導航到 Google 地圖
function navigateTo(location) {
  // 構造 Google Maps 搜索 URL，使用 https:// 確保安全連線
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  window.open(mapUrl, '_blank');
}
// --- Tab Bar 分頁切換功能 ---

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // 移除所有按鈕的 active 狀態
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 隱藏所有內容
            tabContents.forEach(content => content.classList.remove('active'));

            // 激活被點擊的按鈕
            button.classList.add('active');
            // 顯示目標內容區塊
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // 預設載入時，將第一個 Tab 設為 active
    document.getElementById('daily').classList.add('active');
});
// PWA 註冊的程式碼請保持不變 (在上面或下面皆可)
// if ('serviceWorker' in navigator) { ... }
// --- 記帳功能核心邏輯 (使用 Local Storage) ---

let expenses = []; // 全域變數，儲存所有記帳紀錄

// 1. 載入紀錄：從 Local Storage 讀取數據
function loadExpenses() {
    const savedExpenses = localStorage.getItem('kyotoExpenses');
    if (savedExpenses) {
        expenses = JSON.parse(savedExpenses);
    }
    renderTable();
}

// 2. 儲存紀錄：將數據寫入 Local Storage
function saveExpenses() {
    localStorage.setItem('kyotoExpenses', JSON.stringify(expenses));
}

// 3. 渲染表格：更新 HTML 顯示
function renderTable() {
    const listBody = document.getElementById('expense-list');
    const totalElement = document.getElementById('total-expense');
    listBody.innerHTML = '';
    let total = 0;

    expenses.forEach((expense, index) => {
        const row = listBody.insertRow();
        row.insertCell(0).textContent = expense.description;
        row.insertCell(1).textContent = expense.category;
        row.insertCell(2).textContent = expense.amount;
        total += expense.amount;
    });

    totalElement.textContent = total.toLocaleString() + ' JPY';
}

// 4. 新增紀錄
function addExpense() {
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');

    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const description = descriptionInput.value || category; // 如果沒寫備註，就用類別代替

    if (isNaN(amount) || amount <= 0) {
        alert('請輸入有效的金額！');
        return;
    }

    expenses.push({ amount, category, description });
    saveExpenses();
    renderTable();

    // 清空表單
    amountInput.value = '';
    descriptionInput.value = '';
}

// 5. 清空紀錄
function clearExpenses() {
    if (confirm('確定要清除所有記帳紀錄嗎？此操作不可逆！')) {
        expenses = [];
        saveExpenses();
        renderTable();
    }
}

// 載入時執行：確保 PWA 載入時就讀取數據
window.onload = loadExpenses;

// --- 記帳功能邏輯結束 ---

