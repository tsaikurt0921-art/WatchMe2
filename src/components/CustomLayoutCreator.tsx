import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Move, Maximize, Trash2, Save, Layout, Smartphone, Monitor } from 'lucide-react';

export const CustomLayoutCreator = ({ isOpen, onClose, onSave, initialLayout }: any) => {
  const [name, setName] = useState(initialLayout?.name || '我的自訂版型');
  const [type, setType] = useState<'landscape' | 'portrait'>(initialLayout?.type || 'landscape');
  const [zones, setZones] = useState<any[]>(initialLayout?.zones || []);
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const addZone = (block: any) => {
    const newId = zones.length > 0 ? Math.max(...zones.map(z => z.id)) + 1 : 0;
    
    // Calculate dimensions based on canvas type and block ratio
    const canvasRatio = type === 'landscape' ? 16/9 : 9/16;
    const blockRatio = block.ratio;
    
    let w = block.defaultW;
    let h = w * (canvasRatio / blockRatio);
    
    // If height exceeds 100%, scale down width to fit height
    if (h > 100) {
      h = 100;
      w = h * (blockRatio / canvasRatio);
    }

    const newZone = {
      id: newId,
      type: 'video', // Default content type
      blockName: block.label,
      x: 0,
      y: 0,
      w: Math.min(w, 100),
      h: Math.min(h, 100)
    };
    setZones([...zones, newZone]);
    setActiveZoneId(newId);
  };

  const removeZone = (id: number) => {
    setZones(zones.filter(z => z.id !== id));
    if (activeZoneId === id) setActiveZoneId(null);
  };

  const handleMouseDown = (e: React.MouseEvent, id: number, action: 'drag' | 'resize') => {
    e.stopPropagation();
    setActiveZoneId(id);
    const zone = zones.find(z => z.id === id);
    if (!zone || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: zone.x, y: zone.y, w: zone.w, h: zone.h });
    
    if (action === 'drag') setIsDragging(true);
    // Resizing is disabled as per user request to use "defined blocks"
    // if (action === 'resize') setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || activeZoneId === null || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.y) / rect.height) * 100;

      setZones(prev => prev.map(z => {
        if (z.id !== activeZoneId) return z;
        
        return {
          ...z,
          x: Math.max(0, Math.min(100 - z.w, initialPos.x + dx)),
          y: Math.max(0, Math.min(100 - z.h, initialPos.y + dy))
        };
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, activeZoneId, dragStart, initialPos]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('請輸入版型名稱');
      return;
    }
    if (zones.length === 0) {
      alert('請至少新增一個區塊');
      return;
    }
    onSave({
      id: initialLayout?.id || Date.now().toString(),
      name,
      type,
      zones,
      createdAt: initialLayout?.createdAt || { seconds: Math.floor(Date.now() / 1000) }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-8 shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
            <X size={24} />
          </button>
          <div className="h-8 w-[1px] bg-slate-100" />
          <div className="flex flex-col">
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-300"
              placeholder="輸入版型名稱..."
            />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">自訂版型編輯器</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setType('landscape')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${type === 'landscape' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Monitor size={18} /> 橫式 (16:9)
            </button>
            <button 
              onClick={() => setType('portrait')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${type === 'portrait' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Smartphone size={18} /> 直式 (9:16)
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
          >
            <Save size={20} /> 儲存版型
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-slate-100 bg-white p-8 overflow-y-auto shrink-0 space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">16:9 橫式區塊</h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: '16:9 滿版', ratio: 16/9, defaultW: 100, color: 'bg-red-50 text-red-600 border-red-100' },
                  { label: '16:9 中', ratio: 16/9, defaultW: 50, color: 'bg-red-50 text-red-600 border-red-100' },
                  { label: '16:9 小', ratio: 16/9, defaultW: 25, color: 'bg-red-50 text-red-600 border-red-100' },
                ].map(block => (
                  <button key={block.label} onClick={() => addZone(block)} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] group ${block.color}`}>
                    <span className="font-bold text-sm">{block.label}</span>
                    <Plus size={16} className="transition-transform group-hover:rotate-90" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">9:16 直式區塊</h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: '9:16 滿版', ratio: 9/16, defaultW: 100, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                  { label: '9:16 中', ratio: 9/16, defaultW: 50, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                  { label: '9:16 小', ratio: 9/16, defaultW: 25, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                ].map(block => (
                  <button key={block.label} onClick={() => addZone(block)} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] group ${block.color}`}>
                    <span className="font-bold text-sm">{block.label}</span>
                    <Plus size={16} className="transition-transform group-hover:rotate-90" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">1920:270 橫幅區塊</h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: '橫幅 全寬', ratio: 1920/270, defaultW: 100, color: 'bg-amber-50 text-amber-600 border-amber-100' },
                  { label: '橫幅 半寬', ratio: 1920/270, defaultW: 50, color: 'bg-amber-50 text-amber-600 border-amber-100' },
                  { label: '橫幅 小', ratio: 1920/270, defaultW: 25, color: 'bg-amber-50 text-amber-600 border-amber-100' },
                ].map(block => (
                  <button key={block.label} onClick={() => addZone(block)} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] group ${block.color}`}>
                    <span className="font-bold text-sm">{block.label}</span>
                    <Plus size={16} className="transition-transform group-hover:rotate-90" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">操作說明</h3>
            <ul className="space-y-3 text-xs text-slate-500 font-medium">
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" /> 點擊上方預定義區塊新增至畫布</li>
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" /> 在畫布上拖曳區塊調整位置</li>
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" /> 選中區塊後可點擊右上角刪除</li>
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" /> 儲存後可在播放器設定內容</li>
            </ul>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-slate-50 p-12 overflow-auto flex items-center justify-center relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          <div 
            ref={canvasRef}
            className={`relative bg-white shadow-2xl rounded-2xl border-8 border-white overflow-hidden transition-all duration-500 ${type === 'landscape' ? 'w-full max-w-[1200px] aspect-video' : 'h-full aspect-[9/16]'}`}
          >
            {/* Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '5% 5%' }}></div>
            
            {zones.map(zone => (
              <div 
                key={zone.id}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                  zIndex: activeZoneId === zone.id ? 50 : 10
                }}
                className={`absolute group transition-shadow cursor-move ${activeZoneId === zone.id ? 'ring-4 ring-blue-600 shadow-2xl' : 'hover:ring-2 hover:ring-blue-400'}`}
                onMouseDown={(e) => handleMouseDown(e, zone.id, 'drag')}
              >
                <div className="w-full h-full flex flex-col items-center justify-center border border-slate-200 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm">
                  <span className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-80">{zone.blockName}</span>
                  <span className="text-slate-400 text-[10px] font-bold">區塊 {zone.id + 1}</span>
                </div>

                {/* Controls */}
                <div className={`absolute top-2 right-2 flex gap-1 transition-opacity z-50 ${activeZoneId === zone.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button 
                    onMouseDown={(e) => { e.stopPropagation(); removeZone(zone.id); }}
                    className="p-2.5 bg-red-600 text-white rounded-xl shadow-xl hover:bg-red-700 transition-all active:scale-90 flex items-center justify-center"
                    title="刪除區塊"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {zones.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 pointer-events-none">
                <Layout size={80} className="mb-4 opacity-20" />
                <p className="text-xl font-black uppercase tracking-[0.2em] opacity-20">空白畫布</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
