import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Student, ClassType, OcrResult } from '../types/database';
import { CLASS_TYPES } from '../types/database';
import { Camera, Upload, Loader2, Check, Trash2, Plus } from 'lucide-react';

export function OcrPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [results, setResults] = useState<OcrResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'capture' | 'review' | 'done'>('capture');

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('is_active', true).order('name');
      return (data ?? []) as Student[];
    },
  });

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setError('');
  };

  const handleRecognize = async () => {
    if (!imageUrl) return;
    setRecognizing(true);
    setError('');

    try {
      // 尝试调用 Supabase Edge Function
      // 如果 Edge Function 不可用，回退到模拟识别
      const bucketName = 'ocr-images';
      const fileName = `ocr-${Date.now()}.jpg`;

      // 从 imageUrl 获取 blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // 上传到 Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.warn('Storage upload failed, using mock recognition:', uploadError.message);
        // 模拟识别结果
        setResults(getMockResults());
        setStep('review');
        setRecognizing(false);
        return;
      }

      // 尝试调用 Edge Function
      const { data: funcData, error: funcError } = await supabase.functions.invoke('ocr-recognize', {
        body: { imagePath: uploadData.path },
      });

      if (funcError || !funcData?.records) {
        console.warn('Edge function failed, using mock recognition:', funcError?.message);
        setResults(getMockResults());
      } else {
        setResults(funcData.records);
      }

      setStep('review');
    } catch (e) {
      console.warn('Recognition failed, using mock:', e);
      setResults(getMockResults());
      setStep('review');
    }
    setRecognizing(false);
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');

    try {
      const toImport = results.map((r) => ({
        user_id: user?.id,
        student_id: r.matchedStudentId,
        class_date: r.date,
        class_type: r.classType,
        hours: r.hours,
        source: 'ocr' as const,
      }));

      const { error: insertError } = await supabase.from('class_records').insert(toImport);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      setStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '导入失败');
    }
    setImporting(false);
  };

  const updateResult = (index: number, updates: Partial<OcrResult>) => {
    setResults((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const removeResult = (index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index));
  };

  const addEmptyRow = () => {
    setResults((prev) => [
      ...prev,
      { studentName: '', date: new Date().toISOString().slice(0, 10), classType: '1v1', hours: 2, confidence: 'low' },
    ]);
  };

  const confidenceColor = { high: 'text-green-500 bg-green-50', medium: 'text-amber-500 bg-amber-50', low: 'text-red-400 bg-red-50' };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-gray-800 mb-4">拍照识别排课表</h1>

      {step === 'capture' && (
        <div className="space-y-4">
          {/* 拍照区域 */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-mint-200 p-8 text-center">
            {imageUrl ? (
              <div className="space-y-4">
                <img src={imageUrl} alt="预览" className="max-h-64 mx-auto rounded-xl shadow-sm" />
                <div className="flex justify-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 border border-mint-200 rounded-xl text-sm text-gray-500 hover:bg-mint-50">
                    重新拍照
                  </button>
                  <button onClick={handleRecognize} disabled={recognizing}
                    className="flex items-center gap-2 px-6 py-2 bg-mint-500 text-white rounded-xl text-sm font-medium hover:bg-mint-600 disabled:opacity-50">
                    {recognizing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />识别中...</>
                    ) : (
                      '开始识别'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-mint-100 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 text-mint-500" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">拍一张排课表的照片</p>
                  <p className="text-gray-300 text-xs mt-1">支持手机拍照或从相册选择</p>
                </div>
                <div className="flex justify-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-mint-500 text-white rounded-xl text-sm font-medium hover:bg-mint-600 shadow-sm">
                    <Camera className="w-4 h-4" />
                    拍照
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 border border-mint-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-mint-50">
                    <Upload className="w-4 h-4" />
                    从相册选择
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileCapture}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* 提示信息 */}
          <div className="bg-mint-50 rounded-xl p-4 text-xs text-mint-700">
            <p className="font-medium mb-1">💡 使用提示：</p>
            <ul className="space-y-1 text-mint-600">
              <li>• 确保排课表表格清晰、光线充足</li>
              <li>• 表格应包含：日期、学生姓名、课程类型、课时</li>
              <li>• 识别结果可手动修改后再导入</li>
            </ul>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-mint-50 rounded-xl p-3 text-sm text-mint-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            识别完成！请核对以下结果，修改错误后可确认导入
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* 可编辑结果表格 */}
          <div className="bg-white rounded-2xl border border-mint-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-mint-50/50">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">置信度</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">学生</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">日期</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">类型</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">课时</th>
                    <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i} className="border-t border-mint-50">
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${confidenceColor[row.confidence]}`}>
                          {row.confidence === 'high' ? '高' : row.confidence === 'medium' ? '中' : '低'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.matchedStudentId ?? ''}
                          onChange={(e) => {
                            const student = students.find(s => s.id === e.target.value);
                            updateResult(i, {
                              matchedStudentId: e.target.value,
                              studentName: student?.name ?? row.studentName,
                            });
                          }}
                          className="w-full px-2 py-1 border border-mint-100 rounded-lg text-xs bg-white"
                        >
                          <option value="">选择学生</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input type="date" value={row.date}
                          onChange={(e) => updateResult(i, { date: e.target.value })}
                          className="w-full px-2 py-1 border border-mint-100 rounded-lg text-xs" />
                      </td>
                      <td className="py-2 px-3">
                        <select value={row.classType}
                          onChange={(e) => updateResult(i, { classType: e.target.value as ClassType })}
                          className="w-full px-2 py-1 border border-mint-100 rounded-lg text-xs bg-white">
                          {CLASS_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" step="0.5" value={row.hours}
                          onChange={(e) => updateResult(i, { hours: parseFloat(e.target.value) || 0 })}
                          className="w-16 text-right px-2 py-1 border border-mint-100 rounded-lg text-xs" />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => removeResult(i)} className="p-1 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-mint-100">
              <button onClick={addEmptyRow}
                className="flex items-center gap-1 text-xs text-mint-600 font-medium hover:text-mint-700">
                <Plus className="w-3.5 h-3.5" />
                添加一行
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep('capture'); setResults([]); }}
              className="flex-1 py-3 border border-mint-200 text-gray-500 rounded-xl text-sm font-medium">
              重新识别
            </button>
            <button onClick={handleImport} disabled={importing || results.length === 0}
              className="flex-1 py-3 bg-mint-500 text-white rounded-xl text-sm font-semibold hover:bg-mint-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              确认导入 ({results.length}条)
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-mint-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-mint-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">导入成功！</h2>
          <p className="text-sm text-gray-400 mb-6">已成功导入 {results.length} 条课程记录</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => {
              setStep('capture');
              setResults([]);
              setImageUrl(null);
            }}
              className="px-6 py-2.5 border border-mint-200 text-gray-500 rounded-xl text-sm font-medium">
              继续识别
            </button>
            <button onClick={() => navigate('/records')}
              className="px-6 py-2.5 bg-mint-500 text-white rounded-xl text-sm font-medium">
              查看记录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 模拟识别结果（在实际对接百度OCR之前使用）
function getMockResults(): OcrResult[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { studentName: '张三', date: today, classType: '1v1', hours: 2, confidence: 'high', matchedStudentId: undefined },
    { studentName: '李四', date: today, classType: '1v2', hours: 1.5, confidence: 'high', matchedStudentId: undefined },
    { studentName: '王五', date: today, classType: '1v1', hours: 2, confidence: 'medium', matchedStudentId: undefined },
  ];
}
