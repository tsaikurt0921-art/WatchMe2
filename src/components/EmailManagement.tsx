import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Mail, Save, Loader2, Info, Send } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export const EmailManagement = () => {
  const [settings, setSettings] = useState({
    emailSender: '',
    emailSubject: '您的 Broadme 授權序號',
    emailTemplate: '感謝您的購買！您的序號為：{{license_key}}\n時長：{{duration}} 個月\n\n請至 Broadme 系統進行序號註冊。'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      if (docSnap.exists()) {
        setSettings(docSnap.data() as any);
      }
    } catch (err: any) {
      console.error('Fetch settings error:', err);
      setError(err.message || '無法讀取信箱設定');
      handleFirestoreError(err, OperationType.GET, 'settings/global');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt: Timestamp.now()
      });
      setSuccessMessage('信箱設定已儲存');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Save settings error:', err);
      setError(err.message || '儲存失敗，請檢查權限或網路連線');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setError('請輸入有效的測試信箱');
      return;
    }
    setTesting(true);
    setError(null);
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('測試信件已寄出，請查收');
      } else {
        setError(data.error || '測試寄信失敗，請檢查環境變數設定');
      }
    } catch (err: any) {
      setError('連線失敗: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-indigo-600 font-black uppercase tracking-widest text-xs">
        <Mail size={18} />
        <span>信箱管理</span>
        {successMessage && (
          <span className="ml-4 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full animate-in fade-in slide-in-from-left-2 duration-300 text-[10px] font-bold">
            {successMessage}
          </span>
        )}
        {error && (
          <span className="ml-4 px-3 py-1 bg-red-100 text-red-600 rounded-full animate-in fade-in slide-in-from-left-2 duration-300 text-[10px] font-bold">
            {error}
          </span>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">寄件者名稱 (顯示於信頭)</label>
          <input 
            type="text" 
            value={settings.emailSender}
            onChange={(e) => setSettings({ ...settings, emailSender: e.target.value })}
            placeholder="例如: Broadme 客服團隊"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">信件主旨</label>
          <input 
            type="text" 
            value={settings.emailSubject}
            onChange={(e) => setSettings({ ...settings, emailSubject: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">信件內容範本</label>
          <textarea 
            rows={8}
            value={settings.emailTemplate}
            onChange={(e) => setSettings({ ...settings, emailTemplate: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
          />
          <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-2xl text-blue-600 text-xs font-medium">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>可用變數：{"{{license_key}}"} (序號)、{"{{duration}}"} (時長)。系統會自動替換這些文字。</p>
          </div>
        </div>

        <button 
          onClick={saveSettings}
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          儲存信箱設定
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 space-y-4">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Send size={16} />
          <span>發送測試信件</span>
        </div>
        <div className="flex gap-2">
          <input 
            type="email" 
            placeholder="輸入您的測試信箱"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
          />
          <button 
            onClick={sendTestEmail}
            disabled={testing}
            className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-900 transition-all disabled:opacity-50"
          >
            {testing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            發送
          </button>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">使用此功能前，請確保已在系統 Environment Variables 中設定好 SMTP 資訊。</p>
      </div>
    </div>
  );
};
