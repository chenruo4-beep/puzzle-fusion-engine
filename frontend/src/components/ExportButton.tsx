"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface ExportButtonProps {
  onExport?: (type: string, format: string) => void;
}

export default function ExportButton({ onExport }: ExportButtonProps) {
  const t = useTranslations("Export");
  const [exportType, setExportType] = useState<"fragments" | "fusions" | "all">("all");
  const [format, setFormat] = useState<"json" | "csv" | "markdown">("json");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/export/${exportType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "导出失败");
      }

      // 获取文件名
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `export_${Date.now()}.${format}`;

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (onExport) {
        onExport(exportType, format);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-button-container">
      <h3 className="text-lg font-semibold mb-4">{t("title")}</h3>
      
      <div className="space-y-4">
        {/* 导出类型选择 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("exportType")}
          </label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as "fragments" | "fusions" | "all")}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="all">{t("allData")}</option>
            <option value="fragments">{t("fragmentsOnly")}</option>
            <option value="fusions">{t("fusionsOnly")}</option>
          </select>
        </div>

        {/* 格式选择 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("format")}
          </label>
          <div className="flex gap-4">
            {["json", "csv", "markdown"].map((f) => (
              <label key={f} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format === f}
                  onChange={(e) => setFormat(e.target.value as "json" | "csv" | "markdown")}
                />
                <span className="uppercase">{f}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {/* 导出按钮 */}
        <button
          onClick={handleExport}
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? t("exporting") : t("exportButton")}
        </button>
      </div>
    </div>
  );
}
