'use client';

import { useState, useCallback } from 'react';
import {
  ExportPayload,
  downloadMarkdown,
  downloadJSON,
  downloadPDF,
} from '@/lib/export';

interface DataExportProps {
  /** 已加载的数据 */
  fragments: ExportPayload['fragments'];
  fusions: ExportPayload['fusions'];
  journals?: ExportPayload['journals'];
}

export default function DataExport({ fragments, fusions, journals = [] }: DataExportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'md' | 'json' | 'pdf'>('md');

  const payload: ExportPayload = {
    fragments,
    fusions,
    journals,
    exportedAt: new Date().toISOString(),
  };

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      switch (format) {
        case 'md':
          downloadMarkdown(payload);
          break;
        case 'json':
          downloadJSON(payload);
          break;
        case 'pdf':
          await downloadPDF(payload);
          break;
      }
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [format, fragments, fusions, journals]);

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm
                   hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        title="导出数据"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        导出
      </button>

      {/* 弹窗 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              导出数据
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              将导出 {fragments.length} 个碎片、{fusions.length} 个融合结果{journals.length ? `、${journals.length} 条日记` : ''}
            </p>

            {/* 格式选择 */}
            <div className="flex gap-2 mb-5">
              {(['md', 'json', 'pdf'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border
                    ${format === f
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
                    }`}
                >
                  {f === 'md' ? 'Markdown' : f === 'json' ? 'JSON' : 'PDF'}
                </button>
              ))}
            </div>

            {/* 格式说明 */}
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
              {format === 'md' && 'Markdown 格式，适合笔记软件（Obsidian / Notion）导入'}
              {format === 'json' && 'JSON 格式，适合程序处理或数据备份'}
              {format === 'pdf' && 'PDF 格式，适合打印或分享（需 html2canvas）'}
            </p>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700
                         text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex-1 py-2 rounded-lg text-sm bg-indigo-600 text-white font-medium
                         hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '导出中...' : '导出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
