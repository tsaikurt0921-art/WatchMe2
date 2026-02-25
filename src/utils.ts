// --- Helper Functions ---

// 強化版 YouTube ID 解析
export const getYouTubeVideoId = (url: string | null) => {
  if (!url) return null;
  const cleanUrl = url.trim();

  // 1. 若使用者已經直接輸入了 11 碼的影片 ID (例如：A508aCF4bqs)
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  // 2. 針對標準含有 v= 的網址
  if (cleanUrl.includes('v=')) {
    try {
      return cleanUrl.split('v=')[1].split('&')[0].substring(0, 11);
    } catch (e) {}
  }

  // 3. 針對 Shorts 的網址
  if (cleanUrl.includes('/shorts/')) {
    try {
      return cleanUrl.split('/shorts/')[1].split('?')[0].substring(0, 11);
    } catch(e) {}
  }

  // 4. 針對 youtu.be 縮網址
  if (cleanUrl.includes('youtu.be/')) {
    try {
      return cleanUrl.split('youtu.be/')[1].split('?')[0].substring(0, 11);
    } catch(e) {}
  }
  
  // 5. 針對 embed 網址
  if (cleanUrl.includes('/embed/')) {
    try {
      return cleanUrl.split('/embed/')[1].split('?')[0].substring(0, 11);
    } catch(e) {}
  }

  return null; 
};

export const transformWebUrl = (url: string | null) => {
  if (!url) return '';
  // 自動轉換 Facebook 貼文/影片
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const cleanUrl = url.split('?')[0];
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=0&width=auto`;
  }
  // 自動轉換 Instagram
  if (url.includes('instagram.com/p/') || url.includes('instagram.com/reel/')) {
    let clean = url.split('?')[0];
    if(!clean.endsWith('/')) clean += '/';
    return clean + 'embed';
  }
  return url;
};

// 檢查是否為已知必定阻擋嵌入的網域 (X-Frame-Options: DENY)
export const isKnownBlockedUrl = (url: string | null) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  
  // 這些知名網站與學校/政府機關嚴格禁止 iframe 嵌入
  if (
    lowerUrl.includes('aistudio.google.com') ||
    lowerUrl.includes('github.com') ||
    lowerUrl.includes('yahoo.com') ||
    lowerUrl.includes('.edu.tw') || // 台灣學校、教育網段
    lowerUrl.includes('.gov.tw') || // 台灣政府機關
    (lowerUrl.includes('google.com') && !lowerUrl.includes('/embed') && !lowerUrl.includes('/maps') && !lowerUrl.includes('docs.google.com'))
  ) {
    return true;
  }
  return false;
};
