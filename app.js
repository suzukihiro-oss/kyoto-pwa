// =============================================================
// 1. 核心功能: 地圖導航
// =============================================================

function navigateTo(location) {
    // 修正：使用正確的模板字面值語法 ${...}，並替換為 Google Maps 搜尋的標準網址。
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, '_blank');
}


// =============================================================
// 2. Tab Bar 分頁切換功能
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
    
    // 載入時，預設設定記帳日期為今天
    setTodayDate();
    
    // 載入時執行天氣查詢
    getKyotoWeather();

    // 載入所有本地儲存數據
    loadExpenses();
    loadRate();
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
    return today.getFullYear() + '-' + 
           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
           String(today.getDate()).padStart(2, '0');
}

// 設定日期輸入框為今天日期 (用於載入和新增後重設)
function setTodayDate() {
    const dateInput = document.getElementById('expenseDate');
    if (dateInput) {
        dateInput.value = getTodayDateString();
    }
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

// 渲染明細表格：更新 HTML 顯示
function renderTable() {
    const listBody = document.getElementById('expense-list');
    const totalElement = document.getElementById('total-expense');
    listBody.innerHTML = '';
    let total = 0;

    // 將紀錄依日期降冪排序 (新紀錄在前)
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

    // 清空表單
    amountInput.value = '';
    descriptionInput.value = '';
    // 新增完畢後，將日期重設為今天
    setTodayDate(); 
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


// =============================================================
// 5. 即時天氣查詢功能 (需要 API Key)
// =============================================================

// !!! 請替換為您從 OpenWeatherMap 網站註冊取得的 API Key !!!
const API_KEY = '94c8b155fe3df25175478269ab2c5aad'; 

// 京都市的經緯度 (確保位置準確)
const KYOTO_LAT = 35.0116;
const KYOTO_LON = 135.7681;
const WEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${KYOTO_LAT}&lon=${KYOTO_LON}&units=metric&lang=zh_tw&appid=${API_KEY}`;

// 獲取並顯示天氣資訊
function getKyotoWeather() {
    const weatherDisplay = document.getElementById('weather-display');
    // 如果沒有天氣顯示區塊，則退出
    if (!weatherDisplay) return; 

    weatherDisplay.innerHTML = '<p style="text-align: center;">正在查詢...</p>';

    // 檢查 API Key 是否已設定 (防止錯誤呼叫)
    if (API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY' || !API_KEY) {
        weatherDisplay.innerHTML = `
            <p style="color: orange;">請在 app.js 中設定您的 OpenWeatherMap API Key！</p>
            <button onclick="getKyotoWeather()">重試</button>
        `;
        return;
    }

    fetch(WEATHER_URL)
        .then(response => {
            if (!response.ok) {
                // 如果是 401 錯誤，通常是 API Key 無效
                if (response.status === 401) {
                     throw new Error(`授權錯誤！請檢查您的 API Key 是否正確。`);
                }
                throw new Error(`HTTP error! 狀態碼: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 檢查是否包含有效的數據
            if (data && data.main && data.weather && data.weather.length > 0) {
                const temp = Math.round(data.main.temp);
                const feelsLike = Math.round(data.main.feels_like);
                const description = data.weather[0].description;
                const iconCode = data.weather[0].icon; 
                const humidity = data.main.humidity;
                const windSpeed = data.wind.speed; // m/s
                
                // 使用 OpenWeatherMap 提供的天氣圖標
                const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

                // 構建顯示的 HTML 內容
                weatherDisplay.innerHTML = `
                    <h4>${data.name} 即時天氣</h4>
                    <img src="${iconUrl}" alt="${description}" class="weather-icon">
                    <p>
                        <strong>溫度：</strong> ${temp}°C <br>
                        <strong>體感：</strong> ${feelsLike}°C <br>
                        <strong>狀況：</strong> ${description}
                    </p>
                    <p style="font-size: 14px; margin-top: 10px;">
                        濕度：${humidity}% | 風速：${windSpeed} m/s
                    </p>
                    <button onclick="getKyotoWeather()">刷新天氣</button>
                `;
            } else {
                throw new Error("Invalid weather data structure.");
            }
        })
        .catch(error => {
            console.error("Fetch weather error:", error);
            weatherDisplay.innerHTML = `
                <p style="color: red;">載入失敗！${error.message}</p>
                <button onclick="getKyotoWeather()">重試</button>
            `;
        });
}






