// =============================================================
// 1. 核心功能: 地圖導航
// =============================================================

function navigateTo(location) {
    // 修正：使用正確的模板字面值語法 ${...}，確保導航功能正常
    // 這會導向 Google Maps 搜尋該地點
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, '_blank');
}


// =============================================================
// 2. Tab Bar 分頁切換功能 與 頁面初始化
// =============================================================

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
    
    // 綁定匯率輸入事件
    const jpyInput = document.getElementById('jpyAmount');
    if (jpyInput) {
        jpyInput.addEventListener('input', convertCurrency);
    }

    // 載入所有本地儲存數據
    loadExpenses();
    loadRate();
    
    // 【新增功能 1：自動設定日期】
    const dateInput = document.getElementById('expenseDate');
    if (dateInput) {
        dateInput.value = getTodayDateString();
    }
});


// =============================================================
// 3. 匯率換算器功能 (使用 Local Storage)
// =============================================================

const DEFAULT_RATE = 0.22; 

// 載入並顯示已儲存的匯率
function loadRate() {
    const savedRate = localStorage.getItem('exchangeRate');
    const rateInput = document.getElementById('exchangeRate');
    if (rateInput) {
        rateInput.value = savedRate || DEFAULT_RATE;
    }
}

// 儲存匯率到 Local Storage
function saveRate() {
    const rateInput = document.getElementById('exchangeRate');
    const rate = parseFloat(rateInput.value);
    
    if (isNaN(rate) || rate <= 0) {
        alert('請輸入有效的匯率！');
        rateInput.value = DEFAULT_RATE;
        return;
    }
    
    localStorage.setItem('exchangeRate', rate);
    convertCurrency(); // 儲存後立即重新計算
    alert(`匯率已更新並儲存：1 JPY = ${rate} TWD`);
}

