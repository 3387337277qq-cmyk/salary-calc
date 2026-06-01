import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Student, StudentInput } from '../types/database';
import { Plus, Pencil, Trash2, Search, X, User } from 'lucide-react';

export function StudentManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Student[];
    },
  });

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.grade.includes(search)
  );

  return (
    <div className="animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">学生管理</h1>
        <button
          onClick={() => { setEditingStudent(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-mint-500 text-white rounded-xl text-sm font-medium hover:bg-mint-600 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          添加学生
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索学生姓名或年级..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-mint-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-200"
        />
      </div>

      {/* 学生列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-mint-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {search ? '没有找到匹配的学生' : '还没有添加学生'}
          </p>
          {!search && (
            <button
              onClick={() => { setEditingStudent(null); setShowModal(true); }}
              className="mt-3 text-mint-600 text-sm font-medium hover:underline"
            >
              添加第一个学生
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-xl border border-mint-100 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-mint-100 flex items-center justify-center text-mint-600 font-bold text-sm shrink-0">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800 text-sm">{student.name}</h3>
                <p className="text-xs text-gray-400">
                  {student.grade}
                  {student.subject ? ` · ${student.subject}` : ''}
                  {student.notes ? ` · ${student.notes}` : ''}
                </p>
              </div>
              <button
                onClick={() => { setEditingStudent(student); setShowModal(true); }}
                className="p-2 text-gray-400 hover:text-mint-600 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteConfirm(student)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <StudentModal
          student={editingStudent}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['students'] });
          }}
        />
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <DeleteConfirmModal
          student={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onDeleted={() => {
            setDeleteConfirm(null);
            queryClient.invalidateQueries({ queryKey: ['students'] });
          }}
        />
      )}
    </div>
  );
}

function StudentModal({ student, onClose, onSaved }: { student: Student | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<StudentInput>({
    name: student?.name ?? '',
    grade: student?.grade ?? '',
    subject: student?.subject ?? '',
    notes: student?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.name.trim()) { setError('请输入学生姓名'); return; }
    if (!form.grade.trim()) { setError('请输入年级'); return; }

    setSaving(true);
    setError('');

    if (student) {
      const { error: e } = await supabase
        .from('students')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', student.id);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase
        .from('students')
        .insert({ ...form, subject: form.subject || null, notes: form.notes || null, user_id: user?.id });
      if (e) { setError(e.message); setSaving(false); return; }
    }
    onSaved();
  };

  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'];

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-lg p-6 animate-slide-up safe-area-bottom shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">
            {student ? '编辑学生' : '添加学生'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">姓名 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="学生姓名"
              className="w-full px-3 py-2.5 border border-mint-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">年级 *</label>
            <div className="flex flex-wrap gap-2">
              {grades.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, grade: g })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.grade === g
                      ? 'bg-mint-500 text-white'
                      : 'bg-mint-50 text-gray-500 hover:bg-mint-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">科目</label>
            <input
              type="text"
              value={form.subject ?? ''}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="如：数学、英语（可留空）"
              className="w-full px-3 py-2.5 border border-mint-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">备注</label>
            <input
              type="text"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="其他信息（可留空）"
              className="w-full px-3 py-2.5 border border-mint-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-300"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-mint-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-mint-500 text-white rounded-xl text-sm font-medium hover:bg-mint-600 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ student, onClose, onDeleted }: { student: Student; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('students').update({ is_active: false }).eq('id', student.id);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-2xl w-72 p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="font-semibold text-gray-800">确认删除？</h3>
        <p className="text-sm text-gray-400 mt-1">
          学生「{student.name}」将被移除，但历史课程记录会保留。
        </p>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-mint-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
            取消
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50">
            {deleting ? '删除中...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
}
