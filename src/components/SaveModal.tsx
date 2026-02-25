import React from 'react';
import { Save } from 'lucide-react';

export const SaveModal = ({ isOpen, onClose, onConfirm, value, onChange }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Save size={20} className="text-blue-400"/> 儲存版型
        </h3>
        <p className="text-slate-400 text-sm mb-4">請為您的版型命名，以便日後重複使用。</p>
        <input 
          type="text" 
          value={value} 
          onChange={onChange} 
          placeholder="例如：門市週年慶活動 A" 
          className="w-full rounded-lg bg-black/20 border border-slate-700 px-4 py-3 text-white outline-none mb-6 focus:border-blue-500"
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5">取消</button>
          <button onClick={onConfirm} disabled={!value.trim()} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg disabled:opacity-50">確認儲存</button>
        </div>
      </div>
    </div>
  );
};
