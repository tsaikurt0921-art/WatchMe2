import React, { useState, useEffect, useRef } from 'react';
import { 
  Loader2, MapPin, Sun, Moon, CloudSun, Cloud, CloudRain, Snowflake, CloudLightning, Globe, ExternalLink, Youtube, AlertCircle
} from 'lucide-react';
import { getYouTubeVideoId, transformWebUrl, isKnownBlockedUrl } from '../utils';
import { DEFAULT_TEXT_BG } from '../constants';

const getWeatherIcon = (code: number, isDay: number) => {
  if (code === 0) return isDay ? <Sun className="text-yellow-400 animate-pulse-slow" size="100%" /> : <Moon className="text-slate-300" size="100%" />;
  if (code >= 1 && code <= 3) return <CloudSun className="text-gray-300" size="100%" />;
  if (code >= 45 && code <= 48) return <Cloud className="text-gray-400" size="100%" />;
  if (code >= 51 && code <= 67) return <CloudRain className="text-blue-300" size="100%" />;
  if (code >= 71 && code <= 77) return <Snowflake className="text-white animate-spin-slow" size="100%" />;
  if (code >= 80 && code <= 82) return <CloudRain className="text-blue-400" size="100%" />;
  if (code >= 95 && code <= 99) return <CloudLightning className="text-yellow-300 animate-pulse" size="100%" />;
  return <Cloud className="text-gray-400" size="100%" />;
};

const getWeatherStatusText = (code: number) => {
  const map: Record<number, string> = {
    0: '晴朗', 1: '晴時多雲', 2: '多雲', 3: '陰天',
    45: '起霧', 48: '白霜霧',
    51: '毛毛雨', 53: '毛毛雨', 55: '強毛毛雨',
    61: '小雨', 63: '中雨', 65: '大雨',
    80: '局部陣雨', 81: '陣雨', 82: '強陣雨',
    95: '雷雨', 96: '雷雨伴隨冰雹', 99: '強烈雷雨'
  };
  return map[code] || '多雲';
};

