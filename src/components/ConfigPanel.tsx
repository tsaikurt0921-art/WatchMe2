import React, { useState, useEffect } from 'react';
import { 
  Settings, X, ImageIcon, Globe, Youtube, Type, CloudSun, Upload, Clock, CheckCircle2, FileVideo, Search, MapPin, Loader2, Info, AlertCircle
} from 'lucide-react';
import { TAIWAN_CITIES } from '../constants';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';

export const ConfigPanel = ({ activeZoneId, zoneConfigs, handleSaveZoneConfig, setIsConfigPanelOpen }: any) => {
  const [activeTab, setActiveTab] = useState('image');
  const [images, setImages] = useState<string[]>([]);
  const [imageSpeed, setImageSpeed] = useState(5);
  const [webUrl, setWebUrl] = useState('');
  
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [fileVideoUrl, setFileVideoUrl] = useState('');
  const [videoSourceType, setVideoSourceType] = useState('youtube'); 
  
  const [textContent, setTextContent] = useState('');
  
  const [selectedCity, setSelectedCity] = useState(''); 
  const [cityInput, setCityInput] = useState(''); 
  const [isSearching, setIsSearching] = useState(false);
  const [foundCity, setFoundCity] = useState<any>(null); 

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const existing = zoneConfigs[activeZoneId];
    if (existing) {
      setActiveTab(existing.type);
      if (existing.type === 'image') {
        setImages(existing.images || []);
        setImageSpeed(existing.speed || 5);
      } else if (existing.type === 'web') {
        setWebUrl(existing.url);
      } else if (existing.type === 'video') {
        setVideoSourceType(existing.videoSourceType || 'youtube');
        if (existing.videoSourceType === 'file') {
           setFileVideoUrl(existing.url);
        } else {
           setYoutubeUrlInput(existing.url);
        }
      } else if (existing.type === 'text') {
        setTextContent(existing.text);
      } else if (existing.type === 'weather') {
           if (existing.lat && existing.lon) {
               setSelectedCity(existing.cityName); 
               setFoundCity({ name: existing.cityName, lat: existing.lat, lon: existing.lon });
           } else {
               setSelectedCity(existing.city || '臺北市');
           }
      }
    }
  }, [activeZoneId, zoneConfigs]);

  const handleImageUpload = async (e: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `uploads/${auth.currentUser?.uid || 'anonymous'}/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          }, 
          (error) => {
            console.error("Upload failed", error);
            reject(error);
          }, 
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            newUrls.push(downloadURL);
            resolve(true);
          }
        );
      });
    }
    
    setImages(prev => [...prev, ...newUrls]);
    setIsUploading(false);
    setUploadProgress(null);
  };

  const handleVideoFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `uploads/${auth.currentUser?.uid || 'anonymous'}/${fileName}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Video upload failed", error);
        setIsUploading(false);
        setUploadProgress(null);
        alert("影片上傳失敗");
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setFileVideoUrl(downloadURL);
        setIsUploading(false);
        setUploadProgress(null);
      }
    );
  };
  
  const handleCitySearch = async () => {
      if (!cityInput.trim()) return;
      setIsSearching(true);
      setFoundCity(null);
      try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput)}&count=1&language=zh&format=json`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
              const result = data.results[0];
              const cityData = {
                  name: result.name,
                  lat: result.latitude,
                  lon: result.longitude,
                  country: result.country
              };
              setFoundCity(cityData);
          } else {
              alert("找不到該城市，請嘗試其他名稱 (例如: Zhongli 或 中壢)");
          }
      } catch (e) {
          console.error(e);
          alert("搜尋失敗，請檢查網路連線");
      } finally {
          setIsSearching(false);
      }
  };

  const handleSave = () => {
    let config: any = { type: activeTab };
    if (activeTab === 'image') config = { ...config, images, speed: imageSpeed };
    if (activeTab === 'web') config = { ...config, url: webUrl };
    if (activeTab === 'video') {
        config = { 
            ...config, 
            url: videoSourceType === 'youtube' ? youtubeUrlInput : fileVideoUrl,
            videoSourceType: videoSourceType
        };
    }
    if (activeTab === 'text') config = { ...config, text: textContent };
    if (activeTab === 'weather') {
        if (foundCity) {
            config = { ...config, city: foundCity.name, cityName: foundCity.name, lat: foundCity.lat, lon: foundCity.lon };
        } else {
            const defaultCity = TAIWAN_CITIES[0];
            config = { ...config, city: defaultCity.name, cityName: defaultCity.name, lat: defaultCity.lat, lon: defaultCity.lon };
        }
    }
    handleSaveZoneConfig(config);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Settings size={20} />
            </div>
            編輯區塊 {activeZoneId + 1}
          </h3>
          <button onClick={() => setIsConfigPanelOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 bg-slate-50/30 p-3 flex flex-col gap-1.5 border-r border-slate-100">
            {[
              { id: 'image', icon: ImageIcon, label: '圖片輪播' },
              { id: 'web', icon: Globe, label: '網頁瀏覽' },
              { id: 'video', icon: Youtube, label: '影片播放' },
              { id: 'text', icon: Type, label: '純文字' },
              { id: 'weather', icon: CloudSun, label: '即時天氣' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-black transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                <tab.icon size={18} />{tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 p-8 overflow-y-auto bg-white">
            {activeTab === 'image' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between">
                    <span>新增圖片網址 (可用於公開分享)</span>
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      id="image-url-input"
                      placeholder="貼上圖片網址 (例如: https://...)" 
                      className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('image-url-input') as HTMLInputElement;
                        if (input.value.trim()) {
                          setImages(prev => [...prev, input.value.trim()]);
                          input.value = '';
                        }
                      }}
                      className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700 transition-all"
                    >
                      新增
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between">
                    <span>上傳圖片 (自動同步至雲端)</span>
                    {isUploading && <span className="text-blue-600 animate-pulse">正在上傳 {Math.round(uploadProgress || 0)}%</span>}
                  </label>
                  <div className="relative">
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload" className={`flex flex-col items-center justify-center gap-3 w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all text-slate-400 hover:text-blue-600 group ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                        {isUploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                      </div>
                      <span className="text-sm font-bold">{isUploading ? '上傳中...' : '點擊或拖曳圖片'}</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>已選圖片 ({images.length})</span></div>
                  <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group aspect-video bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg"><X size={12} /></button>
                      </div>
                    ))}
                    {images.length === 0 && <div className="col-span-full py-8 text-center text-slate-300 text-xs font-bold">尚未選擇任何圖片</div>}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={16} /> 輪播速度 ({imageSpeed}s)</label>
                  <input type="range" min="1" max="60" value={imageSpeed} onChange={(e) => setImageSpeed(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
              </div>
            )}
            {activeTab === 'web' && (
              <div className="space-y-6">
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-sm flex items-start gap-4">
                  <Info size={24} className="mt-0.5 shrink-0 text-blue-600"/>
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-blue-800">網頁出現灰色哭臉或空白？</span>
                    <span className="font-medium">這表示該網站 (例如 Google, 學校網頁等) 設定了嚴格的安全防護 (X-Frame-Options)，禁止在其他系統中直接嵌入顯示。</span>
                    <span className="opacity-70 mt-1 font-bold">針對此類網站，系統會提供「在新視窗開啟」的按鈕作為替代方案。</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">目標網址 URL</label>
                  <input type="url" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="https://..." className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 outline-none font-mono focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                </div>
              </div>
            )}
            {activeTab === 'video' && (
              <div className="space-y-8">
                <div className="flex rounded-2xl bg-slate-50 p-1.5 border border-slate-200 shadow-inner">
                  <button onClick={() => setVideoSourceType('youtube')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${videoSourceType === 'youtube' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><Youtube size={18} /> YouTube 連結</button>
                  <button onClick={() => setVideoSourceType('file')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${videoSourceType === 'file' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><FileVideo size={18} /> 上傳影片檔</button>
                </div>
                
                {videoSourceType === 'youtube' ? (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">YouTube 影片連結或 ID (11碼)</label>
                    <input 
                       type="text" 
                       value={youtubeUrlInput} 
                       onChange={(e) => setYoutubeUrlInput(e.target.value)} 
                       placeholder="例如: A508aCF4bqs 或 YouTube 網址" 
                       className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between">
                      <span>上傳影片檔案 (MP4, WebM - 自動同步至雲端)</span>
                      {isUploading && <span className="text-blue-600 animate-pulse">正在上傳 {Math.round(uploadProgress || 0)}%</span>}
                    </label>
                    <div className="relative">
                      <input type="file" accept="video/*" onChange={handleVideoFileUpload} disabled={isUploading} className="hidden" id="video-upload" />
                      <label htmlFor="video-upload" className={`flex flex-col items-center justify-center gap-3 w-full h-40 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all text-slate-400 hover:text-blue-600 group ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                          {isUploading ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                        </div>
                        <span className="text-sm font-bold">{isUploading ? '上傳中...' : '點擊選擇影片檔案'}</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">文字內容</label>
                  <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="請輸入..." className="w-full h-48 rounded-2xl bg-slate-50 border border-slate-200 px-6 py-5 text-slate-900 outline-none resize-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" />
                </div>
              </div>
            )}
            {activeTab === 'weather' && (
              <div className="space-y-8">
                <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 text-sm font-medium">
                  此功能將顯示所選地區的即時天氣資訊、溫度與日期時間。
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">搜尋城市/地區 (支援全球)</label>
                  <div className="flex gap-3">
                     <input 
                       type="text" 
                       value={cityInput}
                       onChange={(e) => setCityInput(e.target.value)}
                       placeholder="輸入城市名稱 (例如: 中壢)"
                       className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 px-5 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                       onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
                     />
                     <button 
                       onClick={handleCitySearch}
                       disabled={isSearching}
                       className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center gap-2 disabled:opacity-50 font-black transition-all active:scale-95 shadow-lg"
                     >
                       {isSearching ? <Loader2 className="animate-spin" size={18}/> : <Search size={18} />}
                       搜尋
                     </button>
                  </div>
                </div>

                {(foundCity || selectedCity) && (
                   <div className="mt-6 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-3 relative overflow-hidden shadow-inner">
                      <div className="absolute top-0 right-0 p-4 text-emerald-500"><CheckCircle2 size={24}/></div>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">已選擇地區</p>
                      <div className="flex items-center gap-3 text-slate-900">
                         <div className="p-3 bg-red-50 rounded-2xl text-red-500">
                           <MapPin size={24} />
                         </div>
                         <span className="text-3xl font-black tracking-tight">{foundCity ? foundCity.name : selectedCity}</span>
                         {foundCity && <span className="text-sm text-slate-400 font-bold">({foundCity.country})</span>}
                      </div>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 p-6 bg-slate-50/50 flex justify-end gap-4">
          <button onClick={() => setIsConfigPanelOpen(false)} className="px-8 py-3 rounded-2xl text-slate-400 hover:text-slate-900 font-black transition-all hover:bg-slate-100 uppercase tracking-widest text-xs">取消</button>
          <button onClick={handleSave} className="px-10 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-100 active:scale-95 transition-all uppercase tracking-widest text-xs">確認儲存</button>
        </div>
      </div>
    </div>
  );
};
