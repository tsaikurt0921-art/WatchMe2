import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Tag, Plus, Trash2, Save, Loader2, Calendar } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export const PricingManagement = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const formatTimestampForInput = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
      if (isNaN(date.getTime())) return '';
      // Adjust for local timezone to get YYYY-MM-DDTHH:mm
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      return localISOTime;
    } catch (e) {
      return '';
    }
  };

  const fetchPlans = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'pricingPlans'));
      const plansList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPlans(plansList.sort((a, b) => a.durationMonths - b.durationMonths));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'pricingPlans');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const addPlan = () => {
    const newPlan = {
      id: `plan_${Date.now()}`,
      durationMonths: 1,
      originalPrice: 0,
      discountPrice: 0,
      discountPercentage: 0,
      discountExpiry: '',
      isActive: true,
      isNew: true
    };
    setPlans([...plans, newPlan]);
  };

  const updatePlanField = (id: string, field: string, value: any) => {
    let processedValue = value;
    if (['durationMonths', 'originalPrice', 'discountPrice', 'discountPercentage'].includes(field)) {
      if (value === '') {
        processedValue = 0;
      } else {
        processedValue = typeof value === 'string' ? parseInt(value) : value;
        if (isNaN(processedValue)) processedValue = 0;
      }
    }
    setPlans(plans.map(p => p.id === id ? { ...p, [field]: processedValue } : p));
  };

  const savePlan = async (plan: any) => {
    if (savingId) return;
    setSavingId(plan.id);
    setError(null);
    console.log('Attempting to save plan:', plan.id);
    
    try {
      const { id, isNew, ...data } = plan;
      
      // Robust date conversion
      let expiry = null;
      if (data.discountExpiry) {
        const date = new Date(data.discountExpiry);
        if (!isNaN(date.getTime())) {
          expiry = Timestamp.fromDate(date);
        }
      }

      const planData = {
        durationMonths: Number(data.durationMonths) || 0,
        originalPrice: Number(data.originalPrice) || 0,
        discountPrice: data.discountPrice ? Number(data.discountPrice) : null,
        discountPercentage: data.discountPercentage ? Number(data.discountPercentage) : null,
        discountExpiry: expiry,
        isActive: data.isActive ?? true,
        updatedAt: Timestamp.now()
      };
      
      console.log('Plan data to save:', planData);
      await setDoc(doc(db, 'pricingPlans', id), planData);
      console.log('Save successful');
      
      setSuccessMessage('價格方案已儲存');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchPlans(true);
    } catch (err: any) {
      console.error('Save plan error:', err);
      setError(err.message || '儲存失敗，請檢查權限或網路連線');
      // Don't throw here to keep UI alive, but log it
    } finally {
      setSavingId(null);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('確定要刪除此價格方案嗎？')) return;
    try {
      await deleteDoc(doc(db, 'pricingPlans', id));
      fetchPlans();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pricingPlans/${id}`);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-indigo-600 font-black uppercase tracking-widest text-xs">
          <Tag size={18} />
          <span>價格管理</span>
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
        <button 
          onClick={addPlan}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
        >
          <Plus size={18} /> 新增方案
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">時長 (月)</label>
                <input 
                  type="number" 
                  value={plan.durationMonths}
                  onChange={(e) => updatePlanField(plan.id, 'durationMonths', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">原價</label>
                <input 
                  type="number" 
                  value={plan.originalPrice}
                  onChange={(e) => updatePlanField(plan.id, 'originalPrice', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">優惠價 (選填)</label>
                <input 
                  type="number" 
                  value={plan.discountPrice || ''}
                  onChange={(e) => updatePlanField(plan.id, 'discountPrice', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">優惠折數 (如: 85)</label>
                <input 
                  type="number" 
                  value={plan.discountPercentage || ''}
                  onChange={(e) => updatePlanField(plan.id, 'discountPercentage', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">優惠截止時間</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    type="datetime-local" 
                    value={formatTimestampForInput(plan.discountExpiry)}
                    onChange={(e) => updatePlanField(plan.id, 'discountExpiry', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2 font-bold"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button 
                  onClick={() => savePlan(plan)}
                  disabled={savingId === plan.id}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {savingId === plan.id ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  儲存設定
                </button>
                <button 
                  onClick={() => deletePlan(plan.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
