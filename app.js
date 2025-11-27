// =============================================================
// 1. 核心功能: 地圖導航
// =============================================================

function navigateTo(location) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, '_blank');
}


// =============================================================
// 2. 初始化與 Tab Bar 分頁切換功能
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Bar 邏輯 ---
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


