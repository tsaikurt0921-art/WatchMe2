import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, ArrowRight, Loader2, Maximize2, Layout, 
  Check, Plus, Settings, ArrowLeft, Trash2, Save, FolderHeart,
  Minimize2, LogOut, ShieldCheck, Key, AlertCircle, Clock, Share2, Link, Copy, X, Cast, Tag
} from 'lucide-react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, updateDoc, collection, addDoc, query, where, deleteDoc, orderBy, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { TEMPLATES } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { TemplatePreview } from './components/TemplatePreview';
import { LayoutRenderer } from './components/LayoutRenderer';
import { ConfigPanel } from './components/ConfigPanel';
import { SaveModal } from './components/SaveModal';
import { AdminDashboard } from './components/AdminDashboard';
import { LicenseInput } from './components/LicenseInput';
import { PricingModal } from './components/PricingModal';
import { CustomLayoutCreator } from './components/CustomLayoutCreator';
import { PlaybackProjects } from './components/PlaybackProjects';
import { UserProfile } from './types/user';
import { ErrorBoundary } from './components/ErrorBoundary';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('templates');
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [templateSource, setTemplateSource] = useState('system'); 
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  
  const [zoneConfigs, setZoneConfigs] = useState<any>({});
  const [activeZoneId, setActiveZoneId] = useState<any>(null);
  const [activeZoneCategory, setActiveZoneCategory] = useState<string>('');
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharedUrl, setSharedUrl] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isInvalidLink, setIsInvalidLink] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCustomCreatorOpen, setIsCustomCreatorOpen] = useState(false);
  const [editingCustomLayout, setEditingCustomLayout] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [currentProjectItemIndex, setCurrentProjectItemIndex] = useState(0);
  const [projectTemplatesCache, setProjectTemplatesCache] = useState<Record<string, any>>({});
  const playerRef = useRef<HTMLDivElement>(null);

  // Profile management
  const fetchUserProfile = async (currentUser: any) => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const userSnap = await getDoc(userRef);
      const adminEmails = ["tsaikurt0921@gmail.com", "kurttsai0921@gmail.com"];
      const isDefaultAdmin = adminEmails.includes(currentUser.email?.toLowerCase() || '');
      
      if (!userSnap.exists()) {
        const now = new Date();
        const trialExpiry = new Date(now);
        trialExpiry.setDate(trialExpiry.getDate() + 7);

        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          role: isDefaultAdmin ? 'admin' : 'user',
          trialExpiry: Timestamp.fromDate(trialExpiry),
          subscriptionExpiry: Timestamp.fromDate(trialExpiry),
          createdAt: Timestamp.fromDate(now)
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      } else {
        const data = userSnap.data() as UserProfile;
        setUserProfile(data);
        
        // Auto-upgrade if email matches but role is not admin (one-time check)
        if (isDefaultAdmin && data.role !== 'admin') {
          await updateDoc(userRef, { role: 'admin' });
          setUserProfile({ ...data, role: 'admin' });
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${currentUser.uid}`);
    }
  };

  const isPublicView = new URLSearchParams(window.location.search).has('share');
  const isProjectView = new URLSearchParams(window.location.search).has('project');

  const [publicLoading, setPublicLoading] = useState(isPublicView || isProjectView);

  // Helper to fetch template data and cache it
  const fetchTemplateToCache = async (templateId: string) => {
    if (projectTemplatesCache[templateId]) return;
    try {
      const docRef = doc(db, 'savedTemplates', templateId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const templateData = {
          id: docSnap.id,
          name: data.name,
          type: data.type,
          zones: data.layout === 'custom' ? data.zones : null,
          layout: data.layout,
          zonesConfig: data.zonesConfig || {}
        };
        setProjectTemplatesCache(prev => ({ ...prev, [templateId]: templateData }));
        return templateData;
      }
    } catch (e) {
      console.error("Error pre-fetching template:", e);
    }
  };

  // Pre-fetch loop
  useEffect(() => {
    if (view === 'project_playback' && activeProject?.items?.length > 0) {
      // Fetch current and next 2 items to ensure smooth buffer
      const itemsToFetch = [
        activeProject.items[currentProjectItemIndex],
        activeProject.items[(currentProjectItemIndex + 1) % activeProject.items.length],
        activeProject.items[(currentProjectItemIndex + 2) % activeProject.items.length]
      ].filter(item => item && !projectTemplatesCache[item.templateId]);

      itemsToFetch.forEach(item => fetchTemplateToCache(item.templateId));
    }
  }, [view, activeProject, currentProjectItemIndex]);

  // Project Playback Timer
  useEffect(() => {
    if (view === 'project_playback' && activeProject?.items?.length > 0) {
      const currentItem = activeProject.items[currentProjectItemIndex];
      const timer = setTimeout(() => {
        setCurrentProjectItemIndex((prev) => (prev + 1) % activeProject.items.length);
      }, (currentItem?.duration || 10) * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [view, activeProject, currentProjectItemIndex]);

  // Sync selectedTemplate with current index cache
  useEffect(() => {
    if (view === 'project_playback' && activeProject?.items?.length > 0) {
      const currentItem = activeProject.items[currentProjectItemIndex];
      const cached = projectTemplatesCache[currentItem.templateId];
      if (cached) {
        setSelectedTemplate(cached);
        setZoneConfigs(cached.zonesConfig);
        setTemplateSource(cached.layout === 'custom' ? 'custom' : 'system');
      } else {
        // Fallback if not cached yet
        fetchTemplateToCache(currentItem.templateId).then(data => {
            if (data) {
                setSelectedTemplate(data);
                setZoneConfigs(data.zonesConfig);
                setTemplateSource(data.layout === 'custom' ? 'custom' : 'system');
            }
        });
      }
    }
  }, [currentProjectItemIndex, activeProject, view, projectTemplatesCache]);

  // Fetch saved templates from Firestore
  const fetchSavedTemplates = async (userId?: string) => {
    if (!userId) {
      setSavedTemplates([]);
      return;
    }

    const q = query(
      collection(db, 'savedTemplates'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    try {
      const snapshot = await getDocs(q);
      const templates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedTemplates(templates);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'savedTemplates');
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedTemplates(user.uid);
    } else {
      setSavedTemplates([]);
    }
  }, [user]);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    const projectId = params.get('project');
    
    if (shareId) {
      const fetchShared = async () => {
        try {
          const docRef = doc(db, 'sharedDisplays', shareId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSelectedTemplate({
              id: 'shared',
              name: '公開播放',
              type: data.type || (data.layout.includes('P_') ? 'portrait' : 'landscape'),
              zones: data.customZones,
              layout: data.layout
            });
            setZoneConfigs(data.zonesData);
            setTemplateSource(data.layout === 'custom' ? 'custom' : 'system');
            setView('public');
            setPublicLoading(false);
          } else {
            console.error("Shared display document not found");
            setIsInvalidLink(true);
            setPublicLoading(false);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `sharedDisplays/${shareId}`);
          setIsInvalidLink(true);
          setPublicLoading(false);
        }
      };
      fetchShared();
    } else if (projectId) {
      const fetchProject = async () => {
        try {
          const docRef = doc(db, 'playbackProjects', projectId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setActiveProject({ id: docSnap.id, ...data });
            setView('project_playback');
            setPublicLoading(false);
          } else {
            console.error("Project document not found");
            setIsInvalidLink(true);
            setPublicLoading(false);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `playbackProjects/${projectId}`);
          setIsInvalidLink(true);
          setPublicLoading(false);
        }
      };
      fetchProject();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
      alert('登入失敗');
    }
  };

  const handleLogout = () => signOut(auth);

  const isAdmin = () => {
    const adminEmails = ["tsaikurt0921@gmail.com", "kurttsai0921@gmail.com"];
    const userEmail = user?.email?.toLowerCase() || '';
    return userProfile?.role === 'admin' || userProfile?.role === 'co-admin' || adminEmails.includes(userEmail);
  };

  const isSubscribed = () => {
    if (isAdmin()) return true;
    if (!userProfile) return false;
    const now = new Date();
    const subExpiry = userProfile.subscriptionExpiry.toDate();
    const trialExpiry = userProfile.trialExpiry.toDate();
    return now < subExpiry || now < trialExpiry;
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

  const handleZoneClick = (index: number, category?: string) => {
    setActiveZoneId(index);
    setActiveZoneCategory(category || '');
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
    
    const isCustom = templateSource === 'custom';
    const baseId = isCustom ? 'custom' : (selectedTemplate.baseTemplateId || selectedTemplate.id);
    const type = selectedTemplate.type; 

    try {
      await addDoc(collection(db, 'savedTemplates'), {
        name: newTemplateName,
        baseTemplateId: baseId,
        zonesConfig: zoneConfigs,
        zones: isCustom ? selectedTemplate.zones : null,
        layout: isCustom ? 'custom' : (selectedTemplate.layout || null),
        type: type,
        userId: user.uid,
        createdAt: Timestamp.now()
      });

      setIsSaveModalOpen(false);
      setNewTemplateName('');
      alert('版型儲存成功！');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'savedTemplates');
      alert('儲存失敗，請稍後再試。');
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (!confirm('確定要刪除此版型嗎？')) return;

    try {
      await deleteDoc(doc(db, 'savedTemplates', templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `savedTemplates/${templateId}`);
      alert('刪除失敗，請稍後再試。');
    }
  };

  const handleDeleteCustomTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (!confirm('確定要刪除此自訂版型嗎？')) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedTemplates = (userProfile?.customTemplates || []).filter(t => t.id !== templateId);
      await updateDoc(userRef, { customTemplates: updatedTemplates });
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid} (delete custom template)`);
      alert('刪除失敗，請稍後再試。');
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const isCustom = templateSource === 'custom' || (templateSource === 'user' && selectedTemplate.baseTemplateId === 'custom');
      const baseTemplate = templateSource === 'user' ? TEMPLATES.find(t => t.id === selectedTemplate.baseTemplateId) : (isCustom ? null : selectedTemplate);
      const layoutLayout = isCustom ? (selectedTemplate.layout || 'custom') : (baseTemplate ? baseTemplate.layout : 'L_FULL_16_9');

      const shareData = {
        layout: layoutLayout,
        customZones: isCustom ? selectedTemplate.zones : null,
        zonesData: zoneConfigs,
        type: selectedTemplate.type,
        ownerId: user.uid,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'sharedDisplays'), shareData);
      const url = `${window.location.origin}${window.location.pathname}?share=${docRef.id}`;
      setSharedUrl(url);
      setIsShareModalOpen(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sharedDisplays');
      alert('分享失敗，請稍後再試。');
    } finally {
      setIsSharing(false);
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

  if (isPublicView && publicLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-white/50 font-black uppercase tracking-[0.3em] text-xs">正在載入公開播放內容...</p>
      </div>
    );
  }

  if (isInvalidLink) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-sm shadow-2xl">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-white mb-2">內容不可用</h2>
          <p className="text-slate-400 mb-6">此分享連結已失效、已被刪除或權限已變更。</p>
          <a href="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold transition-colors">
            返回首頁
          </a>
        </div>
      </div>
    );
  }

  if (authLoading && !isPublicView) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (view === 'public' || view === 'project_playback') {
    const isCustom = templateSource === 'custom';
    const isPortrait = selectedTemplate?.type === 'portrait';
    
    // Determine the next template ID for pre-warming
    const nextItemIndex = activeProject?.items ? (currentProjectItemIndex + 1) % activeProject.items.length : -1;
    const nextItem = nextItemIndex !== -1 ? activeProject.items[nextItemIndex] : null;
    const nextTemplate = nextItem ? projectTemplatesCache[nextItem.templateId] : null;

    return (
      <div 
        ref={playerRef}
        className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {selectedTemplate ? (
            <motion.div 
              key={selectedTemplate.id + currentProjectItemIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className={`relative w-full h-full ${isPortrait ? 'aspect-[9/16]' : 'aspect-video'}`}
            >
              <LayoutRenderer 
                layout={selectedTemplate.layout} 
                zonesData={zoneConfigs} 
                onZoneClick={() => {}} 
                isPlaying={true}
                customZones={isCustom ? selectedTemplate.zones : null}
              />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="animate-spin text-blue-600" size={48} />
              {view === 'project_playback' && <p className="text-white/50 text-sm font-bold uppercase tracking-widest">正在載入播放內容...</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pre-warming layer (Hidden) */}
        {view === 'project_playback' && nextTemplate && (
          <div className="hidden pointer-events-none absolute" aria-hidden="true" style={{ width: 1, height: 1, opacity: 0 }}>
             <LayoutRenderer 
                layout={nextTemplate.layout} 
                zonesData={nextTemplate.zonesConfig} 
                onZoneClick={() => {}} 
                isPlaying={false}
                customZones={nextTemplate.layout === 'custom' ? nextTemplate.zones : null}
              />
          </div>
        )}

        {/* Project Progress Overlay */}
        {view === 'project_playback' && activeProject && (
          <div className="absolute top-6 left-6 p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 z-50 pointer-events-none">
            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">播放計畫: {activeProject.name}</p>
            <p className="text-white font-bold text-sm">項目 {currentProjectItemIndex + 1} / {activeProject.items.length}</p>
          </div>
        )}

        {/* Fullscreen Toggle Button */}
        <button 
          onClick={toggleFullScreen}
          className="absolute bottom-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-2xl transition-all z-50 group border border-white/10 shadow-2xl"
          title={isFullscreen ? "退出全螢幕" : "全螢幕播放"}
        >
          {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>

        {/* Simple overlay to exit public view if needed (only for testing, normally it's a standalone link) */}
        <button 
          onClick={() => window.location.href = window.location.pathname}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white/50 rounded-full transition-all opacity-0 hover:opacity-100"
        >
          <X size={20} />
        </button>
      </div>
    );
  }

  if (!user && !isPublicView) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden font-sans text-slate-900 bg-slate-50">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1492684223066-81342ee5ff30")' }} />
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-white via-blue-50/30 to-slate-100/50" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
          <div className="mb-12 flex flex-col items-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-red-500 shadow-2xl shadow-red-200 border-4 border-white hover:scale-110 transition-transform duration-500">
              <Cast size={48} className="text-white" />
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-slate-900 drop-shadow-sm">Broadme</h1>
            <p className="mt-3 text-sm font-black text-blue-600 tracking-[0.3em] uppercase opacity-80">IPF ADS Service</p>
          </div>
          <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white bg-white/80 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] backdrop-blur-xl p-10 md:p-14 text-center">
            <h2 className="mb-4 text-3xl font-black text-slate-900">歡迎回來</h2>
            <p className="text-slate-500 font-medium mb-10">註冊即享 7 天免費試用，開通完整功能</p>
            <button 
              onClick={handleGoogleLogin}
              className="flex h-16 w-full items-center justify-center gap-4 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 group"
            >
              <img src="https://www.google.com/favicon.ico" className="w-6 h-6 brightness-200" alt="Google" />
              使用 Google 帳號登入
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </button>
            <div className="mt-8 pt-8 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2026 KJCStech ALL RIGHT RESERVED.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'admin' && isAdmin()) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <button onClick={() => setView('templates')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft size={20} /> 返回前台
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.email}</span>
            <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-red-500"><LogOut size={20} /></button>
          </div>
        </nav>
        <AdminDashboard currentUserProfile={userProfile} />
      </div>
    );
  }

  if (!isSubscribed() && userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-red-50 rounded-full text-red-500">
              <Clock size={48} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">試用期已結束</h1>
            <p className="text-slate-500">您的 7 天試用期已屆滿，請輸入序號開通正式權限。</p>
          </div>
          
          <LicenseInput onActivated={() => {
            if (user) fetchUserProfile(user);
            setView('templates');
          }} />
          
          <div className="pt-4 space-y-3">
            <button 
              onClick={() => setIsPricingModalOpen(true)}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              <Tag size={20} /> 查看價格方案
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-3 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
            >
              登出帳號
            </button>
          </div>
        </div>
        {isPricingModalOpen && (
          <PricingModal onClose={() => setIsPricingModalOpen(false)} />
        )}
      </div>
    );
  }

  if (view === 'templates') {
    let currentTemplates = [];
    if (templateSource === 'system') {
      currentTemplates = TEMPLATES.filter(t => selectedFilter === 'all' || t.type === selectedFilter);
    } else if (templateSource === 'user') {
      currentTemplates = savedTemplates.filter(t => selectedFilter === 'all' || t.type === selectedFilter);
    } else if (templateSource === 'custom') {
      currentTemplates = userProfile?.customTemplates || [];
    }

    return (
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <nav className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center">
              <Cast size={16} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">Broadme</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
             {isAdmin() && (
               <button onClick={() => setView('admin')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all mr-2 font-medium">
                 <ShieldCheck size={16} /> 管理後台
               </button>
             )}
             {!isAdmin() && (
               <div className="flex items-center gap-2 mr-2">
                 <button 
                   onClick={() => setIsLicenseModalOpen(true)}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all font-medium"
                 >
                   <Key size={16} /> 序號註冊
                 </button>
                 <button 
                   onClick={() => setIsPricingModalOpen(true)}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all font-medium"
                 >
                   <Tag size={16} /> 價格方案
                 </button>
               </div>
             )}
             <div className="flex flex-col items-end mr-2">
               <span className="text-slate-900 font-semibold">{user.email}</span>
               <span className="text-[10px] text-slate-400">到期日: {userProfile?.subscriptionExpiry.toDate().toLocaleDateString()}</span>
             </div>
             <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
          </div>
        </nav>
        <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full pb-24">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">選擇播放版型</h1>
              <div className="flex gap-6 border-b border-slate-200">
                <button onClick={() => { setTemplateSource('system'); setSelectedTemplate(null); }} className={`pb-3 px-1 text-sm font-bold transition-colors relative ${templateSource === 'system' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  系統預設
                  {templateSource === 'system' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                </button>
                <button onClick={() => { setTemplateSource('user'); setSelectedTemplate(null); }} className={`pb-3 px-1 text-sm font-bold transition-colors relative ${templateSource === 'user' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  我的版型 ({savedTemplates.length})
                  {templateSource === 'user' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                </button>
                <button onClick={() => { setTemplateSource('custom'); setSelectedTemplate(null); }} className={`pb-3 px-1 text-sm font-bold transition-colors relative ${templateSource === 'custom' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  自訂版型 ({userProfile?.customTemplates?.length || 0}/3)
                  {templateSource === 'custom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                </button>
                <button onClick={() => { setTemplateSource('playback'); setSelectedTemplate(null); }} className={`pb-3 px-1 text-sm font-bold transition-colors relative ${templateSource === 'playback' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  播放專案
                  {templateSource === 'playback' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {templateSource === 'custom' && (userProfile?.customTemplates?.length || 0) < 3 && (
                <button 
                  onClick={() => { setEditingCustomLayout(null); setIsCustomCreatorOpen(true); }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  <Plus size={18} /> 新增自訂版型
                </button>
              )}
              <div className="flex rounded-xl bg-white p-1 shadow-sm border border-slate-200">
                {['all', 'landscape', 'portrait'].map(f => (
                  <button key={f} onClick={() => setSelectedFilter(f)} className={`px-4 py-2 text-sm font-bold rounded-lg capitalize transition-all ${selectedFilter === f ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
            {templateSource === 'playback' ? (
              <div className="col-span-full">
                <PlaybackProjects userId={user.uid} savedTemplates={savedTemplates} />
              </div>
            ) : (
              <>
                {currentTemplates.length === 0 && (
                  <div className="col-span-full py-32 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                {templateSource === 'user' ? (
                  <div className="space-y-4">
                    <FolderHeart size={64} className="mx-auto text-slate-200"/>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-slate-900">尚無儲存的版型</p>
                      <p className="text-sm text-slate-400">請先從系統預設版型中建立並儲存。</p>
                    </div>
                  </div>
                ) : templateSource === 'custom' ? (
                  <div className="space-y-4">
                    <Layout size={64} className="mx-auto text-slate-200"/>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-slate-900">尚無自訂版型</p>
                      <p className="text-sm text-slate-400">您可以自由拖拉區塊，打造專屬的播放版面。</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">沒有符合條件的版型</p>
                )}
              </div>
            )}
                {currentTemplates.map(t => {
                  const isCustom = templateSource === 'custom' || (templateSource === 'user' && t.baseTemplateId === 'custom');
                  const baseTemplate = templateSource === 'user' ? TEMPLATES.find(sys => sys.id === t.baseTemplateId) : (isCustom ? null : t);
                  const layout = isCustom ? (t.layout || 'custom') : (baseTemplate ? baseTemplate.layout : 'L_FULL_16_9');
                  const type = isCustom ? t.type : (baseTemplate ? baseTemplate.type : t.type);
                  
                  return (
                    <div key={t.id} onClick={() => setSelectedTemplate(t)} className={`cursor-pointer group relative rounded-3xl bg-white border-2 transition-all duration-500 hover:shadow-2xl ${selectedTemplate?.id === t.id ? 'border-blue-600 shadow-xl shadow-blue-100' : 'border-transparent shadow-sm hover:border-slate-200'}`}>
                  <div className="aspect-[4/3] p-6 flex items-center justify-center relative overflow-hidden bg-slate-50 rounded-t-[22px]">
                    <div className={`transition-transform duration-700 group-hover:scale-110 ${type === 'landscape' ? 'w-full' : 'h-full'}`}>
                       <TemplatePreview layout={layout} type={type} customZones={isCustom ? (t.zones || null) : null} />
                    </div>
                    {selectedTemplate?.id === t.id && (
                      <div className="absolute top-4 right-4 bg-blue-600 text-white rounded-full p-1.5 shadow-xl scale-110"><Check size={20} strokeWidth={3} /></div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className={`text-lg font-bold transition-colors leading-tight ${selectedTemplate?.id === t.id ? 'text-blue-600' : 'text-slate-900'}`}>{t.name}</h3>
                        {!isCustom && templateSource === 'system' && <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t.category}</p>}
                        {(templateSource === 'user' || isCustom) && <p className="text-xs font-medium text-slate-400">建立於: {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '剛剛'}</p>}
                      </div>
                      {!isCustom && templateSource === 'system' && (
                        <div className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase">{t.zoneCount} 區</div>
                      )}
                      {(templateSource === 'user' || isCustom) && (
                        <div className="flex items-center gap-2">
                          {isCustom && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingCustomLayout(t); setIsCustomCreatorOpen(true); }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                              >
                                <Settings size={18} />
                              </button>
                              <button 
                                onClick={(e) => handleDeleteCustomTemplate(e, t.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                          {templateSource === 'user' && (
                            <button 
                              onClick={(e) => handleDeleteTemplate(e, t.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
          </div>
        </main>
        <div className={`fixed bottom-0 left-0 right-0 bg-white/90 border-t border-slate-200 p-6 transition-all duration-500 z-50 backdrop-blur-xl ${selectedTemplate && templateSource !== 'playback' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
          <div className="max-w-[1600px] mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner">
                <Layout size={28} className="text-blue-600"/>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">已選擇{templateSource === 'user' ? '自訂' : (templateSource === 'custom' ? '手動' : '')}版型</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{selectedTemplate?.name}</p>
              </div>
            </div>
            <button onClick={handleStartEditing} className="flex items-center gap-3 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-200 transition-all active:scale-95 group">
              開始編輯版面 
              <ArrowRight size={24} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* License Redemption Modal */}
        {isLicenseModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md">
              <button 
                onClick={() => setIsLicenseModalOpen(false)}
                className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
              >
                關閉視窗
              </button>
              <LicenseInput 
                onActivated={() => {
                  setIsLicenseModalOpen(false);
                  if (user) fetchUserProfile(user);
                }} 
              />
            </div>
          </div>
        )}

        {/* Custom Layout Creator */}
        {isCustomCreatorOpen && (
          <CustomLayoutCreator 
            isOpen={isCustomCreatorOpen}
            onClose={() => { setIsCustomCreatorOpen(false); setEditingCustomLayout(null); }}
            onSave={async (layout: any) => {
              const userRef = doc(db, 'users', user.uid);
              const currentTemplates = userProfile?.customTemplates || [];
              let updatedTemplates;
              if (editingCustomLayout) {
                updatedTemplates = currentTemplates.map(t => t.id === editingCustomLayout.id ? layout : t);
              } else {
                updatedTemplates = [...currentTemplates, layout];
              }
              await updateDoc(userRef, { customTemplates: updatedTemplates });
              setIsCustomCreatorOpen(false);
              setEditingCustomLayout(null);
            }}
            initialLayout={editingCustomLayout}
          />
        )}

        {isPricingModalOpen && (
          <PricingModal onClose={() => setIsPricingModalOpen(false)} />
        )}
      </div>
    );
  }

  if (view === 'editor') {
    const isCustom = templateSource === 'custom' || (templateSource === 'user' && selectedTemplate.baseTemplateId === 'custom');
    const baseTemplate = templateSource === 'user' ? TEMPLATES.find(t => t.id === selectedTemplate.baseTemplateId) : (isCustom ? null : selectedTemplate);
    const layoutLayout = isCustom ? (selectedTemplate.layout || 'custom') : (baseTemplate ? baseTemplate.layout : 'L_FULL_16_9');
    const isPortrait = (isCustom ? selectedTemplate.type : (baseTemplate ? baseTemplate.type : 'landscape')) === 'portrait';

    return (
      <div className="flex h-screen flex-col bg-white overflow-hidden text-slate-900">
        <nav className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0 z-50 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('templates')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="h-6 w-[1px] bg-slate-200" />
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">{selectedTemplate.name}</h1>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> 編輯模式
              </div>
            </div>
          </div>
            <div className="flex items-center gap-3">
               {isAdmin() && (
                 <button onClick={() => setView('admin')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all text-sm font-bold">
                   <ShieldCheck size={16} /> 管理後台
                 </button>
               )}
               {!isAdmin() && (
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setIsLicenseModalOpen(true)}
                     className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-sm font-bold"
                   >
                     <Key size={16} /> 序號註冊
                   </button>
                   <button 
                     onClick={() => setIsPricingModalOpen(true)}
                     className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all text-sm font-bold"
                   >
                     <Tag size={16} /> 價格方案
                   </button>
                 </div>
               )}
               <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-sm font-bold">
                 <Save size={16} /> 另存版型
               </button>
               <button 
                 onClick={handleShare} 
                 disabled={true}
                 className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed text-sm font-bold opacity-70"
                 title="系統優化維護中，暫時停用"
               >
                 <Share2 size={16} />
                 播放 URI (維護中)
               </button>
               <button onClick={() => setZoneConfigs({})} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-bold">
                 <Trash2 size={16} /> 清空內容
               </button>
               <button 
                 onClick={toggleFullScreen} 
                 className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white font-black shadow-lg transition-all active:scale-95 ${isFullscreen ? 'bg-red-600 hover:bg-red-500 shadow-red-100' : 'bg-green-600 hover:bg-green-500 shadow-green-100'}`}
               >
                 {isFullscreen ? <Minimize2 size={16} fill="white" /> : <Maximize2 size={16} fill="white" />}
                 {isFullscreen ? '退出播放' : '全螢幕播放'}
               </button>
          </div>
        </nav>
        <div className="flex-1 overflow-auto p-12 flex items-center justify-center bg-slate-50 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          <div 
            ref={playerRef}
            className={`relative bg-black shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] ring-12 ring-white rounded-2xl overflow-hidden transition-all duration-700 ease-in-out ${
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
              customZones={isCustom ? selectedTemplate.zones : null}
            />
          </div>
        </div>
        {isConfigPanelOpen && (
          <ConfigPanel 
            activeZoneId={activeZoneId} 
            activeZoneCategory={activeZoneCategory}
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

        {/* Share Modal */}
        {isShareModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                    <Link size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">播放 URI 已產生</h2>
                    <p className="text-slate-400 font-medium">任何人點擊此連結即可直接播放內容</p>
                  </div>
                </div>
                <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">專屬播放連結</label>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={sharedUrl}
                    className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-slate-600 font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <button 
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(sharedUrl);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      } catch (err) {
                        const textArea = document.createElement("textarea");
                        textArea.value = sharedUrl;
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        } catch (copyErr) {
                          console.error('Fallback copy failed', copyErr);
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    className={`px-6 rounded-2xl font-black transition-all flex items-center gap-2 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  >
                    {isCopied ? <Check size={20} /> : <Copy size={20} />}
                    {isCopied ? '已複製' : '複製'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" /> 安全提示
                </h3>
                <ul className="space-y-2 text-xs text-slate-500 font-medium">
                  <li className="flex gap-2">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    使用者無需登入即可觀看內容。
                  </li>
                  <li className="flex gap-2">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    觀看者沒有任何修改版型或設定的權限。
                  </li>
                  <li className="flex gap-2">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    您可以隨時在管理介面停用此連結。
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => window.open(sharedUrl, '_blank')}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
              >
                <Play size={20} fill="white" /> 立即預覽播放
              </button>
            </div>
          </div>
        )}
        
        {/* License Redemption Modal */}
        {isLicenseModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md">
              <button 
                onClick={() => setIsLicenseModalOpen(false)}
                className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
              >
                關閉視窗
              </button>
              <LicenseInput 
                onActivated={() => {
                  setIsLicenseModalOpen(false);
                  if (user) fetchUserProfile(user);
                }} 
              />
            </div>
          </div>
        )}

        {/* Custom Layout Creator */}
        {isCustomCreatorOpen && (
          <CustomLayoutCreator 
            isOpen={isCustomCreatorOpen}
            onClose={() => { setIsCustomCreatorOpen(false); setEditingCustomLayout(null); }}
            onSave={async (layout: any) => {
              const userRef = doc(db, 'users', user.uid);
              const currentTemplates = userProfile?.customTemplates || [];
              let updatedTemplates;
              if (editingCustomLayout) {
                updatedTemplates = currentTemplates.map(t => t.id === editingCustomLayout.id ? layout : t);
              } else {
                updatedTemplates = [...currentTemplates, layout];
              }
              await updateDoc(userRef, { customTemplates: updatedTemplates });
              setIsCustomCreatorOpen(false);
              setEditingCustomLayout(null);
            }}
            initialLayout={editingCustomLayout}
          />
        )}

        {isPricingModalOpen && (
          <PricingModal onClose={() => setIsPricingModalOpen(false)} />
        )}
      </div>
    );
  }
  return null;
}
