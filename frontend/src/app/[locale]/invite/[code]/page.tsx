"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiUrl } from "@/lib/api";

/**
 * /invite/[code] 页面
 * 验证邀请码 → 跳转注册页（带邀请码参数）
 */
export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired">("loading");

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(apiUrl(`/api/invites/${code}`));
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            setStatus("valid");
            // 验证通过，1.5秒后跳转注册页
            setTimeout(() => {
              router.replace(`/register?invite=${code}`);
            }, 1500);
          } else {
            setStatus("invalid");
          }
        } else {
          const data = await res.json();
          setStatus(data.detail?.includes("过期") ? "expired" : "invalid");
        }
      } catch {
        setStatus("invalid");
      }
    }
    validate();
  }, [code, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-warm-light to-warm-bg dark:from-dark-bg dark:to-dark-surface">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-pulse">🧩</div>
          <p className="text-warm-dark/60 dark:text-dark-text/60 text-sm">验证邀请码中...</p>
        </div>
      </div>
    );
  }

  if (status === "valid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-warm-light to-warm-bg dark:from-dark-bg dark:to-dark-surface">
        <div className="max-w-sm w-full bg-white/80 dark:bg-dark-surface rounded-2xl p-8 text-center shadow-sm border border-warm-dark/10 dark:border-dark-border">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-warm-dark dark:text-dark-text mb-3">
            邀请码有效！
          </h1>
          <p className="text-sm text-warm-dark/60 dark:text-dark-text/60 mb-4">
            正在跳转到注册页面...
          </p>
          <p className="text-xs text-warm-accent dark:text-dark-accent">
            注册后你和邀请人各得5次免费融合
          </p>
        </div>
      </div>
    );
  }

  // invalid / expired
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-warm-light to-warm-bg dark:from-dark-bg dark:to-dark-surface">
      <div className="max-w-sm w-full bg-white/80 dark:bg-dark-surface rounded-2xl p-8 text-center shadow-sm border border-warm-dark/10 dark:border-dark-border">
        <div className="text-5xl mb-4">{status === "expired" ? "⏰" : "❌"}</div>
        <h1 className="text-xl font-bold text-warm-dark dark:text-dark-text mb-3">
          {status === "expired" ? "邀请码已过期" : "邀请码无效"}
        </h1>
        <p className="text-sm text-warm-dark/60 dark:text-dark-text/60 mb-6">
          {status === "expired"
            ? "邀请码7天有效，请联系邀请人重新获取"
            : "这个邀请码不存在，请检查链接是否完整"}
        </p>
        <button
          onClick={() => router.replace("/register")}
          className="px-6 py-2.5 bg-warm-accent dark:bg-dark-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 dark:hover:bg-dark-accent/80 transition-colors"
        >
          直接注册
        </button>
      </div>
    </div>
  );
}
