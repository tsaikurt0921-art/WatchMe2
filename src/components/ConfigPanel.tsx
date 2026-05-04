import React, { useState, useEffect } from 'react';
import { 
  Settings, X, ImageIcon, Globe, Youtube, Type, CloudSun, Upload, Clock, CheckCircle2, FileVideo, Search, MapPin, Loader2, Info, AlertCircle, Music, Volume2, VolumeX, RefreshCw, Trash2, Play
} from 'lucide-react';
import { TAIWAN_CITIES } from '../constants';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { storage, auth, db } from '../firebase';

export const ConfigPanel = ({ activeZoneId, activeZoneCategory, zoneConfigs, handleSaveZoneConfig, setIsConfigPanelOpen }: any) => {
  const [activeTab, setActiveTab] = useState('image');
  const [images, setImages] = useState<string[]>([]);
  const [imageSpeed, setImageSpeed] = useState(5);
  const [webUrl, setWebUrl] = useState('');
  
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [fileVideoUrl, setFileVideoUrl] = useState('');
  const [videoSourceType, setVideoSourceType] = useState('youtube'); 
  
  const [textContent, setTextContent] = useState('');
  const [presetAssetUrl, setPresetAssetUrl] = useState('');
  
  const [selectedCity, setSelectedCity] = useState(''); 
  const [cityInput, setCityInput] = useState(''); 
  const [isSearching, setIsSearching] = useState(false);
  const [foundCity, setFoundCity] = useState<any>(null); 

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [systemAssets, setSystemAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioConfig, setAudioConfig] = useState<any>({
    url: '',
    name: '',
    autoplay: true,
    loop: true
  });

  useEffect(() => {
    const fetchAssets = async () => {
      if (activeTab === 'preset') {
        setLoadingAssets(true);
        try {
          // Normalize category for query
          let category = activeZoneCategory || '16:9';
          if (category.includes('16:9')) category = '16:9';
          if (category.includes('9:16')) category = '9:16';
          if (category.toLowerCase().includes('banner')) category = 'banner';

          const q = query(
            collection(db, 'templateAssets'),
            where('category', '==', category)
          );
          const querySnapshot = await getDocs(q);
          const assets = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSystemAssets(assets);
        } catch (error) {
          console.error("Error fetching assets:", error);
        } finally {
          setLoadingAssets(false);
        }
      }
    };

    fetchAssets();
  }, [activeTab, activeZoneCategory]);

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
      } else if (existing.type === 'preset') {
        setTextContent(existing.text);
        setPresetAssetUrl(existing.assetUrl);
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

  const handleAudioUpload = async (e: any) => {
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
        console.error("Audio upload failed", error);
        setIsUploading(false);
        setUploadProgress(null);
        alert("音訊上傳失敗");
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setAudioConfig((prev: any) => ({ ...prev, url: downloadURL, name: file.name }));
        setIsUploading(false);
        setUploadProgress(null);
      }
    );
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
    if (activeTab === 'preset') config = { ...config, text: textContent, assetUrl: presetAssetUrl };
    if (activeTab === 'weather') {
        if (foundCity) {
            config = { ...config, city: foundCity.name, cityName: foundCity.name, lat: foundCity.lat, lon: foundCity.lon };
        } else {
            const defaultCity = TAIWAN_CITIES[0];
            config = { ...config, city: defaultCity.name, cityName: defaultCity.name, lat: defaultCity.lat, lon: defaultCity.lon };
        }
    }
    
    // Add audio and sound settings
    config.soundEnabled = soundEnabled;
    config.audioConfig = audioConfig;
    
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
              { id: 'audio', icon: Music, label: '背景音樂' },
              { id: 'text', icon: Type, label: '純文字' },
              { id: 'preset', icon: ImageIcon, label: '圖文素材' },
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
                    <span className="font-medium">這表示該網站（例如 Google、特定公司官網）設定了嚴格的安全防護（X-Frame-Options），旨在保護安全性，故禁止在其他系統中直接嵌入鑲嵌。</span>
                    <span className="text-blue-600 font-bold mt-1">若網頁無法顯示，極可能這個網頁是被設定「無法被嵌入、鑲嵌」在其他地方的限制，需要請您替換一個網頁素材，或改用圖片/影片呈現。</span>
                    <span className="opacity-70 mt-1 text-xs">針對此類網站，播放端會提供「在新視窗開啟」的按鈕作為替代。</span>
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

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all ${soundEnabled ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${soundEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black uppercase tracking-widest">影片聲音</p>
                        <p className="text-[10px] opacity-70 font-bold">{soundEnabled ? '有聲播放 (自動播放可能受限)' : '靜音播放'}</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-all ${soundEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${soundEnabled ? 'right-1' : 'left-1'}`} />
                    </div>
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'audio' && (
              <div className="space-y-8">
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-sm flex items-start gap-4">
                  <Info size={24} className="mt-0.5 shrink-0 text-blue-600"/>
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-blue-800">背景音樂設定</span>
                    <span className="font-medium">您可以上傳 MP3 檔案作為該版型的背景音樂。</span>
                    <span className="opacity-70 mt-1 font-bold italic">注意：部分瀏覽器會因「自動播放政策」初期靜音音樂，使用者點擊頁面後即會發聲。</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between">
                    <span>上傳背景音樂 (MP3)</span>
                    {isUploading && <span className="text-blue-600 animate-pulse">正在上傳 {Math.round(uploadProgress || 0)}%</span>}
                  </label>
                  
                  <div className="relative">
                    <input type="file" accept="audio/mpeg, audio/mp3" onChange={handleAudioUpload} disabled={isUploading} className="hidden" id="audio-upload" />
                    <label htmlFor="audio-upload" className={`flex flex-col items-center justify-center gap-3 w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all text-slate-400 hover:text-blue-600 group ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                        {isUploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                      </div>
                      <span className="text-sm font-bold">{isUploading ? '上傳中...' : (audioConfig.url ? '點擊更換音樂' : '點擊選擇音樂檔案')}</span>
                    </label>
                  </div>
                </div>

                {audioConfig.url && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 text-white rounded-xl">
                        <Music size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">目前音樂</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{audioConfig.name}</p>
                      </div>
                      <button 
                        onClick={() => setAudioConfig({ ...audioConfig, url: '', name: '' })}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <button 
                        onClick={() => setAudioConfig({ ...audioConfig, autoplay: !audioConfig.autoplay })}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${audioConfig.autoplay ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}
                      >
                        <Play size={16} fill={audioConfig.autoplay ? "currentColor" : "none"} />
                        <span className="text-xs font-black uppercase tracking-widest">自動播放</span>
                      </button>
                       <button 
                        onClick={() => setAudioConfig({ ...audioConfig, loop: !audioConfig.loop })}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${audioConfig.loop ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}
                      >
                        <RefreshCw size={16} className={audioConfig.loop ? "animate-spin-slow" : ""} />
                        <span className="text-xs font-black uppercase tracking-widest">循環播放</span>
                      </button>
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
            {activeTab === 'preset' && (
              <div className="space-y-6">
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-sm flex items-start gap-4">
                  <Info size={24} className="mt-0.5 shrink-0 text-blue-600"/>
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-blue-800">圖文素材編輯</span>
                    <span className="font-medium">系統已自動為您篩選適合此區塊比例 ({activeZoneCategory || '16:9'}) 的底圖。您可以點選下方圖片進行更換。</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                    <span>選擇系統底圖</span>
                    {loadingAssets && <Loader2 size={14} className="animate-spin text-blue-600" />}
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    {systemAssets.map((asset) => (
                      <button 
                        key={asset.id}
                        onClick={() => setPresetAssetUrl(asset.url)}
                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${presetAssetUrl === asset.url ? 'border-blue-600 ring-4 ring-blue-500/10' : 'border-white hover:border-blue-200'}`}
                      >
                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {presetAssetUrl === asset.url && (
                          <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                            <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg">
                              <CheckCircle2 size={16} />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 p-2 text-[10px] text-white font-bold truncate">
                          {asset.name}
                        </div>
                      </button>
                    ))}
                    {!loadingAssets && systemAssets.length === 0 && (
                      <div className="col-span-full py-12 text-center flex flex-col items-center gap-3">
                        <AlertCircle size={32} className="text-slate-300" />
                        <p className="text-slate-400 text-xs font-bold">目前沒有適合此比例的系統素材</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">預覽底圖</label>
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-8 text-center">
                    {presetAssetUrl ? (
                      <>
                        {/* 背景模糊層預覽 */}
                        {activeZoneCategory === '9:16' && (
                          <img 
                            src={presetAssetUrl} 
                            alt="" 
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover blur-md opacity-30" 
                          />
                        )}
                        <img 
                          src={presetAssetUrl} 
                          alt="Preset" 
                          className={`absolute inset-0 w-full h-full ${activeZoneCategory === '9:16' ? 'object-contain' : 'object-cover'}`} 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="relative z-10 w-full max-h-full overflow-hidden flex items-center justify-center">
                           <h2 className="text-slate-800 font-black text-xl md:text-2xl drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] break-words whitespace-pre-wrap overflow-wrap-anywhere leading-tight tracking-tight">
                             {textContent || ""}
                           </h2>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon size={48} className="opacity-20" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">疊加文字內容</label>
                  <textarea 
                    value={textContent} 
                    onChange={(e) => setTextContent(e.target.value)} 
                    placeholder="輸入要顯示在圖片上的文字..." 
                    className="w-full h-32 rounded-2xl bg-slate-50 border border-slate-200 px-6 py-5 text-slate-900 outline-none resize-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" 
                  />
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
