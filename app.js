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