export const ZoneContentRenderer = ({ content, isPlaying }: any) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 容器與縮放狀態
  const containerRef = useRef<HTMLDivElement>(null);
  const webContainerRef = useRef<HTMLDivElement>(null);
  const [isBanner, setIsBanner] = useState(false);
  const [webScale, setWebScale] = useState(1);
  const [virtualSize, setVirtualSize] = useState({ w: 1920, h: 1080 });

  useEffect(() => {
    if (content?.type === 'weather' && containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          setIsBanner(width > height * 2.5);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [content]);

  useEffect(() => {
    if (content?.type === 'web' && webContainerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            const baseWidth = 1920; 
            const scale = width / baseWidth;
            setVirtualSize({ w: baseWidth, h: height / scale });
            setWebScale(scale);
          }
        }
      });
      resizeObserver.observe(webContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [content]);

  useEffect(() => {
    if (content?.type === 'image' && content.images?.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % content.images.length);
      }, (content.speed || 5) * 1000);
      return () => clearInterval(interval);
    }
  }, [content]);

  useEffect(() => {
    if (content?.type === 'weather') {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      
      const fetchWeather = async () => {
        try {
          const lat = content.lat || 25.0330;
          const lon = content.lon || 121.5654;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1&time=${Date.now()}`);
          const data = await res.json();
          setWeatherData(data);
        } catch (e) {
          console.error("Weather fetch error", e);
        }
      };
      
      fetchWeather();
      const weatherTimer = setInterval(fetchWeather, 300000); 
      
      return () => {
        clearInterval(timer);
        clearInterval(weatherTimer);
      };
    }
  }, [content]);

  if (!content) return null;

  switch (content.type) {
    case 'weather':
      if (!weatherData || !weatherData.current) return <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white"><Loader2 className="animate-spin text-blue-400" size={32}/><span className="ml-2 text-sm text-slate-400">載入氣象資訊...</span></div>;
      
      const { current, daily } = weatherData;
      const todayMax = daily.temperature_2m_max[0];
      const todayMin = daily.temperature_2m_min[0];
      const cityName = content.cityName || '臺北市';

      return (
        <div ref={containerRef} className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
             <div className="absolute -top-[20%] -right-[10%] w-[60%] pt-[60%] bg-blue-500 rounded-full blur-[100px]"></div>
             <div className="absolute -bottom-[20%] -left-[10%] w-[50%] pt-[50%] bg-purple-500 rounded-full blur-[100px]"></div>
          </div>

          <div className={`w-full h-full flex p-4 md:p-6 z-10 relative ${isBanner ? 'flex-row items-center justify-between' : 'flex-col justify-between'}`}>
            <div className={`${isBanner ? 'flex items-center gap-8' : 'text-left'}`}>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={isBanner ? 20 : 24} className="text-red-400" />
                    <h2 className={`${isBanner ? 'text-3xl' : 'text-3xl md:text-5xl'} font-bold tracking-wider drop-shadow-md`}>
                      {cityName}
                    </h2>
                  </div>
                  <p className="text-slate-300 font-mono text-sm md:text-base opacity-80">
                    {currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                  </p>
               </div>
               {isBanner && (
                 <div className="h-12 w-[1px] bg-white/20 mx-4"></div>
               )}
               <p className={`${isBanner ? 'text-4xl' : 'text-5xl md:text-7xl mt-4'} font-mono font-bold text-white drop-shadow-lg tabular-nums`}>
                 {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
               </p>
            </div>

            <div className={`flex items-center ${isBanner ? 'gap-8' : 'flex-1 justify-center flex-col'}`}>
               <div className={`flex items-center ${isBanner ? 'gap-4' : 'flex-col gap-2'}`}>
                  <div className={`${isBanner ? 'w-16 h-16' : 'w-32 h-32 md:w-48 md:h-48'} drop-shadow-2xl filter`}>
                    {getWeatherIcon(current.weather_code, current.is_day)}
                  </div>
                  <div className={`flex flex-col ${isBanner ? 'items-start' : 'items-center'}`}>
                    <span className={`${isBanner ? 'text-5xl' : 'text-6xl md:text-8xl'} font-bold leading-none`}>
                      {Math.round(current.temperature_2m)}°
                    </span>
                    <span className="text-lg md:text-2xl font-light opacity-90 mt-1">
                      {getWeatherStatusText(current.weather_code)}
                    </span>
                  </div>
               </div>
               
               <div className={`flex ${isBanner ? 'flex-col gap-1 border-l border-white/20 pl-6' : 'mt-8 gap-8 w-full justify-center'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm uppercase text-slate-400">最高</span>
                    <span className="text-xl md:text-2xl font-bold text-red-300">{Math.round(todayMax)}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm uppercase text-slate-400">最低</span>
                    <span className="text-xl md:text-2xl font-bold text-blue-300">{Math.round(todayMin)}°</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      );

    case 'image':
      if (!content.images || content.images.length === 0) return null;
      return (
        <div className="w-full h-full relative overflow-hidden bg-black">
          {content.images.map((img: string, idx: number) => (
             <img key={idx} src={img} alt={`Slide ${idx}`} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`} />
          ))}
        </div>
      );
    case 'web':
      let safeUrl = content.url;
      if (safeUrl && !safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
        safeUrl = `https://${safeUrl}`;
      }
      
      const transformedUrl = transformWebUrl(safeUrl);
      const isVideoFile = transformedUrl.match(/\.(mp4|webm|ogg|mov)$/i);

      if (isVideoFile) {
         return (
          <div className="w-full h-full bg-black relative flex items-center justify-center">
            <video 
              src={transformedUrl}
              className="w-full h-full object-contain pointer-events-none"
              autoPlay loop muted playsInline
            />
            {!isPlaying && <div className="absolute inset-0 bg-transparent" />}
          </div>
         );
      }
      
      // Use proxy for all URLs to bypass X-Frame-Options
      const finalUrl = `/api/proxy?url=${encodeURIComponent(transformedUrl)}`;

      return (
        <div ref={webContainerRef} className="w-full h-full bg-slate-900 relative group overflow-hidden flex items-center justify-center">
          {transformedUrl ? (
            <iframe 
              src={finalUrl} 
              style={{
                 width: `${virtualSize.w}px`,
                 height: `${virtualSize.h}px`,
                 transform: `scale(${webScale})`,
                 transformOrigin: 'top left',
                 position: 'absolute',
                 top: 0,
                 left: 0,
                 border: 'none',
              }}
              className={`${isPlaying ? 'pointer-events-auto' : 'pointer-events-none select-none'} bg-white`}
              title="Web View" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900">
              <Globe size={48} className="mb-2 opacity-50"/>
              <p>請輸入網址</p>
            </div>
          )}
          {!isPlaying && <div className="absolute inset-0 bg-transparent z-10" />}
          
          {transformedUrl && (
            <a 
              href={safeUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg flex items-center gap-2 ${!isPlaying && 'pointer-events-none'}`} 
              title="在新視窗開啟"
            >
              <ExternalLink size={18} />
            </a>
          )}
        </div>
      );

    case 'video':
      if (content.videoSourceType === 'youtube') {
        const videoId = getYouTubeVideoId(content.url);
        if (videoId) {
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '*';
          const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&origin=${encodeURIComponent(currentOrigin)}`;
          
          return (
            <div className="w-full h-full bg-black relative group">
              <iframe 
                width="100%" 
                height="100%" 
                src={embedUrl} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerPolicy="strict-origin-when-cross-origin" 
                allowFullScreen 
                className={isPlaying ? "w-full h-full" : "w-full h-full pointer-events-none"} 
              ></iframe>
               {!isPlaying && <div className="absolute inset-0 bg-transparent z-10" />}
               
               <a 
                href={`https://www.youtube.com/watch?v=${videoId}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`absolute bottom-4 right-4 bg-red-600 hover:bg-red-500 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg flex items-center gap-2 ${!isPlaying && 'pointer-events-none'}`} 
                title="若 YouTube 顯示錯誤，請點此在新視窗開啟觀看"
              >
                <ExternalLink size={18} />
              </a>
            </div>
          );
        } else {
           return (
            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-red-400 p-4 text-center">
               <AlertCircle size={48} className="mb-2 opacity-80"/>
               <p className="font-bold">無效的 YouTube ID 或連結</p>
               <p className="text-xs text-slate-500 mt-1">請重新確認輸入的內容</p>
            </div>
           );
        }
      } 
      
      if (content.videoSourceType === 'file' && content.url) {
        return (
          <div className="w-full h-full bg-black relative flex items-center justify-center">
            <video src={content.url} className="w-full h-full object-contain pointer-events-none" autoPlay loop muted playsInline />
            {!isPlaying && <div className="absolute inset-0 bg-transparent z-10" />}
          </div>
        );
      }
      
      return <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-500"><Youtube size={48} className="mb-2 opacity-50"/><p>請設定影片來源</p></div>;
      
    case 'text':
      return (
        <div className="w-full h-full relative flex items-center justify-center p-4 text-center" style={{ backgroundImage: `url(${DEFAULT_TEXT_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 w-full max-h-full overflow-hidden flex items-center justify-center">
             <h2 className="text-white font-bold text-2xl md:text-4xl drop-shadow-lg break-words whitespace-pre-wrap overflow-wrap-anywhere">{content.text || "請輸入文字內容"}</h2>
          </div>
        </div>
      );
    default: return null;
  }
};
