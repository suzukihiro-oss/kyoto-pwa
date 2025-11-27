// 註冊 Service Worker 實現 PWA 離線功能
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker: 註冊成功'))
      .catch(err => console.error('Service Worker: 註冊失敗', err));
  });
}

// 導航按鈕功能：點擊後導航到 Google 地圖
function navigateTo(location) {
  // 構造 Google Maps 搜索 URL
  const mapUrl = `http://googleusercontent.com/maps.google.com/4?q=${encodeURIComponent(location)}`;
  window.open(mapUrl, '_blank');
}