import React, { useState } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Key, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export const LicenseInput = ({ onActivated }: { onActivated: () => void }) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (key.length !== 16) {
      setError('請輸入正確的 16 碼序號');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const keyRef = doc(db, 'licenseKeys', key);
      const keySnap = await getDoc(keyRef);

      if (!keySnap.exists()) {
        setError('序號不存在');
        setLoading(false);
        return;
      }

      const keyData = keySnap.data();
      if (keyData.isUsed) {
        setError('此序號已被使用');
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (!user) throw new Error('未登入');

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) throw new Error('使用者資料不存在');
      
      const userData = userSnap.data();
      const currentExpiry = userData.subscriptionExpiry.toDate();
      const now = new Date();
      
      // Calculate new expiry
      // If current expiry is in the past, start from now
      const baseDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + keyData.durationMonths);

      // Update user and key
      await updateDoc(userRef, {
        subscriptionExpiry: Timestamp.fromDate(newExpiry)
      });

      await updateDoc(keyRef, {
        isUsed: true,
        usedBy: user.uid
      });

      setSuccess(true);
      setTimeout(() => {
        onActivated();
      }, 2000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'license activation');
      setError('啟用失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100 shadow-sm">
          <Key size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">啟用序號</h2>
          <p className="text-sm text-slate-500 font-medium">輸入 16 碼序號開通使用權限</p>
        </div>
      </div>

      <form onSubmit={handleActivate} className="space-y-6">
        <div>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxLength={16}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-mono text-xl tracking-[0.2em] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
            disabled={loading || success}
          />
        </div>

        {error && (
          <div className="flex items-center gap-3 text-red-600 text-sm bg-red-50 p-4 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 text-emerald-600 text-sm bg-emerald-50 p-4 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={18} />
            <span className="font-bold">序號啟用成功！正在更新權限...</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success || key.length !== 16}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100 active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : <span className="text-lg">立即啟用</span>}
        </button>
      </form>
    </div>
  );
};
