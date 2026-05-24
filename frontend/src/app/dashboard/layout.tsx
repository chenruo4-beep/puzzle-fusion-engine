'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ToastProvider } from "@/components/Toast";
import FeedbackButton from "@/components/FeedbackButton";
import UsageBar from "@/components/UsageBar";
import { PuzzleIcon, LightbulbIcon, JournalIcon, CheckIcon, SparkleIcon, CompassIcon, HandshakeIcon, HistoryIcon, FeedbackIcon, ImportIcon } from "@/components/AppIcons";


const navSections = [
  {
    label: '日常',
    items: [
      { href: "/dashboard/journal", label: "日志", icon: <JournalIcon size={20} /> },
      { href: "/dashboard/checkin", label: "打卡", icon: <CheckIcon size={20} /> },
    ],
  },
  {
    label: '发现',
    items: [
      { href: "/dashboard/fragments", label: "碎片", icon: <PuzzleIcon size={20} /> },
      { href: "/dashboard/fusion", label: "融合", icon: <SparkleIcon size={20} /> },
      { href: "/dashboard/inspirations", label: "灵感", icon: <LightbulbIcon size={20} /> },
      { href: "/dashboard/history", label: "历史", icon: <HistoryIcon size={20} /> },
      { href: "/dashboard/feedback", label: "反馈", icon: <FeedbackIcon size={20} /> },
      { href: "/dashboard/import", label: "导入", icon: <ImportIcon size={20} /> },
    ],
  },
  {
    label: '成长',
    items: [
      { href: "/dashboard/journey-map", label: "地图", icon: <CompassIcon size={20} /> },
      { href: "/dashboard/co-creation", label: "合拍", icon: <HandshakeIcon size={20} /> },
    ],
  },
];

const homeItem = { href: "/dashboard", label: "首页", icon: <PuzzleIcon size={20} /> };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [fusionCount, setFusionCount] = useState<number | null>(null);

  // 高亮：首页精确匹配，子页 startsWith（防止首页包含所有子路径）
  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  // 公用 className 生成
  const mobileClass = (href: string) =>
    `flex flex-col items-center gap-0.5 text-xs py-1 transition-colors ${isActive(href) ? 'text-warm-accent font-medium' : 'text-warm-dark/50 hover:text-warm-accent'}`;

  const desktopClass = (href: string) =>
    `w-12 h-12 flex items-center justify-center rounded-xl backdrop-blur-sm border transition-all ${isActive(href) ? 'bg-warm-accent/10 border-warm-accent/30 text-warm-accent shadow-sm' : 'bg-white/60 border-warm-dark/10 text-warm-dark/50 hover:text-warm-accent hover:border-warm-accent/30'}`;

  // 加载融合次数
  useEffect(() => {
    authFetch('/api/fusions/')
      .then(r => r.json())
      .then(data => setFusionCount(data?.data?.pagination?.total ?? null))
      .catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        {/* 顶栏 */}
        <header className="sticky top-0 z-20 bg-warm-light/80 backdrop-blur-md border-b border-warm-dark/10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-warm-dark">
              拼拼看Me
            </Link>
            <button
              onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user_id'); router.push('/login'); }}
              className="text-xs text-warm-dark/40 hover:text-warm-dark/60 transition-colors"
            >
              退出
            </button>
          </div>
        </header>

        {/* 用量提示条 */}
        <div className="max-w-4xl mx-auto w-full px-4 pt-2">
          <UsageBar />
        </div>

        {/* 主内容 */}
        <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:pb-4 pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
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
              {homeItem.icon}
              {homeItem.label}
            </Link>

            {/* 日常区 */}
            {navSections[0].items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={mobileClass(item.href)}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

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

            {/* 成长区 */}
            {navSections[2].items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={mobileClass(item.href)}
              >
                {item.icon}
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

        {/* 反馈按钮 */}
        <FeedbackButton />
      </div>
    </ToastProvider>
  );
}
import { authFetch  } from '@/lib/api';