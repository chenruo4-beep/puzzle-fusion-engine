'use client';

import { useState, useRef } from 'react';
import { authHeaders, authFetch  } from '@/lib/api';

type SourceType = 'obsidian' | 'notion';
type PageState = 'upload' | 'preview' | 'done' | 'error';

interface FragmentItem {
  source: string;
  fragment_type: string;
  content: string;
  tags: string[];
}

interface PreviewResponse {
  total: number;
  fragments: FragmentItem[];
  skipped: number;
}

export default function ImportPage() {
  const [source, setSource] = useState<SourceType>('obsidian');
  const [pageState, setPageState] = useState<PageState>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ saved: number; skipped: number; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sourceLabel = source === 'obsidian' ? 'Obsidian' : 'Notion';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.name.endsWith('.zip')) {
        setError('请选择 .zip 文件');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (!f.name.endsWith('.zip')) {
        setError('请选择 .zip 文件');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch(`/api/imports/${source}/preview`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '上传失败');
      }

      const data: PreviewResponse = await res.json();
      setPreview(data);
      setPageState('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '解析失败');
      setPageState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || preview.fragments.length === 0) return;
    setLoading(true);

    try {
      const res = await authFetch('/api/imports/confirm', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          source_type: source,
          fragments: preview.fragments.map((f) => ({
            source: f.source,
            fragment_type: f.fragment_type,
            content: f.content,
            tags: f.tags,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '导入失败');
      }

      const data = await res.json();
      setResult(data);
      setPageState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPageState('upload');
    setFile(null);
    setPreview(null);
    setError('');
    setResult(null);
  };

  const typeColors: Record<string, string> = {
    '技能': 'bg-blue-100 text-blue-700',
    '知识': 'bg-green-100 text-green-700',
    '经历': 'bg-purple-100 text-purple-700',
    '性格': 'bg-pink-100 text-pink-700',
    '资源': 'bg-amber-100 text-amber-700',
    '爱好': 'bg-rose-100 text-rose-700',
    '能力': 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">批量导入</h1>
        <p className="text-sm text-warm-dark/50 mt-1">
          从 Obsidian 或 Notion 导出 zip，批量导入为碎片
        </p>
      </div>

      {/* 导入源切换 */}
      {pageState === 'upload' && (
        <div className="flex gap-2">
          {(['obsidian', 'notion'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSource(s); setFile(null); setError(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                source === s
                  ? 'bg-warm-accent text-white shadow-sm'
                  : 'bg-white/60 text-warm-dark/50 hover:text-warm-accent'
              }`}
            >
              {s === 'obsidian' ? 'Obsidian Vault' : 'Notion 导出'}
            </button>
          ))}
        </div>
      )}

      {/* 上传区 */}
      {pageState === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              file
                ? 'border-warm-accent bg-warm-accent/5'
                : 'border-warm-dark/20 hover:border-warm-accent/50 hover:bg-warm-accent/5'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="text-4xl mb-3">{file ? '📦' : '📤'}</div>
            {file ? (
              <div>
                <p className="font-medium text-warm-dark">{file.name}</p>
                <p className="text-xs text-warm-dark/40 mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-warm-dark">
                  点击或拖拽上传 {sourceLabel} 导出 zip
                </p>
                <p className="text-xs text-warm-dark/40 mt-1">
                  Obsidian：导出整个 Vault 为 zip / Notion：导出为 Markdown &amp; CSV
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
          )}

          {file && (
            <button
              onClick={handlePreview}
              disabled={loading}
              className="mt-4 w-full py-3 bg-warm-accent text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading ? '解析中...' : `预览 ${file.name} 的内容`}
            </button>
          )}
        </div>
      )}

      {/* 预览 */}
      {pageState === 'preview' && preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-warm-dark/60">
              共识别 <strong className="text-warm-accent">{preview.total}</strong> 条碎片
              {preview.skipped > 0 && (
                <span className="text-warm-dark/40">（跳过 {preview.skipped} 条空文件）</span>
              )}
            </p>
            <span className="text-xs text-warm-dark/40">仅展示前 {preview.fragments.length} 条</span>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {preview.fragments.map((f, i) => (
              <div key={i} className="bg-white/70 rounded-xl p-3 border border-warm-dark/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-warm-dark/40 font-mono">{f.source}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[f.fragment_type] || 'bg-gray-100 text-gray-600'}`}>
                    {f.fragment_type}
                  </span>
                </div>
                <p className="text-sm text-warm-dark/80 line-clamp-2">{f.content}</p>
                {f.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {f.tags.map((t, j) => (
                      <span key={j} className="text-xs text-warm-dark/30">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-3 bg-warm-accent text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading ? '导入中...' : `确认导入 ${preview.fragments.length} 条`}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white/60 text-warm-dark/50 rounded-xl font-medium hover:text-warm-accent transition-all"
            >
              重选
            </button>
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* 导入完成 */}
      {pageState === 'done' && result && (
        <div className="text-center py-10 space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-warm-dark">导入完成</h2>
          <p className="text-warm-dark/60">
            {result.message}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-warm-accent text-white rounded-xl font-medium hover:opacity-90 transition-all"
            >
              继续导入
            </button>
            <a
              href="/dashboard/fragments"
              className="px-6 py-3 bg-white/60 text-warm-dark/50 rounded-xl font-medium hover:text-warm-accent transition-all inline-block"
            >
              查看碎片
            </a>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      {pageState === 'upload' && (
        <details className="bg-white/40 rounded-xl p-4 border border-warm-dark/5">
          <summary className="text-sm font-medium text-warm-dark/60 cursor-pointer">
            如何导出？
          </summary>
          <div className="mt-3 space-y-3 text-sm text-warm-dark/50">
            <div>
              <p className="font-medium text-warm-dark/70">Obsidian</p>
              <p>设置 → 导出 vault → 选择 .zip 格式。或者直接压缩你的 Obsidian 仓库文件夹。</p>
            </div>
            <div>
              <p className="font-medium text-warm-dark/70">Notion</p>
              <p>页面右上角 ··· → 导出 → 选择「Markdown &amp; CSV」→ 导出为 zip。</p>
            </div>
            <div className="text-xs text-warm-dark/30">
              碎片会根据内容自动分类。支持类型：技能、知识、经历、性格、资源、爱好、能力。
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
