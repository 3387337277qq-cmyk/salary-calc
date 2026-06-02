import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { calculateRecordSalary, calculateFormulaPrice } from '../lib/pricing';
import { useAuthStore } from '../stores/authStore';
import type { Student, ClassRecord, ClassType, PricingTier } from '../types/database';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Users, X, Search, Settings, Plus, Trash2 } from 'lucide-react';

// 存储的自定义规则类型
interface CustomRule {
  id: string;
  studentNames: string[];
  ruleType: 'fixed_class' | 'custom_price' | 'formula';
  classType: ClassType;      // 显示用的班型
  customRuleDesc: string;    // 规则描述
  unitPrice: number;         // 自定义单价(元/时)
  formula: string;           // 公式如 "1v1+1v4"
  label: string;
}

// 自动判断班课类型（含自定义规则）
function detectClassType(
  selectedNames: string[],
  customRules: CustomRule[]
): { classType: ClassType; isCustom: boolean; customRule: string; label: string; customUnitPrice?: number; customFormula?: string } {
  const n = selectedNames.length;
  if (n === 0) return { classType: '1v1', isCustom: false, customRule: '', label: '' };

  // 先检查自定义规则（按学生名称匹配）
  const sortedNames = [...selectedNames].sort();
  for (const rule of customRules) {
    const ruleNames = [...rule.studentNames].sort();
    if (sortedNames.length === ruleNames.length && sortedNames.every((name, i) => name === ruleNames[i])) {
      if (rule.ruleType === 'formula') {
        return { classType: rule.classType, isCustom: true, customRule: rule.customRuleDesc, label: rule.label, customFormula: rule.formula };
      }
      if (rule.ruleType === 'custom_price') {
        return { classType: rule.classType, isCustom: true, customRule: rule.customRuleDesc, label: rule.label, customUnitPrice: rule.unitPrice };
      }
      return { classType: rule.classType, isCustom: false, customRule: '', label: rule.label };
    }
  }

  // 硬编码兜底规则
  const special3 = ['谢秋辰', '黄乔梓', '谢浩燃'];
  if (n === 3 && special3.every(n => selectedNames.includes(n))) {
    return { classType: '1v3', isCustom: true, customRule: '1v1+1v4 (公式)', label: '三人特殊班 · 1v1+1v4', customFormula: '1v1+1v4' };
  }

  const special2 = ['林雅歌', '张昊翔'];
  if (n === 2 && special2.every(n => selectedNames.includes(n))) {
    return { classType: '1v2', isCustom: false, customRule: '', label: '二人指定 · 1v2' };
  }

  if (n === 1) return { classType: '1v1', isCustom: false, customRule: '', label: '单人 · 1v1' };

  const multiplied = Math.min(n * 3, 20);
  const ct = `1v${multiplied}` as ClassType;
  return { classType: ct, isCustom: false, customRule: '', label: `${n}人班课 · ${ct} (人数×3)` };
}

