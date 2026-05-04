import React, { useEffect, useRef, useState } from 'react';
import { Settings, Plus, Volume2, VolumeX } from 'lucide-react';
import { ZoneContentRenderer } from './ZoneContentRenderer';

export const LayoutRenderer = ({ layout, zonesData, onZoneClick, isPlaying, customZones }: any) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [showInteractionPrompt, setShowInteractionPrompt] = useState(false);

  // Find audio config from any zone
  const firstAudioConfig = (Object.values(zonesData) as any[]).find((z: any) => z?.audioConfig?.url)?.audioConfig;

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && (userInteracted || firstAudioConfig?.autoplay)) {
        audioRef.current.play().catch(e => {
            // If autoplay failed, we don't show the prompt if it's NOT the active view
            // But App.tsx handles active view correctly.
            console.warn("Autoplay blocked", e);
        });
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0; // Reset to beginning when not active
      }
    }
  }, [isPlaying, userInteracted, firstAudioConfig]);

  useEffect(() => {
    if (isPlaying && firstAudioConfig?.url && firstAudioConfig?.autoplay && !userInteracted) {
      setShowInteractionPrompt(true);
    } else {
      setShowInteractionPrompt(false);
    }
  }, [isPlaying, firstAudioConfig, userInteracted]);

  const handleStartAudio = () => {
    setUserInteracted(true);
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.error("Playback failed:", err));
    }
  };

  const Zone = ({ index, className = "", label = "", style = {}, category = "" }: any) => {
    const hasContent = !!zonesData[index];
    return (
      <div 
        onClick={() => !isPlaying && onZoneClick(index, category || label)} 
        style={style}
        className={`relative overflow-hidden group transition-all duration-300 ${
          isPlaying ? 'border-0' : `cursor-pointer border ${hasContent ? 'border-transparent hover:border-blue-400' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-500'}`
        } ${className}`}
      >
        {hasContent ? <ZoneContentRenderer content={zonesData[index]} isPlaying={isPlaying} category={category} /> : !isPlaying && (
            <div className="flex h-full w-full flex-col items-center justify-center text-slate-400 transition-colors group-hover:text-blue-600">
              <Plus size={24} className="mb-1" />
              <span className="text-xs font-bold text-center px-2 uppercase tracking-widest opacity-80">Zone {index + 1}<br/><span className="opacity-50 text-[10px]">{label}</span></span>
            </div>
        )}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-20">
            <div className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-2xl flex items-center gap-2 scale-90 group-hover:scale-100 transition-transform"><Settings size={18} />{hasContent ? '編輯內容' : '新增內容'}</div>
          </div>
        )}
      </div>
    );
  };

  const renderLayout = () => {
    if (layout === 'custom' && customZones) {
        return (
          <div className="w-full h-full relative bg-black">
            {customZones.map((zone: any) => (
              <Zone 
                key={zone.id} 
                index={zone.id} 
                label={zone.blockName || zone.type}
                category={zone.category}
                style={{
                  position: 'absolute',
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`
                }}
              />
            ))}
          </div>
        );
      }

      switch (layout) {
        case 'L_FULL_16_9': return <div className="w-full h-full"><Zone index={0} className="w-full h-full" label="16:9" category="16:9" /></div>;
        case 'L_GRID_4': return <div className="w-full h-full grid grid-cols-2 grid-rows-2"><Zone index={0} label="16:9" category="16:9" /><Zone index={1} label="16:9" category="16:9" /><Zone index={2} label="16:9" category="16:9" /><Zone index={3} label="16:9" category="16:9" /></div>;
        case 'L_BANNER_SANDWICH': return <div className="w-full h-full flex flex-col"><div className="h-[25%]"><Zone index={0} className="w-full h-full" label="1920x270" category="banner" /></div><div className="h-[50%] flex"><div className="w-1/2"><Zone index={1} className="w-full h-full" label="16:9" category="16:9" /></div><div className="w-1/2"><Zone index={2} className="w-full h-full" label="16:9" category="16:9" /></div></div><div className="h-[25%]"><Zone index={3} className="w-full h-full" label="1920x270" category="banner" /></div></div>;
        case 'L_MAIN_RIGHT_COL': return <div className="w-full h-full flex"><div className="w-[75%]"><Zone index={0} className="w-full h-full" label="4:3 (1440x1080)" category="16:9" /></div><div className="w-[25%] flex flex-col"><Zone index={1} className="h-1/4" label="16:9" category="16:9" /><Zone index={2} className="h-1/4" label="16:9" category="16:9" /><Zone index={3} className="h-1/4" label="16:9" category="16:9" /><Zone index={4} className="h-1/4" label="16:9" category="16:9" /></div></div>;
        case 'L_ALL_BANNERS': return <div className="w-full h-full flex flex-col"><Zone index={0} className="h-1/4" label="1920x270" category="banner" /><Zone index={1} className="h-1/4" label="1920x270" category="banner" /><Zone index={2} className="h-1/4" label="1920x270" category="banner" /><Zone index={3} className="h-1/4" label="1920x270" category="banner" /></div>;
        case 'L_TOP_BANNER_SPLIT': return <div className="w-full h-full flex flex-col"><div className="h-[25%]"><Zone index={0} className="w-full h-full" label="1920x270" category="banner" /></div><div className="h-[75%] flex"><div className="w-[75%]"><Zone index={1} className="w-full h-full" label="16:9 (1440x810)" category="16:9" /></div><div className="w-[25%] flex flex-col"><Zone index={2} className="h-1/3" label="16:9" category="16:9" /><Zone index={3} className="h-1/3" label="16:9" category="16:9" /><Zone index={4} className="h-1/3" label="16:9" category="16:9" /></div></div></div>;
        case 'L_GRID_9': return <div className="w-full h-full grid grid-cols-3 grid-rows-3">{[...Array(9)].map((_, i) => <Zone key={i} index={i} label="16:9" category="16:9" />)}</div>;
        case 'L_LEFT_COL_MAIN_RIGHT': return <div className="w-full h-full flex"><div className="w-[25%] flex flex-col"><Zone index={0} className="h-1/4" label="16:9" category="16:9" /><Zone index={1} className="h-1/4" label="16:9" category="16:9" /><Zone index={2} className="h-1/4" label="16:9" category="16:9" /><Zone index={3} className="h-1/4" label="16:9" category="16:9" /></div><div className="w-[75%]"><Zone index={4} className="w-full h-full" label="4:3 (1440x1080)" category="16:9" /></div></div>;
        case 'L_3_PORTRAIT': return <div className="w-full h-full flex items-center justify-center gap-1 bg-black"><div className="h-full aspect-[9/16]"><Zone index={0} className="w-full h-full" label="9:16" category="9:16" /></div><div className="h-full aspect-[9/16]"><Zone index={1} className="w-full h-full" label="9:16" category="9:16" /></div><div className="h-full aspect-[9/16]"><Zone index={2} className="w-full h-full" label="9:16" category="9:16" /></div></div>;
        case 'L_SPLIT_AND_BANNERS': return <div className="w-full h-full flex flex-col"><div className="h-[50%] flex"><div className="w-1/2"><Zone index={0} className="w-full h-full" label="16:9" category="16:9" /></div><div className="w-1/2"><Zone index={1} className="w-full h-full" label="16:9" category="16:9" /></div></div><div className="h-[25%]"><Zone index={2} className="w-full h-full" label="1920x270" category="banner" /></div><div className="h-[25%]"><Zone index={3} className="w-full h-full" label="1920x270" category="banner" /></div></div>;
        case 'L_TOP_BANNER_LR_SPLIT': return <div className="w-full h-full flex flex-col"><div className="h-[25%]"><Zone index={0} className="w-full h-full" label="1920x270" category="banner" /></div><div className="h-[75%] flex"><div className="w-[75%]"><Zone index={1} className="w-full h-full" label="16:9" category="16:9" /></div><div className="w-[25%]"><Zone index={2} className="w-full h-full" label="6:19" category="9:16" /></div></div></div>;
    
        case 'P_FULL_9_16': return <div className="w-full h-full"><Zone index={0} className="w-full h-full" label="9:16" category="9:16" /></div>;
        case 'P_GRID_4_9_16': return <div className="w-full h-full grid grid-cols-2 grid-rows-2"><Zone index={0} label="9:16" category="9:16" /><Zone index={1} label="9:16" category="9:16" /><Zone index={2} label="9:16" category="9:16" /><Zone index={3} label="9:16" category="9:16" /></div>;
        case 'P_STACK_3_16_9': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-video"><Zone index={0} className="w-full h-full" label="16:9" category="16:9" /></div><div className="w-full aspect-video"><Zone index={1} className="w-full h-full" label="16:9" category="16:9" /></div><div className="w-full aspect-video"><Zone index={2} className="w-full h-full" label="16:9" category="16:9" /></div></div>;
        case 'P_STACK_2_4_3': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-[4/3]"><Zone index={0} className="w-full h-full" label="4:3" category="16:9" /></div><div className="w-full aspect-[4/3]"><Zone index={1} className="w-full h-full" label="4:3" category="16:9" /></div></div>;
        case 'P_HYBRID_TOP_16_9_BOT_9_16': return <div className="w-full h-full flex flex-col items-center justify-center gap-[1px] bg-black"><div className="w-full aspect-video"><Zone index={0} className="w-full h-full" label="16:9" category="16:9" /></div><div className="w-full flex gap-[1px] aspect-[18/16]"><div className="w-1/2 h-full"><Zone index={1} className="w-full h-full" label="9:16" category="9:16" /></div><div className="w-1/2 h-full"><Zone index={2} className="w-full h-full" label="9:16" category="9:16" /></div></div></div>;
        case 'P_HYBRID_TOP_9_16_BOT_16_9': return <div className="w-full h-full flex flex-col items-center justify-center gap-[1px] bg-black"><div className="w-full flex gap-[1px] aspect-[18/16]"><div className="w-1/2 h-full"><Zone index={0} className="w-full h-full" label="9:16" category="9:16" /></div><div className="w-1/2 h-full"><Zone index={1} className="w-full h-full" label="9:16" category="9:16" /></div></div><div className="w-full aspect-video"><Zone index={2} className="w-full h-full" label="16:9" category="16:9" /></div></div>;
        case 'P_GRID_12_16_9': return <div className="w-full h-full flex flex-col items-center justify-center bg-black"><div className="w-full grid grid-cols-2 grid-rows-6 gap-[1px]">{[...Array(12)].map((_, i) => <div key={i} className="aspect-video"><Zone index={i} className="w-full h-full" label="16:9" category="16:9" /></div>)}</div></div>;
        case 'P_BANNER_12': return <div className="w-full h-full flex flex-col h-full gap-[1px] justify-center">{[...Array(12)].map((_, i) => <div key={i} className="w-full aspect-[1080/152]"><Zone index={i} className="w-full h-full" label="Banner" category="banner" /></div>)}</div>;
        case 'P_MAIN_4_3_BOT_BANNER': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-[4/3]"><Zone index={0} className="w-full h-full" label="4:3" category="16:9" /></div><div className="w-full flex flex-col gap-[1px]">{[...Array(4)].map((_, i) => <div key={i} className="w-full aspect-[1080/152]"><Zone index={i} className="w-full h-full" label="Banner" category="banner" /></div>)}</div></div>;
        case 'P_MENU_5_ZONE': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-video"><Zone index={0} className="w-full h-full" label="16:9" category="16:9" /></div><div className="w-full grid grid-cols-2 gap-[1px] aspect-[32/9]"><Zone index={1} label="16:9" category="16:9" /><Zone index={2} label="16:9" category="16:9" /><Zone index={3} label="16:9" category="16:9" /><Zone index={4} label="16:9" category="16:9" /></div></div>;
        default: return <div className="w-full h-full flex items-center justify-center text-white border-2 border-dashed border-slate-700">Layout Error</div>;
      }
  };

  return (
    <div className="w-full h-full relative group">
      {renderLayout()}
      
      {/* Background Audio Player */}
      {firstAudioConfig?.url && (
        <audio 
          ref={audioRef}
          src={firstAudioConfig.url}
          loop={firstAudioConfig.loop}
          muted={!isPlaying} // Ensure it's muted if not active
        />
      )}

      {/* Playback Interaction Prompt */}
      {showInteractionPrompt && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-500 animate-in fade-in">
          <button 
            onClick={handleStartAudio}
            className="flex flex-col items-center gap-6 group/btn"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 rounded-full blur-2xl opacity-40 group-hover/btn:opacity-60 transition-opacity animate-pulse"></div>
              <div className="relative w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl transform transition-transform group-hover/btn:scale-110 active:scale-95">
                <Volume2 size={40} className="translate-x-0.5" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg">點擊播放聲音</h3>
              <p className="text-blue-200/80 font-bold text-sm tracking-widest uppercase">Click to Enable Audio Experience</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
