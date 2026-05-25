/**
 * 数据导出工具 — 支持 Markdown / JSON / PDF
 */

/* ---------- 类型 ---------- */
export interface ExportFragment {
  id: string;
  fragment_type: string;
  content: string;
  created_at: string;
}

export interface ExportFusion {
  id: string;
  profession: string;
  title: string;
  result: string;
  created_at: string;
}

export interface ExportJournal {
  id: number;
  content: string;
  tags: string[];
  created_at: string;
}

export interface ExportPayload {
  fragments: ExportFragment[];
  fusions: ExportFusion[];
  journals: ExportJournal[];
  exportedAt: string;
}

/* ---------- Markdown ---------- */
export function toMarkdown(data: ExportPayload): string {
  const lines: string[] = [
    '# 拼拼看Me — 数据导出',
    `_导出时间：${new Date(data.exportedAt).toLocaleString('zh-CN')}_`,
    '',
  ];

  if (data.fragments.length) {
    lines.push('## 能力碎片', '');
    data.fragments.forEach((f) => {
      lines.push(`### ${f.fragment_type || '碎片'}`);
      lines.push(f.content);
      lines.push(`_创建于 ${new Date(f.created_at).toLocaleDateString('zh-CN')}_`, '');
    });
  }

  if (data.fusions.length) {
    lines.push('## 融合结果', '');
    data.fusions.forEach((f) => {
      lines.push(`### ${f.title}（${f.profession}）`);
      lines.push(f.result);
      lines.push(`_创建于 ${new Date(f.created_at).toLocaleDateString('zh-CN')}_`, '');
    });
  }

  if (data.journals.length) {
    lines.push('## 日记', '');
    data.journals.forEach((j) => {
      const tags = j.tags?.length ? ` [${j.tags.join(', ')}]` : '';
      lines.push(`### 日记 #${j.id}${tags}`);
      lines.push(j.content);
      lines.push(`_创建于 ${new Date(j.created_at).toLocaleDateString('zh-CN')}_`, '');
    });
  }

  return lines.join('\n');
}

/* ---------- JSON ---------- */
export function toJSON(data: ExportPayload): string {
  return JSON.stringify(data, null, 2);
}

/* ---------- 文件下载辅助 ---------- */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(data: ExportPayload) {
  const md = toMarkdown(data);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `puzzle-me-export-${Date.now()}.md`);
}

export function downloadJSON(data: ExportPayload) {
  const json = toJSON(data);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `puzzle-me-export-${Date.now()}.json`);
}

/**
 * PDF 导出 — 用 html2canvas 截图后合成 PDF
 * 依赖 html2canvas（已在 package.json 中）
 */
export async function downloadPDF(data: ExportPayload): Promise<void> {
  // 动态 import 减小首屏
  const html2canvas = (await import('html2canvas')).default;

  // 构造一个隐藏的渲染容器
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:800px;padding:40px;background:#fff;font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.7;';

  container.innerHTML = `
    <h1 style="font-size:24px;margin-bottom:4px;">拼拼看Me — 数据导出</h1>
    <p style="color:#666;font-size:13px;margin-bottom:24px;">导出时间：${new Date(data.exportedAt).toLocaleString('zh-CN')}</p>
    ${buildFragmentsHTML(data.fragments)}
    ${buildFusionsHTML(data.fusions)}
    ${buildJournalsHTML(data.journals)}
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 mm
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`puzzle-me-export-${Date.now()}.pdf`);
    } catch {
      // jspdf 不可用，退回下载 PNG
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `puzzle-me-export-${Date.now()}.png`;
      a.click();
    }
  } finally {
    document.body.removeChild(container);
  }
}

/* ---------- HTML 构建辅助 ---------- */
function buildFragmentsHTML(fragments: ExportFragment[]): string {
  if (!fragments.length) return '';
  return `<h2 style="font-size:18px;margin-top:24px;border-bottom:1px solid #eee;padding-bottom:6px;">能力碎片</h2>` +
    fragments.map(f => `
      <div style="margin:12px 0;padding:12px;background:#f9fafb;border-radius:8px;">
        <h3 style="font-size:15px;margin:0 0 6px;">${f.fragment_type || '碎片'}</h3>
        <p style="margin:0;font-size:14px;white-space:pre-wrap;">${escHtml(f.content)}</p>
        <p style="margin:6px 0 0;color:#999;font-size:12px;">创建于 ${new Date(f.created_at).toLocaleDateString('zh-CN')}</p>
      </div>
    `).join('');
}

function buildFusionsHTML(fusions: ExportFusion[]): string {
  if (!fusions.length) return '';
  return `<h2 style="font-size:18px;margin-top:24px;border-bottom:1px solid #eee;padding-bottom:6px;">融合结果</h2>` +
    fusions.map(f => `
      <div style="margin:12px 0;padding:12px;background:#f0f9ff;border-radius:8px;">
        <h3 style="font-size:15px;margin:0 0 6px;">${escHtml(f.title)}（${escHtml(f.profession)}）</h3>
        <p style="margin:0;font-size:14px;white-space:pre-wrap;">${escHtml(f.result)}</p>
        <p style="margin:6px 0 0;color:#999;font-size:12px;">创建于 ${new Date(f.created_at).toLocaleDateString('zh-CN')}</p>
      </div>
    `).join('');
}

function buildJournalsHTML(journals: ExportJournal[]): string {
  if (!journals.length) return '';
  return `<h2 style="font-size:18px;margin-top:24px;border-bottom:1px solid #eee;padding-bottom:6px;">日记</h2>` +
    journals.map(j => `
      <div style="margin:12px 0;padding:12px;background:#fefce8;border-radius:8px;">
        <h3 style="font-size:15px;margin:0 0 6px;">日记 #${j.id}${j.tags?.length ? ' [' + j.tags.map(t => escHtml(t)).join(', ') + ']' : ''}</h3>
        <p style="margin:0;font-size:14px;white-space:pre-wrap;">${escHtml(j.content)}</p>
        <p style="margin:6px 0 0;color:#999;font-size:12px;">创建于 ${new Date(j.created_at).toLocaleDateString('zh-CN')}</p>
      </div>
    `).join('');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
