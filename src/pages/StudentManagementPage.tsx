import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Student } from '../types/database';
import { Search, X, Trash2, Users, Pencil } from 'lucide-react';

export function StudentManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as Student[];
    },
  });

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.grade.includes(search)
  );

  // 按年级分组
  const gradeOrder = ['一年级至五年级', '六年级至初二', '初三', '高一至高二', '高三'];
  const grouped = new Map<string, Student[]>();
  for (const g of gradeOrder) grouped.set(g, []);
  for (const s of filtered) {
    const g = grouped.get(s.grade);
    if (g) g.push(s);
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">学生管理</h1>
        <span className="text-xs text-gray-400">{filtered.length}人</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索学生..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-mint-100 rounded-xl text-sm" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-mint-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{search ? '没有匹配的学生' : '暂无学生'}</p>
          <p className="text-xs text-gray-300 mt-1">在「添加课程」页面可以快速添加学生</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gradeOrder.map(grade => {
            const list = grouped.get(grade) || [];
            if (list.length === 0) return null;
            return (
              <div key={grade}>
                <h3 className="text-xs font-medium text-gray-400 mb-2 ml-1">{grade} · {list.length}人</h3>
                <div className="space-y-1.5">
                  {list.map(s => (
                    <div key={s.id} className="bg-white rounded-xl border border-mint-100 p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-mint-100 flex items-center justify-center text-mint-600 font-bold text-xs shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                        {s.notes && <p className="text-xs text-gray-400 truncate">{s.notes}</p>}
                      </div>
                      <button onClick={() => setEditingStudent(s)}
                        className="p-1.5 text-gray-400 hover:text-mint-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(s)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-2xl w-72 p-6 text-center shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-800">删除学生？</h3>
            <p className="text-sm text-gray-400 mt-1">「{deleteConfirm.name}」将被移除，历史记录保留。</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-mint-200 rounded-xl text-sm text-gray-500">取消</button>
              <button onClick={async () => {
                await supabase.from('students').update({ is_active: false }).eq('id', deleteConfirm.id);
                setDeleteConfirm(null);
                queryClient.invalidateQueries({ queryKey: ['students'] });
              }} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium">删除</button>
            </div>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setEditingStudent(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-2xl w-72 p-5 text-center shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-1">{editingStudent.name}</h3>
            <p className="text-xs text-gray-400 mb-3">修改年级</p>
            <div className="space-y-1.5">
              {['一年级至五年级', '六年级至初二', '初三', '高一至高二', '高三'].map(g => (
                <button key={g} onClick={async () => {
                  await supabase.from('students').update({ grade: g }).eq('id', editingStudent.id);
                  setEditingStudent(null);
                  queryClient.invalidateQueries({ queryKey: ['students'] });
                }} className={`w-full py-2 rounded-lg text-sm font-medium ${editingStudent.grade === g ? 'bg-mint-100 text-mint-700' : 'bg-gray-50 text-gray-600 hover:bg-mint-50'}`}>
                  {g}
                </button>
              ))}
            </div>
            <button onClick={() => setEditingStudent(null)} className="w-full mt-3 py-2 border border-mint-200 rounded-xl text-sm text-gray-500">取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
