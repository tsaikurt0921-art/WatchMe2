import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Play, Clock, Save, Edit3, 
  ExternalLink, ChevronUp, ChevronDown, ListOrdered, Share2, Loader2, X
} from 'lucide-react';
import { 
  collection, query, where, getDocs, addDoc, 
  deleteDoc, doc, updateDoc, Timestamp, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface PlaybackItem {
  templateId: string;
  templateName: string;
  duration: number;
}

interface PlaybackProject {
  id: string;
  name: string;
  userId: string;
  items: PlaybackItem[];
  createdAt: any;
}

interface PlaybackProjectsProps {
  userId: string;
  savedTemplates: any[];
}

export function PlaybackProjects({ userId, savedTemplates }: PlaybackProjectsProps) {
  const [projects, setProjects] = useState<PlaybackProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PlaybackProject | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectItems, setProjectItems] = useState<PlaybackItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const q = query(
        collection(db, 'playbackProjects'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      try {
        const snapshot = await getDocs(q);
        const projs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PlaybackProject[];
        setProjects(projs);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'playbackProjects');
        setLoading(false);
      }
    };

    fetchProjects();
  }, [userId]);

  const handleOpenModal = (project?: PlaybackProject) => {
    if (project) {
      setEditingProject(project);
      setProjectName(project.name);
      setProjectItems(project.items);
    } else {
      setEditingProject(null);
      setProjectName('');
      setProjectItems([]);
    }
    setIsModalOpen(true);
  };

  const handleAddItem = (template: any) => {
    setProjectItems([...projectItems, {
      templateId: template.id,
      templateName: template.name,
      duration: 10 // Default 10 seconds
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setProjectItems(projectItems.filter((_, i) => i !== index));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...projectItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      setProjectItems(newItems);
    }
  };

  const handleUpdateDuration = (index: number, duration: number) => {
    const newItems = [...projectItems];
    newItems[index].duration = duration;
    setProjectItems(newItems);
  };

  const handleSave = async () => {
    if (!projectName.trim() || projectItems.length === 0) {
      alert('請輸入專案名稱並至少加入一個版型');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: projectName,
        userId,
        items: projectItems,
        updatedAt: Timestamp.now()
      };

      if (editingProject) {
        await updateDoc(doc(db, 'playbackProjects', editingProject.id), data);
      } else {
        await addDoc(collection(db, 'playbackProjects'), {
          ...data,
          createdAt: Timestamp.now()
        });
      }
      setIsModalOpen(false);
      alert('專案儲存成功！');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'playbackProjects');
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('確定要刪除此播放專案嗎？')) return;
    try {
      await deleteDoc(doc(db, 'playbackProjects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `playbackProjects/${id}`);
    }
  };

  const copyPlaybackLink = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?project=${id}`;
    navigator.clipboard.writeText(url);
    alert('播放連結已複製！');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">專案載入中...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900">播放專案管理</h2>
          <p className="text-sm text-slate-500">將多個版型組合成一個連續播放的計畫</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} /> 新增播放專案
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <ListOrdered size={64} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-1">尚無播放專案</h3>
          <p className="text-slate-400">點擊上方按鈕，開始組合您的專屬輪播計畫。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(proj => (
            <div key={proj.id} className="group relative bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-2xl transition-all duration-500">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <Play size={24} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(proj)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={(e) => handleDelete(proj.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-1">{proj.name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                共 {proj.items.length} 個切換項目
              </p>

              <div className="flex flex-col gap-2 mb-6">
                {proj.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-200 rounded-full text-[10px] font-bold">{idx + 1}</span>
                    <span className="flex-1 truncate">{item.templateName}</span>
                    <span className="text-slate-400 font-mono text-xs">{item.duration}s</span>
                  </div>
                ))}
                {proj.items.length > 3 && (
                  <p className="text-[10px] text-center text-slate-400 font-bold">及另外 {proj.items.length - 3} 個項目...</p>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  disabled={true}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-400 py-3 rounded-xl font-bold cursor-not-allowed text-sm"
                  title="系統優化維護中，暫時停用"
                >
                  <ExternalLink size={16} /> 暫停播放
                </button>
                <button 
                  disabled={true}
                  className="p-3 bg-slate-50 text-slate-300 rounded-xl cursor-not-allowed"
                  title="系統優化維護中，暫時停用"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{editingProject ? '編輯' : '建立'}播放專案</h2>
                <div className="mt-1 flex items-center gap-3">
                  <input 
                    type="text" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="輸入專案名稱..."
                    className="text-lg font-bold text-slate-900 border-b-2 border-transparent focus:border-blue-600 outline-none w-64 transition-all"
                  />
                  <Edit3 size={16} className="text-slate-300" />
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left: Available Templates */}
              <div className="w-1/3 border-r border-slate-100 p-6 overflow-y-auto bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">可用的版型</h3>
                <div className="space-y-3">
                  {savedTemplates.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => {
                        setProjectItems([...projectItems, {
                          templateId: t.id,
                          templateName: t.name,
                          duration: 10
                        }]);
                      }}
                      className="w-full text-left p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-600 hover:shadow-lg transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 truncate">{t.name}</span>
                        <Plus size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{t.type}</p>
                    </button>
                  ))}
                  {savedTemplates.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">沒有可用的版型，請先建立版型。</p>
                  )}
                </div>
              </div>

              {/* Right: Project Items */}
              <div className="flex-1 p-8 overflow-y-auto">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">播放順序與時間</h3>
                <div className="space-y-4">
                  {projectItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 bg-white border border-slate-200 p-5 rounded-3xl group hover:border-blue-200 hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 truncate">{item.templateName}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock size={14} />
                            <span className="text-xs font-bold">播放秒數</span>
                            <input 
                              type="number"
                              min="1"
                              value={item.duration}
                              onChange={(e) => handleUpdateDuration(index, parseInt(e.target.value) || 1)}
                              className="w-20 px-3 py-1 bg-slate-100 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleMoveItem(index, 'up')} disabled={index === 0} className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-30">
                          <ChevronUp size={20} />
                        </button>
                        <button onClick={() => handleMoveItem(index, 'down')} disabled={index === projectItems.length - 1} className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-30">
                          <ChevronDown size={20} />
                        </button>
                        <button onClick={() => handleRemoveItem(index)} className="p-2 text-slate-400 hover:text-red-500">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {projectItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                      <ListOrdered size={48} className="mb-4 opacity-50" />
                      <p className="font-bold">從左側選擇版型加入清單</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-all"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                儲存專案內容
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
