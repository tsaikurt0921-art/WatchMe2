import React from 'react';
import { Save } from 'lucide-react';

export const SaveModal = ({ isOpen, onClose, onConfirm, value, onChange }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-8">
        <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <Save size={24} />
          </div>
          儲存版型
        </h3>
        <p className="text-slate-400 text-sm font-medium mb-8">請為您的版型命名，以便日後重複使用。</p>
        <input 
          type="text" 
          value={value} 
          onChange={onChange} 
          placeholder="例如：門市週年慶活動 A" 
          className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-6 py-4 text-slate-900 outline-none mb-8 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
          autoFocus
        />
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 rounded-2xl text-slate-400 hover:text-slate-900 font-black transition-all hover:bg-slate-100 uppercase tracking-widest text-xs">取消</button>
          <button onClick={onConfirm} disabled={!value.trim()} className="px-10 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-100 active:scale-95 transition-all uppercase tracking-widest text-xs disabled:opacity-50">確認儲存</button>
        </div>
      </div>
    </div>
  );
};