// 執行換算
function convertCurrency() {
    const jpyAmountInput = document.getElementById('jpyAmount');
    const twdResultElement = document.getElementById('twdResult');
    const rate = parseFloat(localStorage.getItem('exchangeRate')) || DEFAULT_RATE;
    
    // 如果輸入框不存在或內容為空，則設為 0
    const jpy = parseFloat(jpyAmountInput ? jpyAmountInput.value : 0) || 0;
    
    const twd = jpy * rate;
    
    if (twdResultElement) {
        // 使用 toLocaleString() 增加千位分隔符，並保留兩位小數
        twdResultElement.textContent = twd.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
}


// =============================================================
// 4. 記帳功能核心邏輯 (使用 Local Storage 與日期彙總)
// =============================================================

let expenses = []; 

// 取得今天的日期 (YYYY-MM-DD)
function getTodayDateString() {
    const today = new Date();
    // month + 1 是因為 getMonth() 是從 0 開始 (0=1月)
    return today.getFullYear() + '-' + 
           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
           String(today.getDate()).padStart(2, '0');
}

// 載入紀錄：從 Local Storage 讀取數據
function loadExpenses() {
    const savedExpenses = localStorage.getItem('kyotoExpenses');
    if (savedExpenses) {
        try {
            expenses = JSON.parse(savedExpenses);
        } catch(e) {
            console.error("Error parsing expenses from localStorage", e);
            expenses = [];
        }
    }
    renderTable();
    renderDailySummary(); 
}

// 儲存紀錄：將數據寫入 Local Storage
function saveExpenses() {
    localStorage.setItem('kyotoExpenses', JSON.stringify(expenses));
}

// 【新增功能 2：單筆刪除紀錄】
function deleteExpense(index) {
    // 檢查索引是否有效
    if (index >= 0 && index < expenses.length) {
        // 為了讓使用者體驗更好，顯示被刪除的項目資訊
        const deletedItem = expenses[index];
        if (confirm(`確定要刪除這筆花費嗎？\n項目：${deletedItem.description}\n金額：${deletedItem.amount.toLocaleString()} JPY`)) {
            // 從 expenses 陣列中移除指定索引的項目
            expenses.splice(index, 1);
            saveExpenses();
            renderTable();
            renderDailySummary(); 
        }
    } else {
         console.error("Invalid index for deletion:", index);
    }
}

// 渲染明細表格：更新 HTML 顯示
function renderTable() {
    const listBody = document.getElementById('expense-list');
    const totalElement = document.getElementById('total-expense');
    listBody.innerHTML = '';
    let total = 0;

    // 將紀錄依日期降冪排序 (新紀錄在前)
    // 注意：這裡使用 filter/map 實現排序，然後再遍歷原始陣列獲取索引，
    // 但為保持簡單和功能正確性，我們只渲染原始陣列 (未排序)，並利用其索引刪除。
    
    expenses.forEach((expense, index) => { // <-- 這裡會用到 index
        const row = listBody.insertRow();
        row.insertCell(0).textContent = expense.date; 
        row.insertCell(1).textContent = expense.description;
        row.insertCell(2).textContent = expense.category;
        
        // 金額欄位
        row.insertCell(3).textContent = expense.amount.toLocaleString();
        
        // 操作欄位 (刪除按鈕)
        const actionCell = row.insertCell(4);
        actionCell.innerHTML = `<button onclick="deleteExpense(${index})" class="delete-btn">刪除</button>`;
        
        total += expense.amount;
    });

    totalElement.textContent = total.toLocaleString() + ' JPY';
}

// 新增紀錄
function addExpense() {
    const dateInput = document.getElementById('expenseDate');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');

    const date = dateInput.value || getTodayDateString(); 
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const description = descriptionInput.value || category; 

    if (isNaN(amount) || amount <= 0) {
        alert('請輸入有效的金額！');
        return;
    }

    expenses.push({ date, amount, category, description });
    saveExpenses();
    renderTable();
    renderDailySummary(); 

    // 清空金額和備註，日期保持今日日期
    amountInput.value = '';
    descriptionInput.value = '';
    // dateInput.value = getTodayDateString(); // 日期保持不動，方便連續記錄
}

// 清空紀錄
function clearExpenses() {
    if (confirm('確定要清除所有記帳紀錄嗎？此操作不可逆！')) {
        expenses = [];
        saveExpenses();
        renderTable();
        renderDailySummary(); 
    }
}

// 計算每日花費總結
function calculateDailySummary() {
    const summary = {};
    
    // 依日期和類別分組並加總
    expenses.forEach(expense => {
        const date = expense.date;
        const category = expense.category;
        
        if (!summary[date]) {
            summary[date] = { total: 0, categories: {} };
        }
        
        if (!summary[date].categories[category]) {
            summary[date].categories[category] = 0;
        }
        
        summary[date].categories[category] += expense.amount;
        summary[date].total += expense.amount;
    });
    
    // 依日期降冪排序 (新紀錄在前)
    const sortedDates = Object.keys(summary).sort().reverse();
    
    return { sortedDates, summary };
}

// 渲染每日花費總結表格
function renderDailySummary() {
    const reportDiv = document.getElementById('daily-summary-report');
    if (!reportDiv) return; 

    const { sortedDates, summary } = calculateDailySummary();
    
    if (sortedDates.length === 0) {
        reportDiv.innerHTML = '<p style="text-align: center; color: #888;">尚無紀錄，請先新增花費。</p>';
        return;
    }
    
    let html = '';
    
    sortedDates.forEach(date => {
        const daySummary = summary[date];
        
        html += `<div class="day-summary-card">`;
        html += `<h3>${date} <span class="total-badge">${daySummary.total.toLocaleString()} JPY</span></h3>`;
        html += `<table class="summary-table">`;
        
        const categories = Object.keys(daySummary.categories).sort();
        
        categories.forEach(category => {
            const amount = daySummary.categories[category];
            html += `<tr>`;
            html += `<td style="width: 40%;">${category}</td>`;
            html += `<td style="text-align: right;">${amount.toLocaleString()} JPY</td>`;
            html += `</tr>`;
        });
        
        html += `</table>`;
        html += `</div>`;
    });
    
    reportDiv.innerHTML = html;
}




