'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from "@/i18n/navigation";
import { getToken, parseJWT } from '@/lib/api';

const PUBLIC_PATHS = ['/', '/login', '/register', '/onboarding/welcome', '/onboarding/profession', '/onboarding/setup', '/onboarding/vision', '/onboarding/confirm-fragments', '/miniprogram-landing'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (!token && !isPublic) {
      router.replace('/login');
      return;
    }

    // 有 token 时校验 onboarding 状态
    if (token && !isPublic) {
      const payload = parseJWT(token);
      if (payload && payload.onboarded === false) {
        router.replace('/onboarding/welcome');
        return;
      }
    }

    setChecked(true);
  }, [pathname, router]);

  // 公开页面不拦截
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return <>{children}</>;
  }

  // 还没检查完，显示与 DashboardLayout 结构一致的骨架，防止位移
  if (!checked) {
    return (
      <div className="min-h-screen flex flex-col bg-warm-light">
        <header className="sticky top-0 z-20 bg-warm-light/80 backdrop-blur-md border-b border-warm-dark/10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <span className="font-bold text-lg text-warm-dark">拼拼看Me</span>
          </div>
        </header>
        <div className="flex-1 max-w-4xl mx-auto w-full p-4">
          <div className="animate-pulse space-y-4 pt-4">
            <div className="h-6 bg-warm-dark/10 rounded w-1/3" />
            <div className="h-48 bg-warm-dark/5 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
