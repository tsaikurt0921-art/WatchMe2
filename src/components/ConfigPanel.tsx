import React, { useState, useEffect } from 'react';
import { 
  Settings, X, ImageIcon, Globe, Youtube, Type, CloudSun, Upload, Clock, CheckCircle2, FileVideo, Search, MapPin, Loader2, Info
} from 'lucide-react';
import { TAIWAN_CITIES } from '../constants';

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
    const newImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      newImages.push(previewUrl);
    }
    setImages(prev => [...prev, ...newImages]);
  };

  const handleVideoFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setFileVideoUrl(previewUrl);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-white/10 p-4 bg-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings size={20} className="text-blue-400" />
            編輯區塊 {activeZoneId + 1}
          </h3>
          <button onClick={() => setIsConfigPanelOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 bg-slate-950/50 p-2 flex flex-col gap-1 border-r border-white/5">
            {[
              { id: 'image', icon: ImageIcon, label: '圖片輪播' },
              { id: 'web', icon: Globe, label: '網頁瀏覽' },
              { id: 'video', icon: Youtube, label: '影片播放' },
              { id: 'text', icon: Type, label: '純文字' },
              { id: 'weather', icon: CloudSun, label: '即時天氣' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <tab.icon size={18} />{tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 p-6 overflow-y-auto bg-slate-900">
            {activeTab === 'image' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex justify-between">
                    <span>上傳圖片 (僅限本機預覽)</span>
                  </label>
                  <div className="relative">
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload" className="flex items-center justify-center gap-2 w-full h-24 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800 cursor-pointer transition-all text-slate-400 hover:text-blue-400">
                      <Upload size={24} /><span className="text-sm">點擊或拖曳圖片</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500"><span>已選圖片 ({images.length})</span></div>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-black/20 rounded-lg">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group aspect-video bg-slate-800 rounded overflow-hidden border border-white/5">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500/80 p-1 rounded-full text-white opacity-0 group-hover:opacity-100"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Clock size={16} /> 輪播速度 ({imageSpeed}s)</label>
                  <input type="range" min="1" max="60" value={imageSpeed} onChange={(e) => setImageSpeed(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              </div>
            )}
            {activeTab === 'web' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-200 text-sm flex items-start gap-3">
                  <Info size={24} className="mt-0.5 shrink-0 text-blue-400"/>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-blue-400">網頁出現灰色哭臉或空白？</span>
                    <span>這表示該網站 (例如 Google, 學校網頁等) 設定了嚴格的安全防護 (X-Frame-Options)，禁止在其他系統中直接嵌入顯示。</span>
                    <span className="opacity-80 mt-1">針對此類網站，系統會提供「在新視窗開啟」的按鈕作為替代方案。</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">目標網址 URL</label>
                  <input type="url" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg bg-black/20 border border-slate-700 px-4 py-3 text-white outline-none font-mono" />
                </div>
              </div>
            )}
            {activeTab === 'video' && (
              <div className="space-y-6">
                <div className="flex rounded-lg bg-black/20 p-1 border border-slate-700">
                  <button onClick={() => setVideoSourceType('youtube')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${videoSourceType === 'youtube' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><Youtube size={16} /> YouTube 連結</button>
                  <button onClick={() => setVideoSourceType('file')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${videoSourceType === 'file' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><FileVideo size={16} /> 上傳影片檔</button>
                </div>
                
                {videoSourceType === 'youtube' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">YouTube 影片連結或 ID (11碼)</label>
                    <input 
                       type="text" 
                       value={youtubeUrlInput} 
                       onChange={(e) => setYoutubeUrlInput(e.target.value)} 
                       placeholder="例如: A508aCF4bqs 或 YouTube 網址" 
                       className="w-full rounded-lg bg-black/20 border border-slate-700 px-4 py-3 text-white outline-none" 
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex justify-between"><span>上傳影片檔案 (MP4, WebM - 僅限本機預覽)</span></label>
                    <div className="relative">
                      <input type="file" accept="video/*" onChange={handleVideoFileUpload} className="hidden" id="video-upload" />
                      <label htmlFor="video-upload" className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800 cursor-pointer transition-all text-slate-400 hover:text-blue-400"><Upload size={24} /><span className="text-sm">點擊選擇影片檔案</span></label>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">文字內容</label>
                  <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="請輸入..." className="w-full h-32 rounded-lg bg-black/20 border border-slate-700 px-4 py-3 text-white outline-none resize-none" />
                </div>
              </div>
            )}
            {activeTab === 'weather' && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-200 text-sm">
                  此功能將顯示所選地區的即時天氣資訊、溫度與日期時間。
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">搜尋城市/地區 (支援全球)</label>
                  <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={cityInput}
                       onChange={(e) => setCityInput(e.target.value)}
                       placeholder="輸入城市名稱 (例如: 中壢)"
                       className="flex-1 rounded-lg bg-black/20 border border-slate-700 px-4 py-2 text-white outline-none focus:border-blue-500"
                       onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
                     />
                     <button 
                       onClick={handleCitySearch}
                       disabled={isSearching}
                       className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                     >
                       {isSearching ? <Loader2 className="animate-spin" size={18}/> : <Search size={18} />}
                       搜尋
                     </button>
                  </div>
                </div>

                {(foundCity || selectedCity) && (
                   <div className="mt-4 p-4 rounded-xl bg-slate-800 border border-green-500/30 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 text-green-500"><CheckCircle2 size={16}/></div>
                      <p className="text-slate-400 text-xs">已選擇地區</p>
                      <div className="flex items-center gap-2 text-white">
                         <MapPin size={20} className="text-red-400" />
                         <span className="text-xl font-bold">{foundCity ? foundCity.name : selectedCity}</span>
                         {foundCity && <span className="text-sm text-slate-400">({foundCity.country})</span>}
                      </div>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 p-4 bg-slate-800 flex justify-end gap-3">
          <button onClick={() => setIsConfigPanelOpen(false)} className="px-6 py-2 rounded-lg text-slate-300 hover:text-white font-medium hover:bg-white/5">取消</button>
          <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg">確認儲存</button>
        </div>
      </div>
    </div>
  );
};
