"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";

interface ShareInviteProps {
  /** 当前融合的标题，用于生成分享文案 */
  fusionTitle?: string;
}

/**
 * 分享裂变组件
 * - 生成唯一邀请链接
 * - 微信分享（小程序码/链接）
 * - 复制邀请文案
 */
export default function ShareInvite({ fusionTitle }: ShareInviteProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateInvite() {
    setLoading(true);
    try {
      const res = await authFetch("/api/invites/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: fusionTitle ? "fusion" : "dashboard" }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.code);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }

  function getShareText() {
    const base = fusionTitle
      ? `🧩 我刚在「拼拼看Me」完成了一次知识融合：${fusionTitle}\n\n你也来试试，把碎片拼成洞见！`
      : `🧩 我在用「拼拼看Me」拼凑我的知识拼图\n\n把碎片拼成洞见，每天进步一点点！`;

    const link = inviteCode
      ? `邀请链接：${window.location.origin}/invite/${inviteCode}`
      : `试试看：${window.location.origin}`;

    return `${base}\n\n${link}`;
  }

  async function handleCopy() {
    const text = getShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // 微信小程序分享
  function handleWechatShare() {
    // 在微信内用 wx.updateAppMessageShareData
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).wx) {
      const wx = (window as unknown as Record<string, Record<string, (args: Record<string, unknown>) => void>>).wx;
      if (wx.updateAppMessageShareData) {
        wx.updateAppMessageShareData({
          title: fusionTitle || "拼拼看Me — 把碎片拼成洞见",
          desc: "每天进步一点点",
          link: inviteCode
            ? `${window.location.origin}/invite/${inviteCode}`
            : window.location.origin,
          imgUrl: `${window.location.origin}/icon-512.png`,
        });
      }
    }
    // 非微信环境：复制文案提示
    handleCopy();
  }

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5 space-y-4">
      <h3 className="font-semibold text-warm-dark dark:text-dark-text">
        🎁 邀请好友一起拼
      </h3>
      <p className="text-sm text-warm-dark/60 dark:text-dark-text/60">
        每邀请一位好友，双方各得5次免费融合
      </p>

      {!inviteCode ? (
        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full py-2.5 bg-warm-accent dark:bg-dark-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 dark:hover:bg-dark-accent/80 disabled:opacity-50 transition-colors"
        >
          {loading ? "生成中..." : "生成邀请链接"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-warm-bg dark:bg-dark-bg rounded-lg">
            <code className="text-xs text-warm-dark/70 dark:text-dark-text/70 flex-1 truncate">
              {window.location.origin}/invite/{inviteCode}
            </code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 bg-warm-accent/10 dark:bg-dark-accent/10 text-warm-accent dark:text-dark-accent rounded-lg text-sm font-medium hover:bg-warm-accent/20 dark:hover:bg-dark-accent/20 transition-colors"
            >
              {copied ? "✅ 已复制" : "📋 复制文案"}
            </button>
            <button
              onClick={handleWechatShare}
              className="flex-1 py-2 bg-[#07C160]/10 text-[#07C160] rounded-lg text-sm font-medium hover:bg-[#07C160]/20 transition-colors"
            >
              💚 微信分享
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
