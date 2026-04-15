import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { X, Tag, Check, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export const PricingModal = ({ onClose }: { onClose: () => void }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'pricingPlans'), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      const plansList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPlans(plansList.sort((a, b) => a.durationMonths - b.durationMonths));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'pricingPlans');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan: any) => {
    const user = auth.currentUser;
    if (!user) {
      alert('請先登入');
      return;
    }

    // Check if running in an iframe
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      alert('【重要提醒】由於支付安全性限制，請點擊預覽視窗右上角的「在新分頁開啟」圖示，在獨立網頁中進行購買，否則綠界支付頁面將無法載入。');
      return;
    }

    setPurchasing(plan.id);
    try {
      // In a real app, this would call a backend endpoint to generate ECPay form
      // For now, we'll simulate the redirect to our backend ECPay handler
      const response = await fetch('/api/payment/ecpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text);
        throw new Error(`伺服器回傳錯誤格式 (HTTP ${response.status})。請確認後端 API 是否正常運作。`);
      }

      const data = await response.json();
      if (data.url) {
        // Create a hidden form and submit it to redirect to ECPay
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.url;

        // Add ECPay parameters as hidden inputs
        Object.keys(data.params).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = data.params[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error(data.error || '無法啟動支付流程');
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      alert('購買失敗: ' + err.message);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-10 md:p-14 overflow-y-auto">
          <div className="text-center mb-12">
            <div className="inline-flex p-4 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100 shadow-sm mb-6">
              <Tag size={32} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">選擇您的方案</h2>
            <p className="text-slate-500 font-medium text-lg">開通 Broadme 專業版，享受無限可能</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">載入方案中...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map(plan => {
                const hasDiscount = plan.discountPrice && plan.discountPrice < plan.originalPrice;
                const isPopular = plan.durationMonths === 12;

                return (
                  <div 
                    key={plan.id} 
                    className={`relative flex flex-col p-8 rounded-[2rem] border-2 transition-all hover:scale-105 ${
                      isPopular 
                        ? 'border-emerald-500 bg-emerald-50/30 shadow-xl shadow-emerald-100' 
                        : 'border-slate-100 bg-white hover:border-emerald-200'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                        <Sparkles size={12} /> 最受歡迎
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-black text-slate-900 mb-1">{plan.durationMonths} 個月</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">專業版授權</p>
                    </div>

                    <div className="mb-8">
                      {hasDiscount ? (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">NT$ {plan.discountPrice}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400 line-through">NT$ {plan.originalPrice}</span>
                            <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                              {plan.discountPercentage}% OFF
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-3xl font-black text-slate-900">NT$ {plan.originalPrice}</span>
                      )}
                    </div>

                    <ul className="space-y-4 mb-10 flex-1">
                      <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <div className="p-1 bg-emerald-100 text-emerald-600 rounded-full">
                          <Check size={12} />
                        </div>
                        完整版面編輯
                      </li>
                      <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <div className="p-1 bg-emerald-100 text-emerald-600 rounded-full">
                          <Check size={12} />
                        </div>
                        雲端儲存版型
                      </li>
                      <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <div className="p-1 bg-emerald-100 text-emerald-600 rounded-full">
                          <Check size={12} />
                        </div>
                        即時天氣與 YouTube
                      </li>
                    </ul>

                    <button
                      onClick={() => handlePurchase(plan)}
                      disabled={purchasing !== null}
                      className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 active:scale-95 ${
                        isPopular 
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {purchasing === plan.id ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>立即購買 <ArrowRight size={18} /></>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
            <p className="text-sm text-slate-400 font-medium">
              付款完成後，系統將自動生成序號並寄送至您的註冊信箱。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
