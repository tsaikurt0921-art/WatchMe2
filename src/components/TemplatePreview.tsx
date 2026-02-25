import React from 'react';

const Block = ({ className = "", color = "bg-slate-700/50", label = "", ...props }: any) => (
  <div {...props} className={`w-full h-full rounded-[1px] border border-slate-600/30 ${color} ${className} flex items-center justify-center`}>
     {label && <span className="text-[8px] text-white/30">{label}</span>}
  </div>
);

export const TemplatePreview = ({ layout, type }: { layout: string, type: string }) => {
  const isLandscape = type === 'landscape';
  const containerClass = isLandscape ? 'w-full aspect-video' : 'h-full aspect-[9/16] mx-auto';

  const renderLayout = () => {
    switch (layout) {
      // Landscape
      case 'L_FULL_16_9': return <Block color="bg-blue-500/20" label="16:9" />;
      case 'L_GRID_4': return <div className="grid grid-cols-2 grid-rows-2 h-full"><Block label="16:9"/><Block label="16:9"/><Block label="16:9"/><Block label="16:9"/></div>;
      case 'L_BANNER_SANDWICH': return <div className="flex flex-col h-full"><div className="h-[25%]"><Block color="bg-yellow-500/20" label="Banner" /></div><div className="h-[50%] flex"><div className="w-1/2"><Block label="16:9"/></div><div className="w-1/2"><Block label="16:9"/></div></div><div className="h-[25%]"><Block color="bg-yellow-500/20" label="Banner" /></div></div>;
      case 'L_MAIN_RIGHT_COL': return <div className="flex h-full"><div className="w-[75%]"><Block color="bg-purple-500/20" label="4:3" /></div><div className="w-[25%] flex flex-col"><div className="h-1/4"><Block label="16:9"/></div><div className="h-1/4"><Block label="16:9"/></div><div className="h-1/4"><Block label="16:9"/></div><div className="h-1/4"><Block label="16:9"/></div></div></div>;
      case 'L_ALL_BANNERS': return <div className="flex flex-col h-full"><div className="h-1/4"><Block label="Banner"/></div><div className="h-1/4"><Block label="Banner"/></div><div className="h-1/4"><Block label="Banner"/></div><div className="h-1/4"><Block label="Banner"/></div></div>;
      case 'L_TOP_BANNER_SPLIT': return <div className="flex flex-col h-full"><div className="h-[25%]"><Block color="bg-yellow-500/20" label="Banner" /></div><div className="h-[75%] flex"><div className="w-[75%]"><Block label="16:9" /></div><div className="w-[25%] flex flex-col"><div className="h-1/3"><Block label="16:9"/></div><div className="h-1/3"><Block label="16:9"/></div><div className="h-1/3"><Block label="16:9"/></div></div></div></div>;
      case 'L_GRID_9': return <div className="grid grid-cols-3 grid-rows-3 h-full">{[...Array(9)].map((_, i) => <Block key={i} label="16:9" />)}</div>;
      case 'L_LEFT_COL_MAIN_RIGHT': return <div className="flex h-full"><div className="w-[25%] flex flex-col"><div className="h-1/4"><Block label="16:9"/></div><div className="h-1/4"><Block label="16:9"/></div><div className="h-1/4"><Block label="16:9"/></div><div className="h-1/4"><Block label="16:9"/></div></div><div className="w-[75%]"><Block color="bg-purple-500/20" label="4:3" /></div></div>;
      case 'L_3_PORTRAIT': return <div className="flex h-full justify-center gap-1 bg-black/20"><div className="h-full aspect-[9/16]"><Block label="9:16"/></div><div className="h-full aspect-[9/16]"><Block label="9:16"/></div><div className="h-full aspect-[9/16]"><Block label="9:16"/></div></div>;
      case 'L_SPLIT_AND_BANNERS': return <div className="flex flex-col h-full"><div className="h-[50%] flex"><div className="w-1/2"><Block label="16:9"/></div><div className="w-1/2"><Block label="16:9"/></div></div><div className="h-[25%]"><Block color="bg-yellow-500/20" label="Banner" /></div><div className="h-[25%]"><Block color="bg-yellow-500/20" label="Banner" /></div></div>;

      // Portrait
      case 'P_FULL_9_16': return <Block color="bg-blue-500/20" label="9:16" />;
      case 'P_GRID_4_9_16': return <div className="grid grid-cols-2 grid-rows-2 h-full"><Block label="9:16"/><Block label="9:16"/><Block label="9:16"/><Block label="9:16"/></div>;
      case 'P_STACK_3_16_9': return <div className="flex flex-col items-center justify-center h-full gap-[1px]"><div className="w-full aspect-video"><Block label="16:9"/></div><div className="w-full aspect-video"><Block label="16:9"/></div><div className="w-full aspect-video"><Block label="16:9"/></div></div>;
      case 'P_STACK_2_4_3': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px]"><div className="w-full aspect-[4/3]"><Block label="4:3"/></div><div className="w-full aspect-[4/3]"><Block label="4:3"/></div></div>;
      case 'P_HYBRID_TOP_16_9_BOT_9_16': return <div className="flex flex-col items-center justify-center h-full gap-[1px]"><div className="w-full aspect-video"><Block label="16:9"/></div><div className="w-full flex gap-[1px] aspect-[18/16]"><div className="w-1/2 h-full"><Block label="9:16"/></div><div className="w-1/2 h-full"><Block label="9:16"/></div></div></div>;
      case 'P_HYBRID_TOP_9_16_BOT_16_9': return <div className="flex flex-col items-center justify-center h-full gap-[1px]"><div className="w-full flex gap-[1px] aspect-[18/16]"><div className="w-1/2 h-full"><Block label="9:16"/></div><div className="w-1/2 h-full"><Block label="9:16"/></div></div><div className="w-full aspect-video"><Block label="16:9"/></div></div>;
      case 'P_GRID_12_16_9': return <div className="w-full h-full flex flex-col items-center justify-center bg-black"><div className="w-full grid grid-cols-2 grid-rows-6 gap-[1px]">{[...Array(12)].map((_, i) => <Block key={i} label="16:9" />)}</div></div>;
      case 'P_BANNER_12': return <div className="w-full h-full flex flex-col h-full gap-[1px] justify-center">{[...Array(12)].map((_, i) => <div key={i} className="w-full aspect-[1080/152]"><Block label="Banner" color="bg-yellow-500/10"/></div>)}</div>;
      case 'P_MAIN_4_3_BOT_BANNER': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-[4/3]"><Block label="4:3"/></div><div className="w-full flex flex-col gap-[1px]">{[...Array(4)].map((_, i) => <div key={i} className="w-full aspect-[1080/152]"><Block label="Banner"/></div>)}</div></div>;
      case 'P_MENU_5_ZONE': return <div className="w-full h-full flex flex-col items-center justify-center h-full gap-[1px] bg-black"><div className="w-full aspect-video"><Block label="16:9"/></div><div className="w-full grid grid-cols-2 gap-[1px] aspect-[32/9]"><Block label="16:9"/><Block label="16:9"/><Block label="16:9"/><Block label="16:9"/></div></div>;
      default: return <Block />;
    }
  };

  return (
    <div className={`${containerClass} bg-slate-900 border border-slate-700 p-1 shadow-inner flex items-center justify-center`}>
      <div className="w-full h-full">{renderLayout()}</div>
    </div>
  );
};