export function RecordFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [classDate, setClassDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState('2');
  const [isCustom, setIsCustom] = useState(false);
  const [customRule, setCustomRule] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // 加载自定义规则
  useEffect(() => {
    async function loadRules() {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'custom_class_rules').maybeSingle();
      if (data?.value) {
        try { setCustomRules(JSON.parse(typeof data.value === 'string' ? data.value : JSON.stringify(data.value))); } catch {}
      }
    }
    if (user) loadRules();
  }, [user]);

  // 保存自定义规则
  const saveRules = async (rules: CustomRule[]) => {
    setCustomRules(rules);
    await supabase.from('app_settings').upsert({
      user_id: user?.id,
      key: 'custom_class_rules',
      value: JSON.parse(JSON.stringify(rules)),
    }, { onConflict: 'user_id, key' });
  };

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('is_active', true).order('name');
      return (data ?? []) as Student[];
    },
  });

  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const { data: tierData } = await supabase.from('pricing_tiers').select('*').order('sort_order');
      let allRates = [], from = 0;
      while (true) { const { data } = await supabase.from('pricing_rates').select('*').range(from, from+999); if (!data||data.length===0) break; allRates=allRates.concat(data); if (data.length<1000) break; from+=1000; }
      return (tierData ?? []).map(t => ({ ...t, rates: allRates.filter(r => r.tier_id === t.id) })) as PricingTier[];
    },
    staleTime: 0, // 禁用缓存，每次都重新查
  });

  const { data: monthRecords = [] } = useQuery({
    queryKey: ['records', classDate.substring(0, 7)],
    queryFn: async () => {
      const year = parseInt(classDate.substring(0, 4));
      const month = parseInt(classDate.substring(5, 7));
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      const { data } = await supabase
        .from('class_records')
        .select('id, class_date, hours, student:students(grade)')
        .gte('class_date', start)
        .lte('class_date', end);
      return (data ?? []) as unknown as { id: string; class_date: string; hours: number; student: { grade: string } | null }[];
    },
  });

  const { data: editingRecord } = useQuery({
    queryKey: ['record', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('class_records').select('*, student:students(*)').eq('id', id).single();
      return data as ClassRecord | null;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (editingRecord) {
      setSelectedStudents([editingRecord.student_id]);
      setClassDate(editingRecord.class_date);
      setHours(editingRecord.hours.toString());
      setIsCustom(editingRecord.is_custom);
      setCustomRule(editingRecord.custom_rule ?? '');
      setCustomPrice(editingRecord.custom_price?.toString() ?? '');
      setRemarks(editingRecord.remarks ?? '');
    }
  }, [editingRecord]);

  // 选中的学生对象
  const selectedStudentObjs = useMemo(
    () => selectedStudents.map(id => students.find(s => s.id === id)).filter(Boolean) as Student[],
    [selectedStudents, students]
  );

  const selectedNames = useMemo(() => selectedStudentObjs.map(s => s.name), [selectedStudentObjs]);

  // 自动检测班课类型
  const detected = useMemo(() => detectClassType(selectedNames, customRules), [selectedNames, customRules]);

  const classType = detected.classType;

  // 取第一个学生的年级来计算价格
  const primaryGrade = selectedStudentObjs[0]?.grade ?? '';

  // 总课时
  const totalMonthHours = useMemo(() => {
    const year = parseInt(classDate.substring(0, 4));
    const month = parseInt(classDate.substring(5, 7));
    let total = 0;
    for (const r of monthRecords) {
      const d = new Date(r.class_date);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        if (isEdit && r.id === id) continue;
        total += r.hours;
      }
    }
    total += parseFloat(hours) || 0;
    return total;
  }, [monthRecords, classDate, hours, isEdit, id]);

  // 价格预览
  const pricePreview = useMemo(() => {
    if (!primaryGrade || !hours) return null;
    const effectiveCustom = detected.isCustom || isCustom;
    const effectiveFormula = detected.customFormula || null;
    const effectivePrice = detected.customUnitPrice || (isCustom ? parseFloat(customPrice) || null : null);
    try {
      return calculateRecordSalary(
        primaryGrade,
        classType,
        parseFloat(hours) || 0,
        totalMonthHours,
        tiers,
        effectiveCustom,
        effectiveFormula ? null : effectivePrice,
        effectiveFormula,
      );
    } catch { return null; }
  }, [primaryGrade, classType, hours, totalMonthHours, tiers, isCustom, customPrice, detected]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) return prev.filter(id => id !== studentId);
      if (prev.length >= 5) return prev; // 最多5人
      return [...prev, studentId];
    });
    // 选择学生后自动应用检测结果
    if (detected.isCustom) {
      setIsCustom(true);
      setCustomRule(detected.customRule);
    } else {
      setIsCustom(false);
      setCustomRule('');
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentGrade.trim()) return;
    const { data, error: e } = await supabase
      .from('students')
      .insert({ name: newStudentName.trim(), grade: newStudentGrade.trim(), ...(user?.id ? { user_id: user.id } : {}) })
      .select().single();
    if (e) { setError(e.message); return; }
    queryClient.invalidateQueries({ queryKey: ['students'] });
    setSelectedStudents(prev => [...prev, data.id]);
    setNewStudentName('');
    setNewStudentGrade('');
    setShowNewStudent(false);
  };

  const filteredStudents = students.filter(s =>
    !studentSearch || s.name.includes(studentSearch) || s.grade.includes(studentSearch)
  );

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) { setError('请选择至少一个学生'); return; }
    if (!classDate) { setError('请选择日期'); return; }
    if (!hours || parseFloat(hours) <= 0) { setError('请输入有效课时'); return; }
    if (isEdit && !remarks.trim()) { setError('修改记录必须填写备注说明原因'); return; }

    setSaving(true);
    setError('');

    // 实时计算价格（不依赖useMemo，防缓存问题）
    let unitPrice = 0;
    let salary = 0;
    const parsedHours = parseFloat(hours) || 0;
    const isFormula = detected.isCustom && detected.customFormula;
    const isFixedCustom = detected.isCustom && detected.customUnitPrice;

    if (isFormula && detected.customFormula) {
      // 公式计算：从价格表查各组件并累加
      try {
        const result = calculateFormulaPrice(detected.customFormula, primaryGrade, tiers, totalMonthHours);
        unitPrice = result.unitPrice;
        salary = parsedHours * unitPrice;
      } catch (e) {
        setError('公式计算失败: ' + (e instanceof Error ? e.message : '未知错误'));
        setSaving(false);
        return;
      }
    } else if (isFixedCustom) {
      unitPrice = detected.customUnitPrice!;
      salary = parsedHours * unitPrice;
    } else if (detected.isCustom || isCustom) {
      const cp = parseFloat(customPrice) || 0;
      unitPrice = cp;
      salary = parsedHours * cp;
    } else {
      // 标准计算：先试主要年级，不行就遍历所有年级找匹配
      try {
        // 先找匹配的阶梯
        const sortedTiers = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
        const matchedTier = sortedTiers.find(t => totalMonthHours >= t.min_hours && totalMonthHours <= t.max_hours) || sortedTiers[0];
        if (!matchedTier) throw new Error('未配置定价阶梯');

        // 尝试用主要年级查找
        let rate = matchedTier.rates?.find(r => r.grade === primaryGrade && r.class_type === classType);
        // 找不到就用第一个匹配的年级
        if (!rate) {
          rate = matchedTier.rates?.find(r => r.class_type === classType);
        }
        if (!rate) {
          throw new Error(`未找到「${primaryGrade}」年级「${classType}」在阶梯「${matchedTier.name}」中的单价。可用年级: ${[...new Set((matchedTier.rates||[]).map(r=>r.grade))].join(',')}`);
        }
        unitPrice = rate.price_per_hour;
        salary = parsedHours * unitPrice;
      } catch (e) {
        setError('价格计算失败: ' + (e instanceof Error ? e.message : '未知错误'));
        setSaving(false);
        return;
      }
    }

    if (unitPrice <= 0) {
      setError('价格计算为0，请检查定价设置');
      setSaving(false);
      return;
    }

    // 其他学生备注
    const otherStudents = selectedStudentObjs.slice(1).map(s => s.name).join('、');
    const finalRemarks = [otherStudents ? `同堂: ${otherStudents}` : '', remarks].filter(Boolean).join(' | ');

    try {
      if (isEdit && id) {
        const history = editingRecord?.modification_history ?? [];
        history.push({ changed_at: new Date().toISOString(), changed_fields: ['update'], previous_values: {}, remarks });
        await supabase.from('class_records').update({
          student_id: selectedStudents[0],
          class_date: classDate,
          class_type: classType,
          hours: parseFloat(hours),
          unit_price: unitPrice,
          salary: salary,
          is_custom: detected.isCustom || isCustom,
          custom_rule: detected.isCustom ? detected.customRule : (isCustom ? customRule : null),
          custom_price: detected.customUnitPrice || (isCustom ? (parseFloat(customPrice) || null) : null),
          remarks: finalRemarks || null,
          modification_history: history,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } else {
        await supabase.from('class_records').insert({
          user_id: user?.id,
          student_id: selectedStudents[0],
          class_date: classDate,
          class_type: classType,
          hours: parseFloat(hours),
          unit_price: unitPrice,
          salary: salary,
          is_custom: detected.isCustom || isCustom,
          custom_rule: detected.isCustom ? detected.customRule : (isCustom ? customRule : null),
          custom_price: detected.customUnitPrice || (isCustom ? (parseFloat(customPrice) || null) : null),
          remarks: finalRemarks || null,
          source: 'manual',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      navigate('/records');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{isEdit ? '编辑记录' : '添加课程'}</h1>
      </div>

      {error && <div className="bg-red-50 text-red-500 text-sm rounded-xl px-4 py-3 mb-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-mint-100 p-5 space-y-4">
        {/* 日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">日期 *</label>
          <input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-mint-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-300" />
        </div>

        {/* 学生多选 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            选择学生 * <span className="text-xs text-gray-400">（可多选）</span>
          </label>

          {/* 已选标签 */}
          {selectedStudentObjs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedStudentObjs.map(s => (
                <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-mint-100 text-mint-700 rounded-lg text-xs font-medium">
                  {s.name}
                  <button onClick={() => setSelectedStudents(prev => prev.filter(id => id !== s.id))}
                    className="hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}

          {/* 搜索 */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
              placeholder="搜索学生..." className="w-full pl-8 pr-3 py-2 border border-mint-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-mint-200" />
          </div>

          {/* 学生列表 */}
          <div className="max-h-48 overflow-y-auto border border-mint-100 rounded-xl divide-y divide-mint-50">
            {filteredStudents.map(s => {
              const isSelected = selectedStudents.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left ${
                    isSelected ? 'bg-mint-50 text-mint-700' : 'hover:bg-gray-50 text-gray-600'
                  }`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-mint-500 border-mint-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{s.grade}</span>
                </button>
              );
            })}
          </div>

          <button onClick={() => setShowNewStudent(!showNewStudent)}
            className="mt-2 text-xs text-mint-600 font-medium hover:underline">
            + 添加新学生
          </button>

          {showNewStudent && (
            <div className="mt-2 p-3 bg-mint-50 rounded-xl space-y-2 animate-fade-in">
              <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                placeholder="学生姓名" className="w-full px-3 py-2 border border-mint-200 rounded-lg text-sm" />
              <div className="flex gap-2">
                <select value={newStudentGrade} onChange={e => setNewStudentGrade(e.target.value)}
                  className="flex-1 px-3 py-2 border border-mint-200 rounded-lg text-sm bg-white">
                  <option value="">选年级</option>
                  <option value="初三">初三</option>
                  <option value="小六至初二">6-8年级</option>
                </select>
                <button onClick={handleAddStudent}
                  className="px-4 py-2 bg-mint-500 text-white rounded-lg text-sm font-medium whitespace-nowrap">
                  确认
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 自动识别结果 */}
        {selectedStudents.length > 0 && (
          <div className="bg-mint-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-mint-600" />
                <span className="text-sm font-medium text-mint-700">
                  已选{selectedStudents.length}人
                </span>
              </div>
              <button onClick={() => setShowRulesModal(true)}
                className="text-xs text-gray-400 hover:text-mint-600 flex items-center gap-1">
                <Settings className="w-3.5 h-3.5" />规则
              </button>
            </div>
            <div>
              <span className="text-xs text-gray-500">识别类型：</span>
              <span className={`ml-1 px-2 py-0.5 rounded text-xs font-bold ${
                detected.isCustom ? 'bg-amber-100 text-amber-700' : 'bg-mint-200 text-mint-700'
              }`}>
                {detected.label}
              </span>
            </div>
            {detected.isCustom && (
              <p className="text-xs text-amber-600">⚠ 已应用特殊规则：{detected.customRule}</p>
            )}
          </div>
        )}

        {/* 无学生时也可打开规则管理 */}
        {selectedStudents.length === 0 && (
          <button onClick={() => setShowRulesModal(true)}
            className="w-full py-2.5 border border-dashed border-mint-200 rounded-xl text-xs text-gray-400 hover:text-mint-600 hover:border-mint-400 flex items-center justify-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            管理自定义班课规则
          </button>
        )}

        {/* 课时 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">课时（小时） *</label>
          <div className="relative">
            <input type="number" step="0.5" min="0.5" value={hours} onChange={e => setHours(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-mint-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-300" />
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* 手动覆盖（非特殊情况时可选） */}
        {!detected.isCustom && (
          <div className="border-t border-mint-100 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isCustom} onChange={e => setIsCustom(e.target.checked)}
                className="w-4 h-4 rounded border-mint-300 text-mint-500 focus:ring-mint-300" />
              <span className="text-sm font-medium text-gray-600">手动覆盖计价</span>
            </label>
            {isCustom && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <input type="text" value={customRule} onChange={e => setCustomRule(e.target.value)}
                  placeholder="规则说明" className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm" />
                <input type="number" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)}
                  placeholder="自定义单价（元/小时）" className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm" />
              </div>
            )}
          </div>
        )}

        {/* 编辑备注 */}
        {isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">修改备注 *</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="请说明修改原因..." rows={2}
              className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm resize-none" />
          </div>
        )}
      </div>

      {/* 价格预览 */}
      {primaryGrade && (
        <div className="mt-4 bg-white rounded-2xl border border-mint-100 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">价格预览</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">年级：</span><span className="text-gray-700 font-medium">{primaryGrade}</span></div>
            <div><span className="text-gray-400">类型：</span><span className="text-gray-700 font-medium">{classType}{detected.isCustom ? ' (特殊)' : ''}</span></div>
            <div><span className="text-gray-400">当月总课时：</span><span className="text-mint-700 font-bold">{totalMonthHours.toFixed(1)}h</span></div>
            <div><span className="text-gray-400">阶梯：</span><span className="text-mint-700 font-bold">{pricePreview?.tierName ?? '—'}</span></div>
            <div><span className="text-gray-400">单价：</span><span className="text-gray-700 font-medium">¥{pricePreview?.unitPrice.toFixed(2) ?? '—'}/h</span></div>
            <div><span className="text-gray-400">本课工资：</span><span className="text-orange-500 font-bold text-lg">¥{pricePreview?.salary.toFixed(0) ?? '—'}</span></div>
          </div>
        </div>
      )}

      {/* 保存 */}
      <div className="flex gap-3 mt-5 pb-4">
        <button onClick={() => navigate(-1)} className="flex-1 py-3 border border-mint-200 text-gray-500 rounded-xl text-sm font-medium">取消</button>
        <button onClick={handleSubmit} disabled={saving || tiersLoading}
          className="flex-1 py-3 bg-mint-500 text-white rounded-xl text-sm font-semibold hover:bg-mint-600 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm">
          {tiersLoading ? '加载价格表中...' : saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 自定义规则管理弹窗 */}
      {showRulesModal && (
        <RulesModal
          students={students}
          customRules={customRules}
          onSave={saveRules}
          onClose={() => setShowRulesModal(false)}
        />
      )}
    </div>
  );
}

// 自定义规则管理弹窗组件
function RulesModal({ students, customRules, onSave, onClose }: {
  students: Student[];
  customRules: CustomRule[];
  onSave: (rules: CustomRule[]) => void;
  onClose: () => void;
}) {
  const [rules, setRules] = useState<CustomRule[]>(customRules);
  const [adding, setAdding] = useState(false);
  const [newNames, setNewNames] = useState<string[]>([]);
  const [newRuleType, setNewRuleType] = useState<'fixed_class' | 'custom_price' | 'formula'>('fixed_class');
  const [newFormula, setNewFormula] = useState('');
  const [newClassType, setNewClassType] = useState<ClassType>('1v2');
  const [newPrice, setNewPrice] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [search, setSearch] = useState('');

  const save = () => {
    onSave(rules);
    onClose();
  };

  const addRule = () => {
    if (newNames.length < 2) return;
    const rule: CustomRule = {
      id: Date.now().toString(),
      studentNames: [...newNames],
      ruleType: newRuleType,
      classType: newClassType,
      customRuleDesc: newRuleType === 'formula' ? newFormula : (newDesc || (newRuleType === 'custom_price' ? `自定义${newPrice}元/时` : `固定班型${newClassType}`)),
      unitPrice: parseFloat(newPrice) || 0,
      formula: newRuleType === 'formula' ? newFormula : '',
      label: newLabel || `${newNames.length}人特殊规则`,
    };
    setRules([...rules, rule]);
    setAdding(false);
    setNewNames([]);
    setNewPrice('');
    setNewLabel('');
    setNewDesc('');
  };

  const removeRule = (id: string) => setRules(rules.filter(r => r.id !== id));

  const toggleName = (name: string) => {
    setNewNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const filtered = students.filter(s => !search || s.name.includes(search));

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-5 animate-slide-up safe-area-bottom"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">自定义班课规则</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-gray-400 mb-4">设置特定学生组合的计价规则，选学生时会自动匹配。</p>

        {/* 已有规则列表 */}
        {rules.length > 0 ? (
          <div className="space-y-2 mb-4">
            {rules.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-mint-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.label}</p>
                  <p className="text-xs text-gray-400">{r.studentNames.join('、')} · {r.customRuleDesc}</p>
                </div>
                <button onClick={() => removeRule(r.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">暂无自定义规则</p>
        )}

        {/* 添加新规则 */}
        {adding ? (
          <div className="bg-mint-50 rounded-xl p-4 space-y-3 animate-fade-in">
            <p className="text-sm font-medium text-gray-700">添加新规则</p>

            {/* 选学生 */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">选择学生组合（至少2人）</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {newNames.map(n => <span key={n} className="px-2 py-0.5 bg-mint-200 text-mint-700 rounded text-xs">{n}
                  <button onClick={() => toggleName(n)} className="ml-1">×</button></span>)}
              </div>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索学生..."
                className="w-full px-3 py-1.5 border border-mint-200 rounded-lg text-xs mb-1" />
              <div className="max-h-28 overflow-y-auto border border-mint-100 rounded-lg divide-y divide-mint-50">
                {filtered.slice(0, 15).map(s => (
                  <button key={s.id} onClick={() => toggleName(s.name)}
                    className={`w-full text-left px-3 py-1.5 text-xs ${newNames.includes(s.name) ? 'bg-mint-100 text-mint-700' : 'text-gray-600'}`}>
                    {newNames.includes(s.name) ? '✓ ' : ''}{s.name} ({s.grade})
                  </button>
                ))}
              </div>
            </div>

            {/* 规则类型 */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">规则类型</label>
              <div className="flex gap-1.5">
                <button onClick={() => setNewRuleType('fixed_class')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${newRuleType === 'fixed_class' ? 'bg-mint-500 text-white' : 'bg-white text-gray-500 border border-mint-100'}`}>
                  指定班型
                </button>
                <button onClick={() => setNewRuleType('formula')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${newRuleType === 'formula' ? 'bg-mint-500 text-white' : 'bg-white text-gray-500 border border-mint-100'}`}>
                  公式组合
                </button>
                <button onClick={() => setNewRuleType('custom_price')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${newRuleType === 'custom_price' ? 'bg-mint-500 text-white' : 'bg-white text-gray-500 border border-mint-100'}`}>
                  固定单价
                </button>
              </div>
            </div>

            {newRuleType === 'formula' ? (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">组合公式（从价格表查各组件并求和）</label>
                <input type="text" value={newFormula} onChange={e => setNewFormula(e.target.value)}
                  placeholder="如 1v1+1v4 或 1v2+1v3" className="w-full px-3 py-1.5 border border-mint-200 rounded-lg text-xs" />
                <p className="text-xs text-gray-400 mt-1">按 "+" 拆分，自动查价格表累加</p>
              </div>
            ) : newRuleType === 'fixed_class' ? (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-500">固定为</span>
                <select value={newClassType} onChange={e => setNewClassType(e.target.value as ClassType)}
                  className="px-2 py-1 border border-mint-200 rounded-lg text-xs bg-white">
                  {Array.from({length: 20}, (_, i) => `1v${i+1}`).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">自定义单价（元/时）</label>
                <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                  placeholder="如 170" className="w-full px-3 py-1.5 border border-mint-200 rounded-lg text-xs" />
                <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="规则说明（如 1v1+1v4）" className="w-full mt-1 px-3 py-1.5 border border-mint-200 rounded-lg text-xs" />
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1 block">标签名（方便识别）</label>
              <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="如 三人特殊班" className="w-full px-3 py-1.5 border border-mint-200 rounded-lg text-xs" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 py-2 border border-mint-200 text-gray-500 rounded-lg text-xs">取消</button>
              <button onClick={addRule} disabled={newNames.length < 2}
                className="flex-1 py-2 bg-mint-500 text-white rounded-lg text-xs font-medium disabled:opacity-50">确认添加</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full py-2.5 border border-dashed border-mint-200 rounded-xl text-xs text-mint-600 hover:bg-mint-50 flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            添加新规则
          </button>
        )}

        <button onClick={save}
          className="w-full mt-4 py-3 bg-mint-500 text-white rounded-xl text-sm font-semibold hover:bg-mint-600">
          保存并关闭
        </button>
      </div>
    </div>
  );
}
