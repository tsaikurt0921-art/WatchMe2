import React from 'react';
import { Settings, Plus } from 'lucide-react';
import { ZoneContentRenderer } from './ZoneContentRenderer';

export const LayoutRenderer = ({ layout, zonesData, onZoneClick, isPlaying }: any) => {
  const Zone = ({ index, className = "", label = "" }: any) => {
    const hasContent = !!zonesData[index];
    return (
      <div 
        onClick={() => !isPlaying && onZoneClick(index)} 
        className={`relative overflow-hidden group transition-all duration-300 ${
          isPlaying ? 'border-0' : `cursor-pointer border ${hasContent ? 'border-transparent hover:border-blue-400' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-blue-500'}`
        } ${className}`}
      >
        {hasContent ? <ZoneContentRenderer content={zonesData[index]} isPlaying={isPlaying} /> : !isPlaying && (
            <div className="flex h-full w-full flex-col items-center justify-center text-slate-500 transition-colors group-hover:text-blue-400">
              <Plus size={24} className="mb-1" />
              <span className="text-xs font-medium text-center px-2">Zone {index + 1}<br/><span className="opacity-50 text-[10px]">{label}</span></span>
            </div>
        )}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-20">
            <div className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg flex items-center gap-2"><Settings size={16} />{hasContent ? '編輯' : '新增'}</div>
          </div>
        )}
      </div>
    );
  };

  switch (layout) {
    case 'L_FULL_16_9': return <div className="w-full h-full"><Zone index={0} className="w-full h-full" label="16:9" /></div>;
    case 'L_GRID_4': return <div className="w-full h-full grid grid-cols-2 grid-rows-2"><Zone index={0} label="16:9" /><Zone index={1} label="16:9" /><Zone index={2} label="16:9" /><Zone index={3} label="16:9" /></div>;
    case 'L_BANNER_SANDWICH': return <div className="w-full h-full flex flex-col"><div className="h-[25%]"><Zone index={0} className="w-full h-full" label="1920x270" /></div><div className="h-[50%] flex"><div className="w-1/2"><Zone index={1} className="w-full h-full" label="16:9" /></div><div className="w-1/2"><Zone index={2} className="w-full h-full" label="16:9" /></div></div><div className="h-[25%]"><Zone index={3} className="w-full h-full" label="1920x270" /></div></div>;
    case 'L_MAIN_RIGHT_COL': return <div className="w-full h-full flex"><div className="w-[75%]"><Zone index={0} className="w-full h-full" label="4:3 (1440x1080)" /></div><div className="w-[25%] flex flex-col"><Zone index={1} className="h-1/4" label="16:9" /><Zone index={2} className="h-1/4" label="16:9" /><Zone index={3} className="h-1/4" label="16:9" /><Zone index={4} className="h-1/4" label="16:9" /></div></div>;
    case 'L_ALL_BANNERS': return <div className="w-full h-full flex flex-col"><Zone index={0} className="h-1/4" label="1920x270" /><Zone index={1} className="h-1/4" label="1920x270" /><Zone index={2} className="h-1/4" label="1920x270" /><Zone index={3} className="h-1/4" label="1920x270" /></div>;
    case 'L_TOP_BANNER_SPLIT': return <div className="w-full h-full flex flex-col"><div className="h-[25%]"><Zone index={0} className="w-full h-full" label="1920x270" /></div><div className="h-[75%] flex"><div className="w-[75%]"><Zone index={1} className="w-full h-full" label="16:9 (1440x810)" /></div><div className="w-[25%] flex flex-col"><Zone index={2} className="h-1/3" label="16:9" /><Zone index={3} className="h-1/3" label="16:9" /><Zone index={4} className="h-1/3" label="16:9" /></div></div></div>;
    case 'L_GRID_9': return <div className="w-full h-full grid grid-cols-3 grid-rows-3">{[...Array(9)].map((_, i) => <Zone key={i} index={i} label="16:9" />)}</div>;
    case 'L_LEFT_COL_MAIN_RIGHT': return <div className="w-full h-full flex"><div className="w-[25%] flex flex-col"><Zone index={0} className="h-1/4" label="16:9" /><Zone index={1} className="h-1/4" label="16:9" /><Zone index={2} className="h-1/4" label="16:9" /><Zone index={3} className="h-1/4" label="16:9" /></div><div className="w-[75%]"><Zone index={4} className="w-full h-full" label="4:3 (1440x1080)" /></div></div>;
    case 'L_3_PORTRAIT': return <div className="w-full h-full flex items-center justify-center gap-1 bg-black"><div className="h-full aspect-[9/16]"><Zone index={0} className="w-full h-full" label="9:16" /></div><div className="h-full aspect-[9/16]"><Zone index={1} className="w-full h-full" label="9:16" /></div><div className="h-full aspect-[9/16]"><Zone index={2} className="w-full h-full" label="9:16" /></div></div>;
    case 'L_SPLIT_AND_BANNERS': return <div className="w-full h-full flex flex-col"><div className="h-[50%] flex"><div className="w-1/2"><Zone index={0} className="w-full h-full" label="16:9" /></div><div className="w-1/2"><Zone index={1} className="w-full h-full" label="16:9" /></div></div><div className="h-[25%]"><Zone index={2} className="w-full h-full" label="1920x270" /></div><div className="h-[25%]"><Zone index={3} className="w-full h-full" label="1920x270" /></div></div>;

    case 'P_FULL_9_16': return <div className="w-full h-full"><Zone index={0} className="w-full h-full" label="9:16" /></div>;
    case 'P_GRID_4_9_16': return <div className="w-full h-full grid grid-cols-2 grid-rows-2"><Zone index={0} label="9:16" /><Zone index={1} label="9:16" /><Zone index={2} label="9:16" /><Zone index={3} label="9:16" /></div>;
    case 'P_STACK_3_16_9': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-video"><Zone index={0} className="w-full h-full" label="16:9" /></div><div className="w-full aspect-video"><Zone index={1} className="w-full h-full" label="16:9" /></div><div className="w-full aspect-video"><Zone index={2} className="w-full h-full" label="16:9" /></div></div>;
    case 'P_STACK_2_4_3': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-[4/3]"><Zone index={0} className="w-full h-full" label="4:3" /></div><div className="w-full aspect-[4/3]"><Zone index={1} className="w-full h-full" label="4:3" /></div></div>;
    case 'P_HYBRID_TOP_16_9_BOT_9_16': return <div className="w-full h-full flex flex-col items-center justify-center gap-[1px] bg-black"><div className="w-full aspect-video"><Zone index={0} className="w-full h-full" label="16:9" /></div><div className="w-full flex gap-[1px] aspect-[18/16]"><div className="w-1/2 h-full"><Zone index={1} className="w-full h-full" label="9:16" /></div><div className="w-1/2 h-full"><Zone index={2} className="w-full h-full" label="9:16" /></div></div></div>;
    case 'P_HYBRID_TOP_9_16_BOT_16_9': return <div className="w-full h-full flex flex-col items-center justify-center gap-[1px] bg-black"><div className="w-full flex gap-[1px] aspect-[18/16]"><div className="w-1/2 h-full"><Zone index={0} className="w-full h-full" label="9:16" /></div><div className="w-1/2 h-full"><Zone index={1} className="w-full h-full" label="9:16" /></div></div><div className="w-full aspect-video"><Zone index={2} className="w-full h-full" label="16:9" /></div></div>;
    case 'P_GRID_12_16_9': return <div className="w-full h-full flex flex-col items-center justify-center bg-black"><div className="w-full grid grid-cols-2 grid-rows-6 gap-[1px]">{[...Array(12)].map((_, i) => <div key={i} className="aspect-video"><Zone index={i} className="w-full h-full" label="16:9" /></div>)}</div></div>;
    case 'P_BANNER_12': return <div className="w-full h-full flex flex-col h-full gap-[1px] justify-center">{[...Array(12)].map((_, i) => <div key={i} className="w-full aspect-[1080/152]"><Zone index={i} className="w-full h-full" label="Banner" /></div>)}</div>;
    case 'P_MAIN_4_3_BOT_BANNER': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-[4/3]"><Zone index={0} className="w-full h-full" label="4:3" /></div><div className="w-full flex flex-col gap-[1px]">{[...Array(4)].map((_, i) => <div key={i} className="w-full aspect-[1080/152]"><Zone index={i} className="w-full h-full" label="Banner" /></div>)}</div></div>;
    case 'P_MENU_5_ZONE': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-video"><Zone index={0} className="w-full h-full" label="16:9" /></div><div className="w-full grid grid-cols-2 gap-[1px] aspect-[32/9]"><Zone index={1} label="16:9" /><Zone index={2} label="16:9" /><Zone index={3} label="16:9" /><Zone index={4} label="16:9" /></div></div>;
    default: return <div className="w-full h-full flex items-center justify-center text-white border-2 border-dashed border-slate-700">Layout Error</div>;
  }
};
