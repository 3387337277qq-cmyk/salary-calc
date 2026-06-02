import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { PricingTier, PricingRate } from '../types/database';
import { CLASS_TYPES } from '../types/database';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

export function PricingPage() {
  const queryClient = useQueryClient();
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PricingTier | null>(null);

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const { data: tierData } = await supabase.from('pricing_tiers').select('*').order('sort_order');
      const { data: rateData } = await supabase.from('pricing_rates').select('*');
      return (tierData ?? []).map(t => ({ ...t, rates: (rateData ?? []).filter(r => r.tier_id === t.id) })) as PricingTier[];
    },
    staleTime: 0,
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">定价设置</h1>
        <button
          onClick={() => { setEditingTier(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-mint-500 text-white rounded-xl text-sm font-medium hover:bg-mint-600 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          添加阶梯
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-mint-100">
          <DollarSign className="w-12 h-12 text-mint-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">还没有定价阶梯</p>
          <button
            onClick={() => { setEditingTier(null); setShowModal(true); }}
            className="mt-3 text-mint-600 text-sm font-medium hover:underline"
          >
            创建第一个定价阶梯
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier) => {
            const isExpanded = expandedTier === tier.id;
            const rates = tier.rates ?? [];
            // 获取所有不同的年级
            const grades = [...new Set(rates.map(r => r.grade))].sort();

            return (
              <div key={tier.id} className="bg-white rounded-xl border border-mint-100 overflow-hidden">
                {/* 阶梯头部 */}
                <button
                  onClick={() => setExpandedTier(isExpanded ? null : tier.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-mint-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-mint-100 flex items-center justify-center text-mint-600 font-bold text-sm">
                      {tier.sort_order}
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-800 text-sm">{tier.name}</h3>
                      <p className="text-xs text-gray-400">
                        {tier.min_hours} — {tier.max_hours >= 999 ? tier.max_hours + '以上' : tier.max_hours} 小时
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTier(tier); setShowModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-mint-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(tier); }}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* 展开后的价格表格 */}
                {isExpanded && (
                  <div className="px-2 pb-4 border-t border-mint-50">
                    <p className="text-xs text-gray-400 mt-2 mb-1">← 左右滑动查看更多班型 →</p>
                    <div className="overflow-x-auto -mx-2 px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="text-xs border-collapse" style={{ minWidth: '800px' }}>
                        <thead>
                          <tr className="border-b border-mint-100">
                            <th className="text-left py-2 text-gray-400 font-medium sticky left-0 bg-white z-10 min-w-[60px]">年级</th>
                            {CLASS_TYPES.map(ct => (
                              <th key={ct} className="text-right py-2 text-gray-400 font-medium px-1.5 min-w-[36px]">{ct.replace('1v','')}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {grades.map((grade) => (
                            <tr key={grade} className="border-b border-mint-50">
                              <td className="py-2 text-gray-700 font-medium sticky left-0 bg-white z-10 text-xs">{grade}</td>
                              {CLASS_TYPES.map(ct => {
                                const rate = rates.find(r => r.grade === grade && r.class_type === ct);
                                return (
                                  <td key={ct} className="text-right py-2 px-1.5 text-gray-600 text-xs">
                                    {rate ? `¥${rate.price_per_hour}` : <span className="text-gray-300">—</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <TierModal
          tier={editingTier}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['pricing'] });
          }}
        />
      )}

      {/* 删除确认 */}
      {deleteConfirm && (
        <DeleteTierConfirm
          tier={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onDeleted={() => {
            setDeleteConfirm(null);
            queryClient.invalidateQueries({ queryKey: ['pricing'] });
          }}
        />
      )}
    </div>
  );
}

function TierModal({ tier, onClose, onSaved }: { tier: PricingTier | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tier?.name ?? '');
  const [minHours, setMinHours] = useState(tier?.min_hours?.toString() ?? '0');
  const [maxHours, setMaxHours] = useState(tier?.max_hours?.toString() ?? '59.9');
  const [sortOrder, setSortOrder] = useState(tier?.sort_order?.toString() ?? '1');
  const [grades, setGrades] = useState<string[]>(() => {
    if (tier?.rates && tier.rates.length > 0) {
      return [...new Set(tier.rates.map(r => r.grade))].sort();
    }
    return ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'];
  });
  const [rates, setRates] = useState<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {};
    if (tier?.rates) {
      for (const r of tier.rates) {
        if (!map[r.grade]) map[r.grade] = {};
        map[r.grade][r.class_type] = r.price_per_hour;
      }
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setRate = (grade: string, classType: string, value: number) => {
    setRates(prev => ({
      ...prev,
      [grade]: { ...(prev[grade] ?? {}), [classType]: value },
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('请输入阶梯名称'); return; }
    setSaving(true);
    setError('');

    try {
      if (tier) {
        // 更新阶梯
        await supabase.from('pricing_tiers').update({
          name, min_hours: parseFloat(minHours), max_hours: parseFloat(maxHours),
          sort_order: parseInt(sortOrder),
        }).eq('id', tier.id);

        // 删除旧rates
        await supabase.from('pricing_rates').delete().eq('tier_id', tier.id);

        // 插入新rates
        const newRates: Omit<PricingRate, 'id'>[] = [];
        for (const grade of grades) {
          for (const ct of CLASS_TYPES) {
            if (rates[grade]?.[ct] != null && rates[grade][ct] > 0) {
              newRates.push({ tier_id: tier.id, grade, class_type: ct, price_per_hour: rates[grade][ct] });
            }
          }
        }
        if (newRates.length > 0) {
          await supabase.from('pricing_rates').insert(newRates);
        }
      } else {
        // 新建阶梯
        const { data: newTier, error: insertErr } = await supabase
          .from('pricing_tiers')
          .insert({ name, min_hours: parseFloat(minHours), max_hours: parseFloat(maxHours), sort_order: parseInt(sortOrder) })
          .select().single();
        if (insertErr) throw insertErr;

        const newRates: Omit<PricingRate, 'id'>[] = [];
        for (const grade of grades) {
          for (const ct of CLASS_TYPES) {
            if (rates[grade]?.[ct] != null && rates[grade][ct] > 0) {
              newRates.push({ tier_id: newTier.id, grade, class_type: ct, price_per_hour: rates[grade][ct] });
            }
          }
        }
        if (newRates.length > 0) {
          await supabase.from('pricing_rates').insert(newRates);
        }
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
    setSaving(false);
  };

  const allGrades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'];

  const toggleGrade = (g: string) => {
    if (grades.includes(g)) {
      setGrades(grades.filter(x => x !== g));
    } else {
      setGrades([...grades, g].sort((a, b) => allGrades.indexOf(a) - allGrades.indexOf(b)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 animate-slide-up safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{tier ? '编辑阶梯' : '添加阶梯'}</h2>
        {error && <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</div>}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="如：第一档" className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">排序</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">最低课时</label>
            <input type="number" step="0.1" value={minHours} onChange={(e) => setMinHours(e.target.value)}
              className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">最高课时</label>
            <input type="number" step="0.1" value={maxHours} onChange={(e) => setMaxHours(e.target.value)}
              className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm" />
          </div>
        </div>

        {/* 年级选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">适用的年级</label>
          <div className="flex flex-wrap gap-1.5">
            {allGrades.map(g => (
              <button key={g} type="button" onClick={() => toggleGrade(g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  grades.includes(g) ? 'bg-mint-500 text-white' : 'bg-mint-50 text-gray-400 hover:bg-mint-100'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 单价表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mint-100">
                <th className="text-left py-2 text-gray-400 font-medium text-xs">年级 \\ 类型</th>
                {CLASS_TYPES.map(ct => (
                  <th key={ct} className="text-center py-2 text-gray-400 font-medium text-xs px-1">{ct}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.map(grade => (
                <tr key={grade} className="border-b border-mint-50">
                  <td className="py-1.5 text-gray-700 font-medium text-xs">{grade}</td>
                  {CLASS_TYPES.map(ct => (
                    <td key={ct} className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.5"
                        value={rates[grade]?.[ct] ?? ''}
                        onChange={(e) => setRate(grade, ct, parseFloat(e.target.value) || 0)}
                        className="w-16 text-center px-1 py-1.5 border border-mint-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-mint-200"
                        placeholder="—"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-mint-200 text-gray-500 rounded-xl text-sm font-medium">
            取消
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-mint-500 text-white rounded-xl text-sm font-medium hover:bg-mint-600 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteTierConfirm({ tier, onClose, onDeleted }: { tier: PricingTier; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('pricing_tiers').delete().eq('id', tier.id);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-2xl w-72 p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800">确认删除？</h3>
        <p className="text-sm text-gray-400 mt-1">阶梯「{tier.name}」将被永久删除。</p>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-mint-200 rounded-xl text-sm text-gray-500">取消</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium">删除</button>
        </div>
      </div>
    </div>
  );
}
