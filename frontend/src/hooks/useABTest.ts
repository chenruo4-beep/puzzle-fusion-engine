"use client";

import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────

interface ABVersionContent {
  title: string;
  subtitle: string;
  cta: string;
}

interface ABTestSection {
  enabled: boolean;
  versions: Record<string, ABVersionContent>;
  bucketing: {
    algorithm: string;
    split: number[];
  };
  tracking: {
    events: string[];
  };
}

interface ABConfig {
  abTest: ABTestSection;
  painSection?: ABTestSection;
  socialProof?: ABTestSection;
  pricing?: ABTestSection;
}

interface UseABTestReturn {
  version: string;
  content: ABVersionContent;
  track: (event: string) => void;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useABTest(section: 'hero' | 'pain' | 'social' | 'pricing' = 'hero'): UseABTestReturn {
  const [config, setConfig] = useState<ABConfig | null>(null);
  const [version, setVersion] = useState<string>('A');

  // 2. Assign version (per-section sessionStorage key)
  const assignVersion = useCallback((cfg: ABConfig, sec: string) => {
    const sectionConfig = getSectionConfig(cfg, sec);
    if (!sectionConfig?.enabled) {
      setVersion('A');
      return;
    }

    const storageKey = `ab-version-${sec}`;
    const savedVersion = sessionStorage.getItem(storageKey);
    if (savedVersion && sectionConfig.versions[savedVersion]) {
      setVersion(savedVersion);
      return;
    }

    const random = Math.random() * 100;
    const split = sectionConfig.bucketing.split;
    let cumulative = 0;
    let assigned = 'A';
    const versions = Object.keys(sectionConfig.versions);

    for (let i = 0; i < split.length; i++) {
      cumulative += split[i];
      if (random < cumulative) {
        assigned = versions[i] || 'A';
        break;
      }
    }

    sessionStorage.setItem(storageKey, assigned);
    setVersion(assigned);
    trackEvent('page_view', { section: sec, version: assigned });
  }, []);

  // 1. Load config
  useEffect(() => {
    fetch('/ab-config.json')
      .then(res => res.json())
      .then((data: ABConfig) => {
        setConfig(data);
        assignVersion(data, section);
      })
      .catch(err => console.error('Failed to load AB config:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // 3. Get section config
  const getSectionConfig = (cfg: ABConfig | null, sec: string): ABTestSection | undefined => {
    if (!cfg) return undefined;
    switch (sec) {
      case 'hero': return cfg.abTest;
      case 'pain': return cfg.painSection;
      case 'social': return cfg.socialProof;
      case 'pricing': return cfg.pricing;
      default: return cfg.abTest;
    }
  };

  // 4. Get current content
  const sectionConfig = getSectionConfig(config, section);
  const content = sectionConfig?.versions[version] || getDefaultContent(section);

  // 5. Track event
  const track = useCallback((event: string) => {
    if (!sectionConfig?.tracking.events.includes(event)) return;
    console.log(`[AB Test] Event: ${event}, Section: ${section}, Version: ${version}`);
    // Send to analytics
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: event,
        version,
        section,
        user_id: localStorage.getItem('user_id') || 'anonymous',
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});
  }, [sectionConfig, version, section]);

  return { version, content, track };
}

// ─── Helpers ────────────────────────────────────────────────────

function getDefaultContent(section: string): ABVersionContent {
  switch (section) {
    case 'pain':
      return {
        title: "你是不是也有这种感觉？",
        subtitle: "学了一堆东西、存了很多笔记、想做副业...但不知道怎么开始",
        cta: "看看我能拼出什么 →"
      };
    case 'social':
      return {
        title: "他们已经开始拼了",
        subtitle: "已有 1,200+ 用户发现自己的隐藏能力组合",
        cta: "加入他们 →"
      };
    case 'pricing':
      return {
        title: "开始融合",
        subtitle: "选择你的职业，2分钟完成入门",
        cta: "免费试用 →"
      };
    default:
      return {
        title: "你散落的能力碎片，可能早就够开一门课了",
        subtitle: "12年讲台 + 日更3年 + 提分15分 = 作文训练营创始人？AI帮你发现你没看见的自己",
        cta: "免费试用 →"
      };
  }
}

function trackEvent(event: string, data: Record<string, unknown>) {
  console.log(`[AB Test] Event: ${event}`, data);
}
