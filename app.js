// =============================================================
// 1. 核心功能: 地圖導航 (使用最安全的字串連接方式，避免語法錯誤)
// =============================================================

function navigateTo(location) {
    // 使用傳統字串連接，避免先前模板字串的潛在語法錯誤。
    const url = "http://maps.google.com/?q=" + encodeURIComponent(location);
    window.open(url, '_blank');
}


// =============================================================
// 2. 初始化與 Tab Bar 分頁切換功能
// =============================================================
// *** 以下程式碼與功能與先前版本相同，確保在 DOMContentLoaded 中呼叫所有初始化函數 ***
document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Bar 邏輯 ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    document.getElementById('daily').classList.add('active');
    
    // --- 載入與初始化所有功能 ---
    
    // 綁定匯率輸入事件
    const jpyInput = document.getElementById('jpyAmount');
    if (jpyInput) {
        jpyInput.addEventListener('input', convertCurrency);
    }

    // 載入所有本地儲存數據
    loadExpenses();
    loadRate();
    
    // 初始化楓葉特效
    initLeafEffect(); 
});


// =============================================================
// 3. 匯率換算器功能
// =============================================================

const DEFAULT_RATE = 0.22; 
function loadRate() {
    const savedRate = localStorage.getItem('exchangeRate');
    const rateInput = document.getElementById('exchangeRate');
    if (rateInput) {
        rateInput.value = savedRate || DEFAULT_RATE;
    }
}
function saveRate() {
    const rateInput = document.getElementById('exchangeRate');
    const rate = parseFloat(rateInput.value);
    
    if (isNaN(rate) || rate <= 0) {
        alert('請輸入有效的匯率！');
        rateInput.value = DEFAULT_RATE;
        return;
    }
    localStorage.setItem('exchangeRate', rate);
    convertCurrency();
    alert(`匯率已更新並儲存：1 JPY = ${rate} TWD`);
}
function convertCurrency() {
    const jpyAmountInput = document.getElementById('jpyAmount');
    const twdResultElement = document.getElementById('twdResult');
    const rate = parseFloat(localStorage.getItem('exchangeRate')) || DEFAULT_RATE;
    const jpy = parseFloat(jpyAmountInput ? jpyAmountInput.value : 0) || 0;
    const twd = jpy * rate;
    
    if (twdResultElement) {
        twdResultElement.textContent = twd.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
}


// =============================================================
// 4. 記帳功能核心邏輯
// =============================================================

let expenses = []; 
function getTodayDateString() {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
}
function loadExpenses() {
    const savedExpenses = localStorage.getItem('kyotoExpenses');
    if (savedExpenses) {
        try {
            expenses = JSON.parse(savedExpenses);
        } catch(e) {
            expenses = [];
        }
    }
    renderTable();
    renderDailySummary(); 
}
function saveExpenses() {
    localStorage.setItem('kyotoExpenses', JSON.stringify(expenses));
}
function renderTable() {
    const listBody = document.getElementById('expense-list');
    const totalElement = document.getElementById('total-expense');
    listBody.innerHTML = '';
    let total = 0;
    const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

    sortedExpenses.forEach((expense) => {
        const row = listBody.insertRow();
        row.insertCell(0).textContent = expense.date; 
        row.insertCell(1).textContent = expense.description;
        row.insertCell(2).textContent = expense.category;
        row.insertCell(3).textContent = expense.amount.toLocaleString();
        total += expense.amount;
    });

    totalElement.textContent = total.toLocaleString() + ' JPY';
}
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

    amountInput.value = '';
    descriptionInput.value = '';
    dateInput.value = ''; 
}
function clearExpenses() {
    if (confirm('確定要清除所有記帳紀錄嗎？此操作不可逆！')) {
        expenses = [];
        saveExpenses();
        renderTable();
        renderDailySummary(); 
    }
}
function calculateDailySummary() {
    const summary = {};
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
    const sortedDates = Object.keys(summary).sort().reverse();
    return { sortedDates, summary };
}
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


// =============================================================
// 5. 楓葉特效功能
// =============================================================

function initLeafEffect() {
    const container = document.getElementById('leaf-container');
    if (!container) return; 

    const numLeaves = 25; 

    for (let i = 0; i < numLeaves; i++) {
        const leaf = document.createElement('div');
        leaf.className = 'leaf';

        leaf.style.left = Math.random() * 100 + 'vw';
        const size = Math.random() * 15 + 10; 
        leaf.style.width = size + 'px';
        leaf.style.height = size + 'px';
        
        const duration = Math.random() * 10 + 8; 
        leaf.style.animationDuration = duration + 's, ' + (duration / 2) + 's';
        
        leaf.style.animationDelay = Math.random() * 10 + 's, ' + Math.random() * 10 + 's';
        
        const colors = ['#A0522D', '#CD5C5C', '#DAA520'];
        leaf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        container.appendChild(leaf);
    }
}



