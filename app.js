// =================================================================
// 0. Firestore 初始化與全域變數
// =================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, 
    serverTimestamp, getDocs, where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// 為了避免因排序造成索引錯誤，這裡我們將不在 Firestore 內使用 orderBy。
// 如果需要排序，會在客戶端 (Client-side) 進行。

// Firestore 和 Auth 實例
let app;
let db;
let auth;
let userId = null;
const EXPENSES_COLLECTION_NAME = 'kyoto-expenses';

// Firebase 設定和 App ID (從環境變量獲取)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
let firebaseConfig = null;
if (typeof __firebase_config !== 'undefined') {
    try {
        firebaseConfig = JSON.parse(__firebase_config);
    } catch (e) {
        console.error("無法解析 __firebase_config:", e);
    }
}

/**
 * 將 Base64 字符串轉換為 ArrayBuffer
 * @param {string} base64 - Base64 字符串
 * @returns {ArrayBuffer}
 */
const base64ToArrayBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * 將 PCM 數據轉換為 WAV Blob
 * @param {Int16Array} pcm16 - 16位 PCM 數據
 * @param {number} sampleRate - 採樣率
 * @returns {Blob}
 */
const pcmToWav = (pcm16, sampleRate) => {
    const numChannels = 1;
    const numSamples = pcm16.length;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // 寫入 RIFF 標頭
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');

    // 寫入 fmt 子塊
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // 子塊長度
    view.setUint16(20, 1, true); // 音頻格式 (1 = PCM)
    view.setUint16(22, numChannels, true); // 通道數
    view.setUint32(24, sampleRate, true); // 採樣率
    view.setUint32(28, byteRate, true); // 位元組率
    view.setUint16(32, blockAlign, true); // Block Align
    view.setUint16(34, bitsPerSample, true); // Bits per sample

    // 寫入 data 子塊
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true); // 數據大小

    // 寫入 PCM 數據
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        view.setInt16(offset, pcm16[i], true);
        offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * 輔助函數：在 DataView 中寫入字符串
 * @param {DataView} view - DataView 實例
 * @param {number} offset - 起始偏移量
 * @param {string} string - 要寫入的字符串
 */
const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

/**
 * 初始化 Firebase 應用、認證和 Firestore
 */
async function initializeFirebase() {
    if (!firebaseConfig) {
        console.error("Firebase 配置缺失。無法初始化 Firestore/Auth。");
        // 即使沒有配置，也要確保頁面邏輯繼續執行
        document.getElementById('app-status').textContent = 'Firebase 設置失敗，記帳功能無法使用。';
        return;
    }
    
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // 檢查是否有初始認證 Token
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // 設置認證狀態監聽器
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("Firebase Auth 成功，UserID:", userId);
                document.getElementById('app-status').textContent = `應用程式就緒 (User: ${userId})`;
                
                // 認證成功後，加載記帳數據
                loadExpenses();
            } else {
                userId = null;
                console.log("用戶已登出或匿名認證失敗。");
                document.getElementById('app-status').textContent = '應用程式就緒 (匿名)';
            }
        });

    } catch (error) {
        console.error("Firebase 初始化或認證出錯:", error);
        document.getElementById('app-status').textContent = `應用程式錯誤：${error.message}`;
    }
}

// =================================================================
// 1. 分頁切換邏輯
// =================================================================

/**
 * 處理分頁切換
 * @param {string} tabName - 要切換到的分頁名稱 ('itinerary' 或 'tools')
 */
