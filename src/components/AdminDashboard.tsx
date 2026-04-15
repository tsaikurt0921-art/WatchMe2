import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, addDoc, doc, setDoc, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Key, Plus, Copy, Check, ShieldCheck, Calendar, Clock, Loader2, Trash2, UserPlus, UserMinus, Tag, Mail } from 'lucide-react';
import { UserProfile } from '../types/user';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { PricingManagement } from './PricingManagement';
import { EmailManagement } from './EmailManagement';

export const AdminDashboard = ({ currentUserProfile }: { currentUserProfile: UserProfile | null }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'pricing' | 'email'>('users');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [duration, setDuration] = useState<number>(1);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newCoAdminEmail, setNewCoAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  const isSuperAdmin = currentUserProfile?.role === 'admin';

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'keys') {
      fetchKeys();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'licenseKeys'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const keysList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setKeys(keysList);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'licenseKeys');
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    setGenerating(true);
    let key = '';
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (let i = 0; i < 16; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const keyData = {
        key,
        durationMonths: duration,
        isUsed: false,
        createdAt: Timestamp.now()
      };

      // Use the key itself as the document ID for easy lookup
      await setDoc(doc(db, 'licenseKeys', key), keyData);
      setGeneratedKey(key);
      if (activeTab === 'keys') fetchKeys();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `licenseKeys/${key}`);
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('確定要刪除此序號嗎？')) return;
    try {
      await deleteDoc(doc(db, 'licenseKeys', id));
      fetchKeys();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `licenseKeys/${id}`);
    }
  };

  const deleteUser = async (id: string) => {
    if (!isSuperAdmin) {
      alert('只有最高管理員可以刪除使用者');
      return;
    }
    if (!confirm('確定要刪除此使用者嗎？')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      fetchUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin' | 'co-admin') => {
    if (!isSuperAdmin) {
      alert('只有最高管理員可以管理權限');
      return;
    }
    if (newRole === 'admin' && currentUserProfile?.email !== 'tsaikurt0921@gmail.com') {
      alert('只有創始管理員可以指派最高管理員');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      fetchUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const addCoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!newCoAdminEmail) return;
    setAddingAdmin(true);
    try {
      // Find user by email
      const q = query(collection(db, 'users'), orderBy('email'));
      const querySnapshot = await getDocs(q);
      const userDoc = querySnapshot.docs.find(d => d.data().email === newCoAdminEmail);
      
      if (userDoc) {
        await updateDoc(doc(db, 'users', userDoc.id), { role: 'co-admin' });
        alert('已成功將該使用者設為 Co-Admin');
      } else {
        alert('找不到該使用者，請確認該 Email 已註冊');
      }
      setNewCoAdminEmail('');
      fetchUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users (add co-admin)');
    } finally {
      setAddingAdmin(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100 shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">管理後台</h1>
            <p className="text-slate-500 font-medium">管理使用者名單與生成授權序號</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Key Generator */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 text-indigo-600 font-black uppercase tracking-widest text-xs">
              <Key size={18} />
              <span>生成序號</span>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">選擇使用時長</label>
              <div className="grid grid-cols-2 gap-2">
                {[1, 3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={`px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                      duration === m 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                  >
                    {m} 個月
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateKey}
              disabled={generating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 active:scale-95"
            >
              {generating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
              生成序號
            </button>

            {generatedKey && (
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3 animate-in zoom-in duration-300">
                <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-black">已生成序號 ({duration}個月)</p>
                <div className="flex items-center justify-between gap-4">
                  <code className="text-xl font-mono text-indigo-600 font-black tracking-wider">{generatedKey}</code>
                  <button
                    onClick={() => copyToClipboard(generatedKey)}
                    className="p-2 hover:bg-white rounded-xl transition-colors text-indigo-400 hover:text-indigo-600"
                  >
                    {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin Management (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 text-amber-600 font-black uppercase tracking-widest text-xs">
                <ShieldCheck size={18} />
                <span>新增 Co-Admin</span>
              </div>
              <form onSubmit={addCoAdmin} className="space-y-4">
                <input
                  type="email"
                  value={newCoAdminEmail}
                  onChange={(e) => setNewCoAdminEmail(e.target.value)}
                  placeholder="輸入使用者 Email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all placeholder:text-slate-300"
                />
                <button
                  type="submit"
                  disabled={addingAdmin || !newCoAdminEmail}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-100 active:scale-95"
                >
                  {addingAdmin ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                  設為 Co-Admin
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Data List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm overflow-x-auto">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              使用者名單
            </button>
            <button 
              onClick={() => setActiveTab('keys')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'keys' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              序號管理
            </button>
            <button 
              onClick={() => setActiveTab('pricing')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'pricing' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              價格管理
            </button>
            <button 
              onClick={() => setActiveTab('email')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'email' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              信箱管理
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {activeTab === 'pricing' ? (
              <div className="p-8">
                <PricingManagement />
              </div>
            ) : activeTab === 'email' ? (
              <div className="p-8">
                <EmailManagement />
              </div>
            ) : (
              <>
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs">
                    {activeTab === 'users' ? <Users size={18} /> : <Key size={18} />}
                    <span>{activeTab === 'users' ? `註冊名單 (${users.length})` : `序號列表 (${keys.length})`}</span>
                  </div>
                  <button onClick={activeTab === 'users' ? fetchUsers : fetchKeys} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">重新整理</button>
                </div>

                <div className="overflow-x-auto">
                  {activeTab === 'users' ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                      <th className="px-8 py-5 font-black">使用者 Email</th>
                      <th className="px-8 py-5 font-black">註冊日期</th>
                      <th className="px-8 py-5 font-black">到期日期</th>
                      <th className="px-8 py-5 font-black">身分</th>
                      <th className="px-8 py-5 font-black text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <Loader2 className="animate-spin mx-auto text-indigo-600" size={40} />
                        </td>
                      </tr>
                    ) : users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6 font-bold text-slate-900">{user.email}</td>
                        <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-300" />
                            {user.createdAt?.toDate().toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm">
                          <div className={`flex items-center gap-2 font-bold ${
                            user.subscriptionExpiry?.toDate() > new Date() ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            <Clock size={14} className="opacity-50" />
                            {user.subscriptionExpiry?.toDate().toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 
                              user.role === 'co-admin' ? 'bg-amber-100 text-amber-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {user.role}
                            </span>
                            {isSuperAdmin && user.email !== currentUserProfile?.email && (
                              <select 
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                                className="bg-white text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                              >
                                <option value="user">User</option>
                                <option value="co-admin">Co-Admin</option>
                                {currentUserProfile?.email === 'tsaikurt0921@gmail.com' && <option value="admin">Admin</option>}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => deleteUser(user.id)}
                            disabled={!isSuperAdmin || user.role === 'admin'}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl disabled:opacity-0 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                      <th className="px-8 py-5 font-black">授權序號</th>
                      <th className="px-8 py-5 font-black">時長</th>
                      <th className="px-8 py-5 font-black">狀態</th>
                      <th className="px-8 py-5 font-black">使用者</th>
                      <th className="px-8 py-5 font-black text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <Loader2 className="animate-spin mx-auto text-indigo-600" size={40} />
                        </td>
                      </tr>
                    ) : keys.map(k => (
                      <tr key={k.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6 font-mono text-indigo-600 font-black tracking-wider">{k.key}</td>
                        <td className="px-8 py-6 text-sm text-slate-500 font-bold">{k.durationMonths} 個月</td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            k.isUsed ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {k.isUsed ? '已使用' : '未使用'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-xs text-slate-400 font-medium">
                          {k.usedBy || '-'}
                        </td>
                        <td className="px-8 py-6 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => copyToClipboard(k.key)}
                            className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                          >
                            <Copy size={18} />
                          </button>
                          <button 
                            onClick={() => deleteKey(k.id)}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  </div>
</div>
  );
};
