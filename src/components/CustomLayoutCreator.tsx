import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Move, Maximize, Trash2, Save, Layout, Smartphone, Monitor, Loader2, Type } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export const CustomLayoutCreator = ({ isOpen, onClose, onSave, initialLayout }: any) => {
  const [name, setName] = useState(initialLayout?.name || '我的自訂版型');
  const [type, setType] = useState<'landscape' | 'portrait'>(initialLayout?.type || 'landscape');
  const [zones, setZones] = useState<any[]>(initialLayout?.zones || []);
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  
  // Grid settings
  const GRID_SIZE = 24; // 24x24 grid
  const snapToGrid = (val: number) => Math.round(val / (100 / GRID_SIZE)) * (100 / GRID_SIZE);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const q = query(collection(db, 'templateAssets'));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssets(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'templateAssets');
    } finally {
      setLoadingAssets(false);
    }
  };

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
      category: block.category,
      x: 0,
      y: 0,
      w: snapToGrid(Math.min(w, 100)),
      h: snapToGrid(Math.min(h, 100))
    };
    setZones([...zones, newZone]);
    setActiveZoneId(newId);
  };

  const addPresetZone = (asset: any) => {
    const newId = zones.length > 0 ? Math.max(...zones.map(z => z.id)) + 1 : 0;
    
    // Determine dimensions based on category
    let w = 50;
    let h = 50;
    
    if (asset.category === '16:9') {
      w = 50;
      h = snapToGrid(50 * (9/16) * (16/9)); // Adjust for canvas ratio if needed, but simplified for now
    } else if (asset.category === '9:16') {
      w = 25;
      h = snapToGrid(25 * (16/9) * (16/9)); // Adjust for canvas ratio
    } else if (asset.category === 'banner') {
      w = 100;
      h = snapToGrid(15);
    }

    const newZone = {
      id: newId,
      type: 'preset',
      blockName: `圖文: ${asset.name}`,
      category: asset.category,
      assetUrl: asset.url,
      text: '請輸入文字',
      x: 0,
      y: 0,
      w: Math.min(w, 100),
      h: Math.min(h, 100)
    };
    setZones([...zones, newZone]);
    setActiveZoneId(newId);
  };

  const applyTemplate = (templateId: string) => {
    let newZones: any[] = [];
    if (templateId === 'banner-grid') {
      // Top Banner
      newZones.push({ id: 0, type: 'video', blockName: 'Banner', x: 0, y: 0, w: 100, h: snapToGrid(15) });
      // Large Left
      newZones.push({ id: 1, type: 'video', blockName: '16:9 主畫面', x: 0, y: snapToGrid(15), w: snapToGrid(75), h: snapToGrid(85) });
      // Right Column
      const sideH = snapToGrid(85 / 3);
      newZones.push({ id: 2, type: 'video', blockName: '16:9 小', x: snapToGrid(75), y: snapToGrid(15), w: snapToGrid(25), h: sideH });
      newZones.push({ id: 3, type: 'video', blockName: '16:9 小', x: snapToGrid(75), y: snapToGrid(15) + sideH, w: snapToGrid(25), h: sideH });
      newZones.push({ id: 4, type: 'video', blockName: '16:9 小', x: snapToGrid(75), y: snapToGrid(15) + sideH * 2, w: snapToGrid(25), h: sideH });
    } else if (templateId === 'sidebar-main') {
      // Left Sidebar (4 blocks)
      const sideH = snapToGrid(100 / 4);
      newZones.push({ id: 0, type: 'video', blockName: '16:9 小', x: 0, y: 0, w: snapToGrid(25), h: sideH });
      newZones.push({ id: 1, type: 'video', blockName: '16:9 小', x: 0, y: sideH, w: snapToGrid(25), h: sideH });
      newZones.push({ id: 2, type: 'video', blockName: '16:9 小', x: 0, y: sideH * 2, w: snapToGrid(25), h: sideH });
      newZones.push({ id: 3, type: 'video', blockName: '16:9 小', x: 0, y: sideH * 3, w: snapToGrid(25), h: sideH });
      // Right Main
      newZones.push({ id: 4, type: 'video', blockName: '4:3 主畫面', x: snapToGrid(25), y: 0, w: snapToGrid(75), h: 100 });
    }
    setZones(newZones);
    setActiveZoneId(null);
  };

  const removeZone = (id: number) => {
    setZones(zones.filter(z => z.id !== id));
    if (activeZoneId === id) setActiveZoneId(null);
  };

  const handleMouseDown = (e: React.MouseEvent, id: number, action: 'drag' | 'resize', dir?: string) => {
    e.stopPropagation();
    setActiveZoneId(id);
    const zone = zones.find(z => z.id === id);
    if (!zone || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: zone.x, y: zone.y, w: zone.w, h: zone.h });
    
    if (action === 'drag') setIsDragging(true);
    if (action === 'resize') {
      setIsResizing(true);
      setResizeDir(dir || 'br');
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if ((!isDragging && !isResizing) || activeZoneId === null || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.y) / rect.height) * 100;

      setZones(prev => prev.map(z => {
        if (z.id !== activeZoneId) return z;
        
        if (isDragging) {
          return {
            ...z,
            x: Math.max(0, Math.min(100 - z.w, snapToGrid(initialPos.x + dx))),
            y: Math.max(0, Math.min(100 - z.h, snapToGrid(initialPos.y + dy)))
          };
        }

        if (isResizing) {
          let newW = z.w;
          let newH = z.h;
          let newX = z.x;
          let newY = z.y;

          if (resizeDir?.includes('r')) newW = snapToGrid(Math.max(5, initialPos.w + dx));
          if (resizeDir?.includes('b')) newH = snapToGrid(Math.max(5, initialPos.h + dy));
          if (resizeDir?.includes('l')) {
            const potentialW = snapToGrid(initialPos.w - dx);
            if (potentialW >= 5) {
              newW = potentialW;
              newX = snapToGrid(initialPos.x + dx);
            }
          }
          if (resizeDir?.includes('t')) {
            const potentialH = snapToGrid(initialPos.h - dy);
            if (potentialH >= 5) {
              newH = potentialH;
              newY = snapToGrid(initialPos.y + dy);
            }
          }

          return {
            ...z,
            w: Math.min(100 - newX, newW),
            h: Math.min(100 - newY, newH),
            x: Math.max(0, newX),
            y: Math.max(0, newY)
          };
        }
        
        return z;
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

  const updateZoneText = (id: number, text: string) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, text } : z));
  };

  if (!isOpen) return null;

  const activeZone = zones.find(z => z.id === activeZoneId);

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
          {activeZone && activeZone.type === 'preset' && (
            <div className="space-y-4 p-6 bg-blue-50 rounded-3xl border border-blue-100 animate-in slide-in-from-left duration-300">
              <div className="flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-xs">
                <Type size={18} />
                <span>編輯圖文內容</span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">顯示文字</label>
                <textarea 
                  value={activeZone.text || ''}
                  onChange={(e) => updateZoneText(activeZone.id, e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[100px] resize-none"
                  placeholder="輸入要顯示在圖片上的文字..."
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-blue-400 font-bold italic">
                <div className="w-1 h-1 rounded-full bg-blue-400" />
                文字將自動疊加在底圖中央
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">系統圖文素材</h3>
              <div className="grid grid-cols-2 gap-2">
                {loadingAssets ? (
                  <div className="col-span-2 py-4 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={20} /></div>
                ) : assets.length > 0 ? (
                  assets.map(asset => (
                    <button 
                      key={asset.id} 
                      onClick={() => addPresetZone(asset)} 
                      className="group relative aspect-video rounded-xl border border-slate-200 overflow-hidden hover:border-blue-500 transition-all"
                    >
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus size={20} className="text-white" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-[8px] text-white font-bold truncate">
                        {asset.name}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="col-span-2 text-[10px] text-slate-400 text-center py-2">尚無素材，請至後端上傳</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">快速版型範本</h3>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => applyTemplate('banner-grid')} className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Layout size={18} /> 橫幅 + 側邊欄
                </button>
                <button onClick={() => applyTemplate('sidebar-main')} className="flex items-center gap-3 p-3 rounded-xl border border-purple-100 bg-purple-50 text-purple-600 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Layout size={18} /> 側邊欄 + 主畫面
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">16:9 橫式區塊</h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: '16:9 滿版', ratio: 16/9, defaultW: 100, color: 'bg-red-50 text-red-600 border-red-100', category: '16:9' },
                  { label: '16:9 中', ratio: 16/9, defaultW: 50, color: 'bg-red-50 text-red-600 border-red-100', category: '16:9' },
                  { label: '16:9 小', ratio: 16/9, defaultW: 25, color: 'bg-red-50 text-red-600 border-red-100', category: '16:9' },
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
                  { label: '9:16 滿版', ratio: 9/16, defaultW: 100, color: 'bg-blue-50 text-blue-600 border-blue-100', category: '9:16' },
                  { label: '9:16 中', ratio: 9/16, defaultW: 50, color: 'bg-blue-50 text-blue-600 border-blue-100', category: '9:16' },
                  { label: '9:16 小', ratio: 9/16, defaultW: 25, color: 'bg-blue-50 text-blue-600 border-blue-100', category: '9:16' },
                ].map(block => (
                  <button key={block.label} onClick={() => addZone(block)} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] group ${block.color}`}>
                    <span className="font-bold text-sm">{block.label}</span>
                    <Plus size={16} className="transition-transform group-hover:rotate-90" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">4:3 比例區塊</h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: '4:3 滿版', ratio: 4/3, defaultW: 100, color: 'bg-purple-50 text-purple-600 border-purple-100', category: '16:9' },
                  { label: '4:3 中', ratio: 4/3, defaultW: 50, color: 'bg-purple-50 text-purple-600 border-purple-100', category: '16:9' },
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
                  { label: '橫幅 全寬', ratio: 1920/270, defaultW: 100, color: 'bg-amber-50 text-amber-600 border-amber-100', category: 'banner' },
                  { label: '橫幅 半寬', ratio: 1920/270, defaultW: 50, color: 'bg-amber-50 text-amber-600 border-amber-100', category: 'banner' },
                  { label: '橫幅 小', ratio: 1920/270, defaultW: 25, color: 'bg-amber-50 text-amber-600 border-amber-100', category: 'banner' },
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
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, backgroundSize: `${100/GRID_SIZE}% ${100/GRID_SIZE}%` }}></div>
            
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
                  <span className="text-slate-900 font-black text-[10px] md:text-xs uppercase tracking-widest opacity-80 text-center px-2">{zone.blockName}</span>
                  <span className="text-slate-400 text-[8px] md:text-[10px] font-bold">區塊 {zone.id + 1}</span>
                </div>

                {/* Resize Handles */}
                {activeZoneId === zone.id && (
                  <>
                    <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-[60]" onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'tl')} />
                    <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-[60]" onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'tr')} />
                    <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-[60]" onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'bl')} />
                    <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-[60]" onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'br')} />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1.5 cursor-n-resize z-[60]" onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 't')} />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1.5 cursor-s-resize z-[60]" onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'b')} />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-full cursor-w-resize z-[60]" onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'l')} />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-full cursor-e-resize z-[60]" onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'r')} />
                  </>
                )}

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
