import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ClassRecord, ClassType } from '../types/database';
import { CLASS_TYPES } from '../types/database';
import { Plus, Search, Filter, X, Trash2, Pencil, Calendar, Clock } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function RecordListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  });
  const [filterType, setFilterType] = useState<ClassType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ClassRecord | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['records', dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_records')
        .select('*, student:students(id, name, grade, subject)')
        .gte('class_date', dateRange.start)
        .lte('class_date', dateRange.end)
        .order('class_date', { ascending: false });
      if (error) throw error;
      return data as ClassRecord[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('class_records').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search && !r.student?.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType && r.class_type !== filterType) return false;
      return true;
    });
  }, [records, search, filterType]);

  const totalHours = useMemo(() => filtered.reduce((s, r) => s + r.hours, 0), [filtered]);
  const totalSalary = useMemo(() => filtered.reduce((s, r) => s + (r.salary ?? 0), 0), [filtered]);

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // 快速月份选择
  const quickMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = subMonths(new Date(), i);
      months.push({
        label: format(d, 'M月'),
        start: format(startOfMonth(d), 'yyyy-MM-dd'),
        end: format(endOfMonth(d), 'yyyy-MM-dd'),
        isCurrent: i === 0,
      });
    }
    return months;
  }, []);

  const classTypeColors: Partial<Record<ClassType, string>> = {
    '1v1': 'bg-mint-100 text-mint-700',
    '1v2': 'bg-blue-100 text-blue-700',
    '1v3': 'bg-orange-100 text-orange-700',
    '1v6': 'bg-purple-100 text-purple-700',
    '1v9': 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="animate-fade-in">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">课程记录</h1>
        <button
          onClick={() => navigate('/records/new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-mint-500 text-white rounded-xl text-sm font-medium hover:bg-mint-600 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          添加记录
        </button>
      </div>

      {/* 快速月份 */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {quickMonths.map((m) => (
          <button
            key={m.label}
            onClick={() => setDateRange({ start: m.start, end: m.end })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              dateRange.start === m.start
                ? 'bg-mint-500 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-mint-100 hover:bg-mint-50'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
            showFilters ? 'bg-mint-100 text-mint-600' : 'bg-white text-gray-500 border border-mint-100'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          筛选
        </button>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-mint-100 p-3 mb-3 space-y-3 animate-fade-in">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">开始日期</label>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-2 py-1.5 border border-mint-200 rounded-lg text-xs" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">结束日期</label>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-2 py-1.5 border border-mint-200 rounded-lg text-xs" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">上课类型</label>
            <div className="flex gap-1.5">
              <button onClick={() => setFilterType('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${!filterType ? 'bg-mint-500 text-white' : 'bg-mint-50 text-gray-500'}`}>
                全部
              </button>
              {CLASS_TYPES.map(ct => (
                <button key={ct} onClick={() => setFilterType(ct)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${filterType === ct ? 'bg-mint-500 text-white' : 'bg-mint-50 text-gray-500'}`}>
                  {ct}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索学生姓名..." className="w-full pl-9 pr-3 py-2 bg-mint-50/50 border border-mint-200 rounded-lg text-xs" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 统计数据条 */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-white rounded-xl border border-mint-100 p-3 text-center">
          <p className="text-xs text-gray-400">总课时</p>
          <p className="text-lg font-bold text-mint-700">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-mint-100 p-3 text-center">
          <p className="text-xs text-gray-400">总工资</p>
          <p className="text-lg font-bold text-orange-500">¥{totalSalary.toFixed(0)}</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-mint-100 p-3 text-center">
          <p className="text-xs text-gray-400">记录数</p>
          <p className="text-lg font-bold text-gray-700">{filtered.length}</p>
        </div>
      </div>

      {/* 记录列表 */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-mint-100">
          <Calendar className="w-12 h-12 text-mint-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">暂无课程记录</p>
          <button onClick={() => navigate('/records/new')} className="mt-2 text-mint-600 text-sm font-medium hover:underline">
            添加第一条记录
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-xl border border-mint-100 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${classTypeColors[record.class_type]}`}>
                      {record.class_type}
                    </span>
                    {record.is_custom && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700">自定义</span>
                    )}
                    {record.source === 'ocr' && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-500">OCR</span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-800 text-sm">{record.student?.name ?? '未知学生'}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {record.student?.grade ?? ''}{record.student?.subject ? ` · ${record.student.subject}` : ''}
                    {record.remarks ? ` · 备注: ${record.remarks}` : ''}
                  </p>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <p className="text-lg font-bold text-gray-800">¥{record.salary?.toFixed(0) ?? '—'}</p>
                  <p className="text-xs text-gray-400">{record.hours}h × ¥{record.unit_price?.toFixed(0) ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-mint-50">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{record.class_date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{record.hours}小时</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => navigate(`/records/${record.id}/edit`)}
                    className="p-1.5 text-gray-400 hover:text-mint-600 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm(record)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-2xl w-72 p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-800">确认删除？</h3>
            <p className="text-sm text-gray-400 mt-1">
              {deleteConfirm.student?.name}的{deleteConfirm.class_type}课程记录将被删除，此操作不可恢复。
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-mint-200 rounded-xl text-sm text-gray-500">取消</button>
              <button onClick={handleDelete} disabled={deleteMutation.isPending}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
