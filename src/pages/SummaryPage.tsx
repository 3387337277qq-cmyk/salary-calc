import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ClassRecord, ClassType, PricingTier } from '../types/database';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar, Clock, DollarSign, TrendingUp, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

type ViewMode = 'monthly' | 'range';

export function SummaryPage() {
  const [mode, setMode] = useState<ViewMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const queryStart = mode === 'monthly'
    ? format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
    : dateRange.start;
  const queryEnd = mode === 'monthly'
    ? format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
    : dateRange.end;

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['summary-records', queryStart, queryEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from('class_records')
        .select('*, student:students(id, name, grade)')
        .gte('class_date', queryStart)
        .lte('class_date', queryEnd)
        .order('class_date');
      return (data ?? []) as ClassRecord[];
    },
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const { data: tierData } = await supabase.from('pricing_tiers').select('*').order('sort_order');
      let allRates = [], from = 0;
      while (true) { const { data } = await supabase.from('pricing_rates').select('*').range(from, from+999); if (!data||data.length===0) break; allRates=allRates.concat(data); if (data.length<1000) break; from+=1000; }
      return (tierData ?? []).map(t => ({ ...t, rates: allRates.filter(r => r.tier_id === t.id) })) as PricingTier[];
    },
    staleTime: 0,
  });

  // 统计汇总
  const summary = useMemo(() => {
    const totalHours = records.reduce((s, r) => s + r.hours, 0);

    // 按类型汇总（特殊规则分开）
    const byType = new Map<string, { hours: number; salary: number; count: number; label: string }>();
    // 按学生汇总（班课合并）
    const byStudent = new Map<string, { names: string[]; grade: string; hours: number; salary: number; count: number }>();
    // 用 sessionKey 去重：同日期+同类型+同组学生
    const sessionSeen = new Set<string>();

    // 找匹配的阶梯
    const sortedTiers = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
    const matchedTier = sortedTiers.find(
      (t) => totalHours >= t.min_hours && totalHours <= t.max_hours,
    );

    let totalSalary = 0;

    for (const record of records) {
      const salary = record.salary ?? 0;
      totalSalary += salary;

      // 按类型（特殊规则分开显示）
      let typeKey = record.class_type;
      let label = record.class_type;
      if (record.is_custom && record.custom_rule) {
        if (record.custom_rule.includes('1v1+1v4')) label = '1v3 (公式 1v1+1v4)';
        else if (record.custom_rule.includes('人数×3')) label = record.class_type + ' (人数×3)';
        else if (record.custom_rule.includes('晚辅导')) label = '晚辅导';
        else if (record.custom_rule.includes('指定1v2')) label = '1v2 (指定)';
        else label = record.class_type + ' (自定义)';
        typeKey = label;
      }
      const typeEntry = byType.get(typeKey) ?? { hours: 0, salary: 0, count: 0, label };
      typeEntry.hours += record.hours;
      typeEntry.salary += salary;
      typeEntry.count += 1;
      byType.set(typeKey, typeEntry);

      // 按学生——合并班课
      const remarks = record.remarks || '';
      const isGroup = remarks.includes('同堂:');
      let allNames: string[];
      if (isGroup) {
        const mainName = record.student?.name ?? '未知';
        const others = remarks.replace('同堂: ', '').replace('同堂:', '').split('、').map(s => s.trim()).filter(Boolean);
        allNames = [mainName, ...others].sort();
      } else {
        allNames = [record.student?.name ?? '未知'];
      }
      const sessionKey = record.class_date + '|' + allNames.join(',');

      // 同一次班课只统计一次
      if (sessionSeen.has(sessionKey)) continue;
      sessionSeen.add(sessionKey);

      // 班课取整组总工资（把同堂的各条记录工资加总）
      let sessionSalary = salary;
      let sessionHours = record.hours;
      if (isGroup) {
        for (const r2 of records) {
          if (r2 === record) continue;
          const r2remarks = r2.remarks || '';
          if (!r2remarks.includes('同堂:')) continue;
          const r2main = r2.student?.name ?? '';
          const r2others = r2remarks.replace('同堂: ', '').replace('同堂:', '').split('、').map(s => s.trim()).filter(Boolean);
          const r2all = [r2main, ...r2others].sort();
          if (r2all.join(',') === allNames.join(',') && r2.class_date === record.class_date) {
            sessionSalary += (r2.salary ?? 0);
            // 工时只取一份（同堂各条都是同一节课）
          }
        }
      }

      const displayName = allNames.join('、');
      const firstStudent = record.student;
      const entry = byStudent.get(displayName) ?? {
        names: allNames,
        grade: firstStudent?.grade ?? '',
        hours: 0, salary: 0, count: 0,
      };
      entry.hours += sessionHours;
      entry.salary += sessionSalary;
      entry.count += 1;
      byStudent.set(displayName, entry);
    }

    return {
      totalHours,
      totalSalary,
      recordCount: records.length,
      tierName: matchedTier?.name ?? '未匹配',
      byType: [...byType.entries()].map(([k, v]) => ({ ...v, classType: k as ClassType })),
      byStudent: [...byStudent.entries()].map(([k, v]) => ({ ...v, studentId: k, name: v.names.join('、') })),
    };
  }, [records, tiers]);

  const goPrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const goNextMonth = () => {
    const next = new Date(selectedMonth);
    next.setMonth(next.getMonth() + 1);
    if (next <= new Date()) setSelectedMonth(next);
  };

  const classTypeColors: Partial<Record<ClassType, string>> = {
    '1v1': 'bg-mint-100 text-mint-700',
    '1v2': 'bg-blue-100 text-blue-700',
    '1v3': 'bg-orange-100 text-orange-700',
    '1v6': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-gray-800 mb-4">工资汇总</h1>

      {/* 模式切换 */}
      <div className="flex bg-white rounded-xl border border-mint-100 p-1 mb-4">
        <button
          onClick={() => setMode('monthly')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'monthly' ? 'bg-mint-500 text-white shadow-sm' : 'text-gray-500'
          }`}
        >
          月度汇总
        </button>
        <button
          onClick={() => setMode('range')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'range' ? 'bg-mint-500 text-white shadow-sm' : 'text-gray-500'
          }`}
        >
          时间段查询
        </button>
      </div>

      {/* 月份选择 / 日期范围 */}
      {mode === 'monthly' ? (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button onClick={goPrevMonth} className="p-2 rounded-lg hover:bg-white text-gray-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-700">{format(selectedMonth, 'yyyy年M月')}</h2>
          <button onClick={goNextMonth} className="p-2 rounded-lg hover:bg-white text-gray-500 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">开始日期</label>
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">结束日期</label>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-mint-200 rounded-xl text-sm" />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-24 bg-white rounded-xl animate-pulse" />
          <div className="h-32 bg-white rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* 概要卡片 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl border border-mint-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-mint-500" />
                <span className="text-xs text-gray-400">总课时</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{summary.totalHours.toFixed(1)}<span className="text-sm font-normal text-gray-400">h</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-mint-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                <span className="text-xs text-gray-400">总工资</span>
              </div>
              <p className="text-2xl font-bold text-orange-500">¥{summary.totalSalary.toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-mint-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-mint-500" />
                <span className="text-xs text-gray-400">所处阶梯</span>
              </div>
              <p className="text-lg font-bold text-mint-700">{summary.tierName}</p>
            </div>
            <div className="bg-white rounded-2xl border border-mint-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-mint-500" />
                <span className="text-xs text-gray-400">课程次数</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{summary.recordCount}<span className="text-sm font-normal text-gray-400">次</span></p>
            </div>
          </div>

          {/* 按类型分类 */}
          {summary.byType.length > 0 && (
            <div className="bg-white rounded-2xl border border-mint-100 p-4 mb-3">
              <h3 className="text-sm font-medium text-gray-500 mb-3">按上课类型统计</h3>
              <div className="space-y-2">
                {summary.byType.map((item) => (
                  <div key={item.classType} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${item.label.includes('自定义')||item.label.includes('公式')||item.label.includes('人数')||item.label.includes('指定')||item.label.includes('晚辅导') ? 'bg-amber-100 text-amber-700' : (classTypeColors[item.classType] || 'bg-mint-100 text-mint-700')}`}>
                        {item.label || item.classType}
                      </span>
                      <span className="text-xs text-gray-400">{item.count}次</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{item.hours.toFixed(1)}h</p>
                      <p className="text-xs text-gray-400">¥{item.salary.toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 按学生分类 */}
          {summary.byStudent.length > 0 && (
            <div className="bg-white rounded-2xl border border-mint-100 p-4 mb-3">
              <h3 className="text-sm font-medium text-gray-500 mb-3">按学生统计</h3>
              <div className="space-y-2">
                {summary.byStudent
                  .sort((a, b) => b.salary - a.salary)
                  .map((item) => (
                    <div key={item.studentId} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.grade} · {item.count}次课</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{item.hours.toFixed(1)}h</p>
                        <p className="text-xs text-orange-500 font-medium">¥{item.salary.toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {summary.recordCount === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-mint-100">
              <Calendar className="w-12 h-12 text-mint-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">该时间段暂无记录</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