function switchTab(tabName) {
    // 移除所有按鈕的 active 狀態
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // 隱藏所有內容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 激活選定的按鈕和內容
    document.getElementById(`tab-${tabName}-btn`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');
}

// =================================================================
// 2. 匯率換算邏輯
// =================================================================

// 假設日幣(JPY)對新台幣(TWD)的匯率
// 實際應用中，這個數據應該從 API 獲取
const EXCHANGE_RATE_JPY_TO_TWD = 0.22; 

/**
 * 處理匯率換算
 */
function handleConvert() {
    const jpyInput = document.getElementById('jpy-input');
    const resultDisplay = document.getElementById('twd-result');
    const statusText = document.getElementById('converter-status');

    const jpyAmount = parseFloat(jpyInput.value);

    if (isNaN(jpyAmount) || jpyAmount <= 0) {
        resultDisplay.textContent = '0.00';
        statusText.textContent = '請輸入有效的日幣金額。';
        return;
    }

    // 進行換算
    const twdAmount = jpyAmount * EXCHANGE_RATE_JPY_TO_TWD;

    // 顯示結果
    resultDisplay.textContent = twdAmount.toFixed(2);
    statusText.textContent = `當前參考匯率 (JPY->TWD): ${EXCHANGE_RATE_RATE_JPY_TO_TWD}。`;
}

// =================================================================
// 3. 記帳功能邏輯
// =================================================================

/**
 * 獲取 Firestore 中用戶私人記帳資料的集合路徑
 * @returns {string | null}
 */
function getExpenseCollectionPath() {
    if (!userId) {
        console.error("無法取得 UserId，無法儲存記帳數據。");
        return null;
    }
    // 私人數據路徑: /artifacts/{appId}/users/{userId}/{your_collection_name}
    return `artifacts/${appId}/users/${userId}/${EXPENSES_COLLECTION_NAME}`;
}

/**
 * 處理支出表單提交
 * @param {Event} e - 表單事件
 */
async function handleAddExpense(e) {
    e.preventDefault();
    
    const form = document.getElementById('expense-form');
    const path = getExpenseCollectionPath();

    if (!path) return;

    // 取得表單數據
    const date = form.date.value;
    const amount = parseFloat(form.amount.value);
    const currency = form.currency.value;
    const description = form.description.value.trim() || '無描述';

    if (!date || isNaN(amount) || amount <= 0 || !currency) {
        console.error("請填寫所有有效的欄位。");
        alert('請填寫所有有效的欄位（日期、金額、幣別）。');
        return;
    }

    const expenseData = {
        date,
        amount,
        currency,
        description,
        // 儲存換算後的 TWD 金額
        amountTWD: currency === 'JPY' ? amount * EXCHANGE_RATE_JPY_TO_TWD : amount,
        timestamp: serverTimestamp() // 用於排序和記錄建立時間
    };

    try {
        await addDoc(collection(db, path), expenseData);
        // 清空表單，但不清空日期 (方便連續輸入同一天的花費)
        form.amount.value = '';
        form.description.value = '';
        console.log("支出記錄成功添加。");

    } catch (error) {
        console.error("添加支出記錄失敗:", error);
        alert(`添加支出失敗: ${error.message}`);
    }
}

/**
 * 渲染支出清單和總結報告
 * @param {Array<Object>} expenses - 支出記錄陣列
 */
function renderExpenses(expenses) {
    const tableBody = document.getElementById('expense-table-body');
    const tableFooter = document.getElementById('expense-table-footer');
    const summaryReport = document.getElementById('daily-summary-report');

    tableBody.innerHTML = '';
    summaryReport.innerHTML = '';
    tableFooter.innerHTML = '';

    // 1. 處理排序 (在客戶端按日期降序，如果日期相同，則按 timestamp 降序)
    // 確保 expenses 中的 timestamp 字段存在且是 Date 對象或 Firestore Timestamp
    expenses.sort((a, b) => {
        // 先按日期降序排序 (最近的日期在前)
        if (a.date < b.date) return 1;
        if (a.date > b.date) return -1;
        
        // 如果日期相同，則按 timestamp 降序 (最近添加的在前)
        const tsA = a.timestamp?.seconds || 0;
        const tsB = b.timestamp?.seconds || 0;
        return tsB - tsA;
    });

    let totalTWD = 0;
    
    // 2. 渲染表格和計算總額
    expenses.forEach(expense => {
        const row = tableBody.insertRow();
        
        // 確保 date 字段是字符串，避免錯誤
        const displayDate = String(expense.date); 
        const displayAmount = `${expense.amount.toFixed(0)} ${expense.currency}`;
        
        row.innerHTML = `
            <td>${displayDate.substring(5)}</td> <!-- 顯示月/日 -->
            <td>${expense.description}</td>
            <td style="text-align: right;">${displayAmount}</td>
            <td style="text-align: right;">${expense.amountTWD.toFixed(2)} TWD</td>
            <td><button class="delete-btn" data-id="${expense.id}">刪除</button></td>
        `;
        totalTWD += expense.amountTWD;
    });

    // 3. 渲染表格總計
    tableFooter.innerHTML = `
        <tr>
            <td colspan="3" style="text-align: right;">總支出 (TWD 概算)：</td>
            <td style="text-align: right; font-size: 18px; color: #A0522D;">
                ${totalTWD.toFixed(2)} TWD
            </td>
            <td></td>
        </tr>
    `;

    // 4. 渲染每日總結報告
    const dailyExpenses = expenses.reduce((acc, expense) => {
        const date = expense.date;
        if (!acc[date]) {
            acc[date] = { totalTWD: 0, items: [] };
        }
        acc[date].totalTWD += expense.amountTWD;
        acc[date].items.push(expense);
        return acc;
    }, {});

    // 按日期排序 (降序)
    const sortedDates = Object.keys(dailyExpenses).sort().reverse();
    
    sortedDates.forEach(date => {
        const dayData = dailyExpenses[date];
        const daySummary = document.createElement('div');
        daySummary.className = 'day-summary-card';
        
        // 表格內容
        const itemsHtml = dayData.items.map(item => `
            <tr>
                <td style="width: 60%;">${item.description}</td>
                <td style="text-align: right;">${item.amount.toFixed(0)} ${item.currency}</td>
                <td style="text-align: right; font-weight: 600;">${item.amountTWD.toFixed(2)}</td>
            </tr>
        `).join('');

        daySummary.innerHTML = `
            <h3>
                ${date}
                <span class="total-badge">總計: ${dayData.totalTWD.toFixed(2)} TWD</span>
            </h3>
            <table class="summary-table">
                <thead>
                    <tr><th>項目</th><th style="text-align: right;">原幣</th><th style="text-align: right;">TWD</th></tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        `;
        summaryReport.appendChild(daySummary);
    });
    
    // 5. 設置刪除按鈕監聽器
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDeleteExpense);
    });
}

