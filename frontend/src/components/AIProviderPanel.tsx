"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/api";

interface Provider {
  id: string;
  name: string;
  model: string;
  max_tokens: number;
  builtin: boolean;
}

interface CurrentProvider {
  provider_id: string;
  name: string;
  model: string;
}

/**
 * AI Provider 设置面板
 * 用户可切换 DeepSeek / 通义千问 / 智谱 / OpenAI 等模型
 */
export default function AIProviderPanel() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [current, setCurrent] = useState<CurrentProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [providersRes, currentRes] = await Promise.all([
        authFetch("/api/ai/providers"),
        authFetch("/api/ai/provider/current"),
      ]);
      if (providersRes.ok) setProviders(await providersRes.json());
      if (currentRes.ok) setCurrent(await currentRes.json());
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitch(providerId: string) {
    setSwitching(providerId);
    try {
      const res = await authFetch("/api/ai/provider/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_id: providerId }),
      });
      if (res.ok) {
        const target = providers.find((p) => p.id === providerId);
        setCurrent({
          provider_id: providerId,
          name: target?.name || providerId,
          model: target?.model || "",
        });
      }
    } catch {
      // 静默
    } finally {
      setSwitching(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5">
        <p className="text-sm text-warm-dark/40 dark:text-dark-text/40">加载中...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-warm-dark dark:text-dark-text">
          🤖 AI 模型
        </h3>
        {current && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-warm-accent/10 dark:bg-dark-accent/10 text-warm-accent dark:text-dark-accent font-medium">
            {current.name}
          </span>
        )}
      </div>

      <p className="text-sm text-warm-dark/60 dark:text-dark-text/60">
        选择用于融合和智能推荐的 AI 模型
      </p>

      <div className="space-y-2">
        {providers.map((p) => {
          const isActive = current?.provider_id === p.id;
          const isSwitching = switching === p.id;

          return (
            <button
              key={p.id}
              onClick={() => !isActive && handleSwitch(p.id)}
              disabled={isSwitching}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                isActive
                  ? "border-warm-accent/30 dark:border-dark-accent/30 bg-warm-accent/5 dark:bg-dark-accent/5"
                  : "border-warm-dark/10 dark:border-dark-border hover:border-warm-accent/20 dark:hover:border-dark-accent/20 hover:bg-warm-dark/5 dark:hover:bg-dark-text/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-warm-dark dark:text-dark-text">
                    {p.name}
                  </span>
                  <span className="text-xs text-warm-dark/40 dark:text-dark-text/40 ml-2">
                    {p.model}
                  </span>
                </div>
                <div>
                  {isSwitching ? (
                    <span className="text-xs text-warm-accent dark:text-dark-accent">切换中...</span>
                  ) : isActive ? (
                    <span className="text-xs text-warm-accent dark:text-dark-accent font-medium">✓ 使用中</span>
                  ) : null}
                </div>
              </div>
              <div className="text-xs text-warm-dark/30 dark:text-dark-text/30 mt-1">
                最大 {p.max_tokens} tokens
                {!p.builtin && " · 自定义"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
