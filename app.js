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

// PWA 註冊的程式碼請保持不變 (在上面或下面皆可)
// if ('serviceWorker' in navigator) { ... }
