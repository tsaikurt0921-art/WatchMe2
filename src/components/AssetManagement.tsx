import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Plus, Trash2, Loader2, ImageIcon, Layout, ExternalLink, Upload } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export const AssetManagement = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingCount, setUploadingCount] = useState({ current: 0, total: 0 });
  
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<'16:9' | '9:16' | 'banner'>('16:9');
  const [uploadType, setUploadType] = useState<'url' | 'file'>('url');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'templateAssets'));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssets(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'templateAssets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadType === 'file') return; // File upload is handled by onChange
    if (!newName || !newUrl) return;
    
    setAdding(true);
    try {
      await addDoc(collection(db, 'templateAssets'), {
        name: newName,
        url: newUrl,
        category: newCategory,
        createdAt: Timestamp.now()
      });
      
      setNewName('');
      setNewUrl('');
      alert('素材新增成功！');
      fetchAssets();
    } catch (err) {
      console.error("Add asset error:", err);
      alert('新增失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
      handleFirestoreError(err, OperationType.CREATE, 'templateAssets');
    } finally {
      setAdding(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAdding(true);
    setUploadingCount({ current: 0, total: files.length });
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadingCount(prev => ({ ...prev, current: i + 1 }));
        
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `templateAssets/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        const downloadUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => reject(error), 
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });

        await addDoc(collection(db, 'templateAssets'), {
          name: file.name.split('.')[0],
          url: downloadUrl,
          category: newCategory,
          createdAt: Timestamp.now()
        });
      }
      
      alert(`成功上傳 ${files.length} 張圖片！`);
      fetchAssets();
    } catch (err) {
      console.error("File upload error:", err);
      alert('上傳失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
    } finally {
      setAdding(false);
      setUploadProgress(null);
      setUploadingCount({ current: 0, total: 0 });
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('確定要刪除此素材嗎？')) return;
    try {
      await deleteDoc(doc(db, 'templateAssets', id));
      fetchAssets();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `templateAssets/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-xs">
            <Plus size={18} />
            <span>新增圖文素材</span>
          </div>
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setUploadType('url')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${uploadType === 'url' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              網址匯入
            </button>
            <button 
              onClick={() => setUploadType('file')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${uploadType === 'file' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              本地上傳
            </button>
          </div>
        </div>
        
        <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {uploadType === 'url' ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">素材名稱</label>
                <input 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如: 春季促銷底圖"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">圖片網址 (URL)</label>
                <div className="flex gap-3">
                  <input 
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={adding || !newName || !newUrl}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black px-8 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100 active:scale-95"
                  >
                    {adding ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                    新增
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="md:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  本地批次上傳 (支援多選)
                </label>
                {adding && (
                  <div className="flex items-center gap-3 text-blue-600 font-black text-xs uppercase tracking-widest">
                    <Loader2 className="animate-spin" size={14} />
                    <span>正在上傳 {uploadingCount.current} / {uploadingCount.total} ({Math.round(uploadProgress || 0)}%)</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <input 
                  type="file" 
                  id="asset-file-upload" 
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={adding}
                />
                <label 
                  htmlFor="asset-file-upload"
                  className={`flex flex-col items-center justify-center gap-4 w-full h-40 bg-white border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all group ${adding ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="p-4 bg-blue-50 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900">點擊或拖曳圖片至此處</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">支援多張圖片同時上傳，將自動分類為：{newCategory}</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">尺寸分類 (上傳前請先選擇)</label>
            <select 
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              disabled={adding}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            >
              <option value="16:9">16:9 橫式</option>
              <option value="9:16">9:16 直式</option>
              <option value="banner">Banner 橫幅</option>
            </select>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : assets.length > 0 ? (
          assets.map(asset => (
            <div key={asset.id} className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="aspect-video relative overflow-hidden bg-slate-100">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute top-3 right-3 flex gap-2">
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/90 backdrop-blur-md text-slate-600 rounded-xl shadow-lg hover:text-blue-600 transition-all">
                    <ExternalLink size={16} />
                  </a>
                  <button 
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                    {asset.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h4 className="font-black text-slate-900 truncate">{asset.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  上傳於: {asset.createdAt?.toDate().toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <ImageIcon size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">尚無素材，請從上方新增</p>
          </div>
        )}
      </div>
    </div>
  );
};
