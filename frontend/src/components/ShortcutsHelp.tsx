"use client";

import { useState, useEffect } from "react";

const SHORTCUTS = [
  { keys: "Ctrl + 1", desc: "碎片库" },
  { keys: "Ctrl + 2", desc: "融合" },
  { keys: "Ctrl + 3", desc: "打卡" },
  { keys: "Ctrl + 4", desc: "日记" },
  { keys: "Ctrl + K", desc: "搜索" },
  { keys: "/", desc: "快速添加碎片" },
  { keys: "Esc", desc: "退出输入框" },
  { keys: "?", desc: "显示快捷键" },
];

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener("show-shortcuts-help", handler);
    return () => window.removeEventListener("show-shortcuts-help", handler);
  }, []);

  // 按 Esc 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-warm-dark/10 dark:border-dark-border p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-warm-dark dark:text-dark-text mb-4">
          ⌨️ 键盘快捷键
        </h3>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-warm-dark/70 dark:text-dark-text/70">
                {s.desc}
              </span>
              <kbd className="px-2 py-0.5 rounded bg-warm-bg dark:bg-dark-bg text-warm-dark/60 dark:text-dark-text/60 text-xs font-mono border border-warm-dark/10 dark:border-dark-border">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-warm-dark/30 dark:text-dark-text/30 mt-4 text-center">
          按 Esc 或点击空白处关闭
        </p>
      </div>
    </div>
  );
}
