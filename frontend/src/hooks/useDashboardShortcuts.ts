"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Dashboard 全局快捷键
 * - Ctrl/Cmd + 1: 碎片库
 * - Ctrl/Cmd + 2: 融合
 * - Ctrl/Cmd + 3: 打卡
 * - Ctrl/Cmd + 4: 日记
 * - Ctrl/Cmd + K: 快速搜索（聚焦搜索框）
 * - /: 快速添加碎片
 * - ?: 显示快捷键帮助
 */
export function useDashboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 仅在 dashboard 路径下生效
      if (!pathname.startsWith("/dashboard")) return;

      // 忽略输入框内的快捷键（除了 Escape）
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape: 退出输入框焦点
      if (e.key === "Escape") {
        if (isInput) {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      // 输入框内不触发快捷键
      if (isInput) return;

      const mod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + 数字键: 快速导航
      if (mod && e.key === "1") {
        e.preventDefault();
        router.push("/dashboard/fragments");
        return;
      }
      if (mod && e.key === "2") {
        e.preventDefault();
        router.push("/dashboard/fusion");
        return;
      }
      if (mod && e.key === "3") {
        e.preventDefault();
        router.push("/dashboard/checkin");
        return;
      }
      if (mod && e.key === "4") {
        e.preventDefault();
        router.push("/dashboard/journal");
        return;
      }

      // Ctrl/Cmd + K: 聚焦搜索框（如果有的话）
      if (mod && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[type="search"], input[placeholder*="搜索"], input[placeholder*="找"]'
        ) as HTMLInputElement | null;
        searchInput?.focus();
        return;
      }

      // /: 快速添加碎片
      if (e.key === "/") {
        e.preventDefault();
        router.push("/dashboard/fragments");
        return;
      }

      // ?: 显示快捷键帮助
      if (e.key === "?") {
        e.preventDefault();
        const event = new CustomEvent("show-shortcuts-help");
        window.dispatchEvent(event);
        return;
      }
    },
    [pathname, router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
