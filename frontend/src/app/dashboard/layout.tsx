'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const navSections = [
  {
    label: '日常',
    items: [
      { href: "/dashboard/journal", label: "日志", icon: "📔" },
      { href: "/dashboard/checkin", label: "打卡", icon: "✅" },
    ],
  },
  {
    label: '发现',
    items: [
      { href: "/dashboard/fragments", label: "碎片", icon: "🧩" },
      { href: "/dashboard/fusion", label: "融合", icon: "✨" },
      { href: "/dashboard/inspirations", label: "灵感", icon: "💡" },
      { href: "/dashboard/history", label: "历史", icon: "📋" },
    ],
  },
];

const homeItem = { href: "/dashboard", label: "首页", icon: "🏠" };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [fusionCount, setFusionCount] = useState<number | null>(null);

  // 高亮：首页精确匹配，子页 startsWith（防止首页包含所有子路径）
  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  // 公用 className 生成
  const mobileClass = (href: string) =>
    `flex flex-col items-center gap-0.5 text-xs py-1 transition-colors ${isActive(href) ? 'text-warm-accent font-medium' : 'text-warm-dark/60 hover:text-warm-accent'}`;

  const desktopClass = (href: string) =>
    `w-12 h-12 flex items-center justify-center rounded-xl backdrop-blur-sm border transition-all text-lg ${isActive(href) ? 'bg-warm-accent/10 border-warm-accent/30 text-warm-accent shadow-sm' : 'bg-white/60 border-warm-dark/10 text-warm-dark/60 hover:text-warm-accent hover:border-warm-accent/30'}`;

  // 加载融合次数
  useEffect(() => {
    fetch(`${API_BASE}/api/fusions/`)
      .then(r => r.json())
      .then(data => setFusionCount(Array.isArray(data) ? data.length : (data?.length ?? null)))
      .catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        {/* 顶栏 */}
        <header className="sticky top-0 z-20 bg-warm-light/80 backdrop-blur-md border-b border-warm-dark/10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-warm-dark">
              拼图融合引擎
            </Link>
          </div>
        </header>

        {/* 主内容 */}
        <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:pb-4 pb-16">
          {children}
        </div>

        {/* 底部导航栏（移动端） */}
        <nav className="sticky bottom-0 z-20 bg-warm-light/90 backdrop-blur-md border-t border-warm-dark/10 md:hidden">
          <div className="flex justify-around py-2">
            {/* 首页 */}
            <Link
              key={homeItem.href}
              href={homeItem.href}
              className={mobileClass(homeItem.href)}
            >
              <span className="text-lg">{homeItem.icon}</span>
              {homeItem.label}
            </Link>

            {/* 日常区 */}
            {navSections[0].items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={mobileClass(item.href)}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            {/* 分隔线 */}
            <div className="self-stretch w-px bg-warm-dark/10 mx-1" />

            {/* 发现区 */}
            {navSections[1].items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={mobileClass(item.href)}
              >
                <span className="relative text-lg">
                  {item.icon}
                  {item.href === '/dashboard/fusion' && fusionCount !== null && (
                    <span className="absolute -top-1 -right-2 text-[10px] leading-none bg-warm-accent text-white rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 font-bold shadow-sm">
                      {fusionCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* 侧边导航栏（桌面端） */}
        <aside className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-10 flex-col gap-1">
          {/* 首页 */}
          <Link
            href={homeItem.href}
            className={desktopClass(homeItem.href)}
            title={homeItem.label}
          >
            {homeItem.icon}
          </Link>

          {/* 分隔 */}
          <div className="w-8 h-px bg-warm-dark/10 mx-auto my-1" />

          {/* 日常区 */}
          {navSections.map((section) => (
            <div key={section.label}>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative ${desktopClass(item.href)}`}
                  title={item.label}
                >
                  {item.icon}
                  {item.href === '/dashboard/fusion' && fusionCount !== null && (
                    <span className="absolute -top-0.5 -right-0.5 text-[10px] leading-none bg-warm-accent text-white rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 font-bold shadow-sm">
                      {fusionCount}
                    </span>
                  )}
                </Link>
              ))}
              {/* 区之间分隔 */}
              {section.label !== '发现' && (
                <div className="w-8 h-px bg-warm-dark/10 mx-auto my-1" />
              )}
            </div>
          ))}
        </aside>
      </div>
    </ToastProvider>
  );
}