/**
 * 處理刪除支出記錄
 * @param {Event} e - 點擊事件
 */
async function handleDeleteExpense(e) {
    const docId = e.target.getAttribute('data-id');
    const path = getExpenseCollectionPath();
    
    // 這裡我們使用自訂的 modal/提示，而不是瀏覽器內建的 confirm()
    const isConfirmed = window.confirm('確定要刪除這筆支出記錄嗎？'); 

    if (!isConfirmed || !docId || !path) return;

    try {
        await deleteDoc(doc(db, path, docId));
        console.log("支出記錄成功刪除:", docId);
    } catch (error) {
        console.error("刪除支出記錄失敗:", error);
        alert(`刪除失敗: ${error.message}`);
    }
}


/**
 * 從 Firestore 實時加載並監聽支出數據
 */
function loadExpenses() {
    const path = getExpenseCollectionPath();
    if (!path || !db) return;

    // 創建查詢。注意：避免使用 orderBy() 除非您確定 Firestore 索引已建立。
    // 我們在客戶端進行排序。
    const q = query(collection(db, path)); 

    // 實時監聽
    onSnapshot(q, (snapshot) => {
        const expenses = [];
        snapshot.forEach(doc => {
            // 從 Firestore 數據中添加文檔 ID，方便後續刪除操作
            expenses.push({ id: doc.id, ...doc.data() });
        });
        
        // 渲染更新後的數據
        renderExpenses(expenses);
        
    }, (error) => {
        console.error("實時加載支出數據失敗:", error);
        document.getElementById('app-status').textContent = `記帳數據載入失敗: ${error.message}`;
    });
}


// =================================================================
// 4. 事件監聽器與啟動
// =================================================================

window.onload = function() {
    // 初始化 Firebase
    initializeFirebase();

    // 設置初始分頁
    switchTab('itinerary'); 

    // 設置分頁按鈕監聽器
    document.getElementById('tab-itinerary-btn').addEventListener('click', () => switchTab('itinerary'));
    document.getElementById('tab-tools-btn').addEventListener('click', () => switchTab('tools'));

    // 設置匯率換算監聽器
    document.getElementById('convert-btn').addEventListener('click', handleConvert);

    // 設置記帳表單監聽器
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleAddExpense);
        // 設置當天日期為預設值
        const today = new Date().toISOString().split('T')[0];
        expenseForm.date.value = today;
    }

    // 設置清空數據按鈕 (危險操作，應提供二次確認)
    document.getElementById('clear-expenses-btn')?.addEventListener('click', async () => {
        if (!window.confirm('警告：確定要清空所有記帳數據嗎？此操作無法撤銷！')) {
            return;
        }

        const path = getExpenseCollectionPath();
        if (!path || !db) return;

        try {
            const q = query(collection(db, path));
            const snapshot = await getDocs(q);
            
            // 批量刪除所有文檔
            snapshot.docs.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });

            console.log("所有記帳數據已清空。");
            // onSnapshot 會自動更新 UI
        } catch (error) {
            console.error("清空記帳數據失敗:", error);
            alert(`清空數據失敗: ${error.message}`);
        }
    });

};





