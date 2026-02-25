import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, ArrowRight, Loader2, Maximize2, Layout, 
  Check, Plus, Settings, ArrowLeft, Trash2, Save, FolderHeart,
  Minimize2
} from 'lucide-react';
import { TEMPLATES } from './constants';
import { TemplatePreview } from './components/TemplatePreview';
import { LayoutRenderer } from './components/LayoutRenderer';
import { ConfigPanel } from './components/ConfigPanel';
import { SaveModal } from './components/SaveModal';

export default function App() {
  const [view, setView] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [templateSource, setTemplateSource] = useState('system'); 
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  
  const [zoneConfigs, setZoneConfigs] = useState<any>({});
  const [activeZoneId, setActiveZoneId] = useState<any>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const playerRef = useRef<HTMLDivElement>(null);

  // Fetch saved templates from local API
  const fetchSavedTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setSavedTemplates(data);
      }
    } catch (e) {
      console.error("Fetch templates error:", e);
    }
  };

  useEffect(() => {
    fetchSavedTemplates();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(console.error);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      if ((username === 'arron' && password === '8888') || (username === 'ccpinky' && password === 'yses521')) {
        setView('templates');
      } else {
        alert('帳號或密碼錯誤');
      }
      setIsLoading(false);
    }, 800);
  };

  const handleStartEditing = () => {
    if (selectedTemplate) {
      if (templateSource === 'user') {
        setZoneConfigs(selectedTemplate.zonesConfig || {});
      } else {
        setZoneConfigs({});
      }
      setView('editor');
    }
  };

  const handleZoneClick = (index: number) => {
    setActiveZoneId(index);
    setIsConfigPanelOpen(true);
  };

  const handleSaveZoneConfig = (config: any) => {
    setZoneConfigs((prev: any) => ({
      ...prev,
      [activeZoneId]: config
    }));
    setIsConfigPanelOpen(false);
  };

  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim()) return;
    
    const baseId = selectedTemplate.baseTemplateId || selectedTemplate.id;
    const type = selectedTemplate.type; 

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          baseTemplateId: baseId,
          zonesConfig: zoneConfigs,
          type: type
        })
      });

      if (res.ok) {
        setIsSaveModalOpen(false);
        setNewTemplateName('');
        alert('版型儲存成功！');
        fetchSavedTemplates(); // Refresh list
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert('儲存失敗，請稍後再試。');
    }
  };

  const toggleFullScreen = () => {
    if (isFullscreen) {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(console.error);
        }
        setIsFullscreen(false);
    } else {
        if (playerRef.current) {
            playerRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.log("Native fullscreen disallowed, using pseudo-fullscreen mode");
                setIsFullscreen(true);
            });
        }
    }
  };

  if (view === 'login') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden font-sans text-white">
        <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1492684223066-81342ee5ff30")' }} />
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-900/80 via-purple-900/60 to-black/80 backdrop-blur-[2px]" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <Play fill="white" size={40} className="ml-1 opacity-90" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">Watchme</h1>
            <p className="mt-2 text-lg font-light text-blue-200 tracking-widest uppercase opacity-80">互動式多媒體播放系統</p>
          </div>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl p-8 md:p-12">
            <h2 className="mb-6 text-center text-2xl font-medium text-white/90">歡迎回來</h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="使用者帳號" className="h-12 w-full rounded-xl bg-black/20 px-4 text-white outline-none focus:ring-2 focus:ring-blue-400/50" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密碼" className="h-12 w-full rounded-xl bg-black/20 px-4 text-white outline-none focus:ring-2 focus:ring-blue-400/50" />
              <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-medium text-white shadow-lg disabled:opacity-70">
                {isLoading ? <Loader2 className="animate-spin" /> : '登入系統'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'templates') {
    let currentTemplates = [];
    if (templateSource === 'system') {
      currentTemplates = TEMPLATES.filter(t => selectedFilter === 'all' || t.type === selectedFilter);
    } else {
      currentTemplates = savedTemplates.filter(t => selectedFilter === 'all' || t.type === selectedFilter);
    }

    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <nav className="flex h-16 items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3"><Play fill="white" size={16} /><span className="text-xl font-bold">Watchme</span></div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
             {username} <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">{username.charAt(0).toUpperCase()}</div>
          </div>
        </nav>
        <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full pb-24">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">選擇播放版型</h1>
              <div className="flex gap-4 border-b border-white/10">
                <button onClick={() => { setTemplateSource('system'); setSelectedTemplate(null); }} className={`pb-2 px-1 text-sm font-medium transition-colors ${templateSource === 'system' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>系統預設</button>
                <button onClick={() => { setTemplateSource('user'); setSelectedTemplate(null); }} className={`pb-2 px-1 text-sm font-medium transition-colors ${templateSource === 'user' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>我的版型 ({savedTemplates.length})</button>
              </div>
            </div>
            <div className="flex rounded-xl bg-slate-900 p-1 ring-1 ring-white/10">
              {['all', 'landscape', 'portrait'].map(f => (
                <button key={f} onClick={() => setSelectedFilter(f)} className={`px-4 py-2 text-sm rounded-lg capitalize ${selectedFilter === f ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {currentTemplates.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500">
                {templateSource === 'user' ? (
                  <>
                    <FolderHeart size={48} className="mx-auto mb-4 opacity-50"/>
                    <p>尚無儲存的版型</p>
                    <p className="text-xs mt-2">請先從系統預設版型中建立並儲存。</p>
                  </>
                ) : (
                  <p>沒有符合條件的版型</p>
                )}
              </div>
            )}
            {currentTemplates.map(t => {
              const baseTemplate = templateSource === 'user' ? TEMPLATES.find(sys => sys.id === t.baseTemplateId) : t;
              const layout = baseTemplate ? baseTemplate.layout : 'L_FULL_16_9';
              const type = baseTemplate ? baseTemplate.type : t.type;
              return (
                <div key={t.id} onClick={() => setSelectedTemplate(t)} className={`cursor-pointer rounded-2xl border bg-slate-900/50 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group ${selectedTemplate?.id === t.id ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-white/10 hover:border-white/20'}`}>
                  <div className="h-48 bg-slate-900/50 flex items-center justify-center p-6 relative">
                    <div className={`transition-transform duration-500 group-hover:scale-105 ${type === 'landscape' ? 'w-full' : 'h-full'}`}>
                       <TemplatePreview layout={layout} type={type} />
                    </div>
                    {selectedTemplate?.id === t.id && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in"><Check size={16} /></div>
                    )}
                  </div>
                  <div className="p-4 border-t border-white/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`font-semibold transition-colors ${selectedTemplate?.id === t.id ? 'text-blue-400' : 'text-white'}`}>{t.name}</h3>
                        {templateSource === 'system' && <p className="text-xs text-slate-500 mt-1">{t.category}</p>}
                        {templateSource === 'user' && <p className="text-[10px] text-slate-500 mt-1">建立於: {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '剛剛'}</p>}
                      </div>
                      {templateSource === 'system' && (
                        <div className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded border border-slate-700">{t.zoneCount} 區</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
        <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/90 border-t border-white/10 p-4 transition-transform z-50 ${selectedTemplate ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-[1600px] mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                <Layout size={20} className="text-blue-400"/>
              </div>
              <div>
                <p className="text-xs text-slate-400">已選擇{templateSource === 'user' ? '自訂' : ''}版型</p>
                <p className="text-white font-bold">{selectedTemplate?.name}</p>
              </div>
            </div>
            <button onClick={handleStartEditing} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-95">開始編輯版面 <ArrowRight size={18} /></button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'editor') {
    const baseTemplate = templateSource === 'user' ? TEMPLATES.find(t => t.id === selectedTemplate.baseTemplateId) : selectedTemplate;
    const layoutLayout = baseTemplate ? baseTemplate.layout : 'L_FULL_16_9';
    const isPortrait = (baseTemplate ? baseTemplate.type : 'landscape') === 'portrait';

    return (
      <div className="flex h-screen flex-col bg-slate-950 overflow-hidden">
        <nav className="flex h-16 items-center justify-between border-b border-white/10 bg-slate-900 px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('templates')} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="h-6 w-[1px] bg-white/10" />
            <div>
              <h1 className="text-lg font-bold text-white">{selectedTemplate.name}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span> 編輯模式
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors text-sm font-medium border-blue-500/30">
               <Save size={16} /> 另存版型
             </button>
             <button onClick={() => setZoneConfigs({})} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm">
               <Trash2 size={16} /> 清空內容
             </button>
             <button 
               onClick={toggleFullScreen} 
               className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium shadow-lg transition-all active:scale-95 ${isFullscreen ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-green-600 hover:bg-green-500 shadow-green-500/20'}`}
             >
               {isFullscreen ? <Minimize2 size={16} fill="white" /> : <Maximize2 size={16} fill="white" />}
               {isFullscreen ? '退出播放' : '全螢幕播放'}
             </button>
          </div>
        </nav>
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-slate-950 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div 
            ref={playerRef}
            className={`relative bg-black shadow-2xl ring-8 ring-slate-800 rounded-lg overflow-hidden transition-all duration-500 ease-in-out ${
              isFullscreen 
                ? 'w-full h-full max-w-none max-h-none ring-0 rounded-none fixed inset-0 z-50' 
                : (isPortrait ? 'h-[85vh] aspect-[9/16]' : 'w-[90%] max-w-[1400px] aspect-video')
            }`}
          >
            <LayoutRenderer 
              layout={layoutLayout} 
              zonesData={zoneConfigs} 
              onZoneClick={handleZoneClick} 
              isPlaying={isFullscreen}
            />
          </div>
        </div>
        {isConfigPanelOpen && (
          <ConfigPanel 
            activeZoneId={activeZoneId} 
            zoneConfigs={zoneConfigs} 
            handleSaveZoneConfig={handleSaveZoneConfig} 
            setIsConfigPanelOpen={setIsConfigPanelOpen} 
          />
        )}
        {isSaveModalOpen && (
          <SaveModal 
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            onConfirm={handleSaveAsTemplate}
            value={newTemplateName}
            onChange={(e: any) => setNewTemplateName(e.target.value)}
          />
        )}
      </div>
    );
  }
  return null;
}
