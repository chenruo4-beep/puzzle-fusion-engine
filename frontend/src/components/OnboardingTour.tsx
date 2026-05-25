"use client";

import { useState, useEffect } from "react";

interface Step {
  target: string; // CSS selector
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const ONBOARDING_STEPS: Step[] = [
  {
    target: "[data-tour='nav-fragments']",
    title: "🧩 碎片库",
    description: "随手记录想法、灵感、金句。每个碎片都是你知识拼图的一块。",
    position: "right",
  },
  {
    target: "[data-tour='nav-fusion']",
    title: "⚡ 融合",
    description: "把碎片拼在一起，发现它们之间的联系。这就是洞见诞生的地方。",
    position: "right",
  },
  {
    target: "[data-tour='nav-journal']",
    title: "📖 日记",
    description: "每天的思考留痕。回头翻翻，你会惊讶自己进步了多少。",
    position: "right",
  },
  {
    target: "[data-tour='nav-checkin']",
    title: "✅ 打卡",
    description: "每天进步一点点。连续打卡，让知识周转不停。",
    position: "right",
  },
  {
    target: "[data-tour='usage-bar']",
    title: "📊 用量",
    description: "免费用户每天3次融合。邀请好友可以赚更多！",
    position: "bottom",
  },
];

export default function OnboardingTour() {
  const [step, setStep] = useState(-1); // -1 = not started
  const [visible, setVisible] = useState(false);

  // 检查是否需要显示引导
  useEffect(() => {
    const done = localStorage.getItem("onboarding_done");
    if (!done) {
      // 延迟1秒等页面渲染
      const timer = setTimeout(() => {
        setStep(0);
        setVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleNext() {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDone();
    }
  }

  function handleSkip() {
    handleDone();
  }

  function handleDone() {
    localStorage.setItem("onboarding_done", "1");
    setVisible(false);
    setStep(-1);
  }

  if (!visible || step < 0 || step >= ONBOARDING_STEPS.length) return null;

  const current = ONBOARDING_STEPS[step];
  const targetEl = document.querySelector(current.target);
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();

  // tooltip 位置计算
  const offsetX = 16;
  let tooltipStyle: React.CSSProperties = {};
  switch (current.position) {
    case "right":
      tooltipStyle = {
        left: rect.right + offsetX,
        top: rect.top + rect.height / 2 - 60,
      };
      break;
    case "left":
      tooltipStyle = {
        right: window.innerWidth - rect.left + offsetX,
        top: rect.top + rect.height / 2 - 60,
      };
      break;
    case "bottom":
      tooltipStyle = {
        left: rect.left + rect.width / 2 - 150,
        top: rect.bottom + offsetX,
      };
      break;
    case "top":
      tooltipStyle = {
        left: rect.left + rect.width / 2 - 150,
        bottom: window.innerHeight - rect.top + offsetX,
      };
      break;
  }

  return (
    <>
      {/* 半透明遮罩 + 高亮目标 */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={handleSkip}
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) 100%)",
        }}
      />
      {/* 高亮框 */}
      <div
        className="fixed z-[9999] rounded-xl border-2 border-warm-accent dark:border-dark-accent shadow-lg pointer-events-none"
        style={{
          left: rect.left - 4,
          top: rect.top - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          background: "transparent",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
        }}
      />
      {/* 提示气泡 */}
      <div
        className="fixed z-[10000] w-[300px] bg-white dark:bg-dark-surface rounded-2xl p-5 shadow-xl border border-warm-dark/10 dark:border-dark-border"
        style={tooltipStyle}
      >
        <h3 className="font-bold text-warm-dark dark:text-dark-text text-base mb-2">
          {current.title}
        </h3>
        <p className="text-sm text-warm-dark/60 dark:text-dark-text/60 leading-relaxed mb-4">
          {current.description}
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-warm-dark/40 dark:text-dark-text/40 hover:text-warm-dark/60 dark:hover:text-dark-text/60 transition-colors"
          >
            跳过引导
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-1.5 bg-warm-accent dark:bg-dark-accent text-white rounded-lg text-sm font-medium hover:bg-warm-accent/90 dark:hover:bg-dark-accent/80 transition-colors"
          >
            {step < ONBOARDING_STEPS.length - 1 ? "下一步" : "开始使用！"}
          </button>
        </div>
        {/* 步骤指示器 */}
        <div className="flex gap-1.5 mt-3 justify-center">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === step
                  ? "bg-warm-accent dark:bg-dark-accent"
                  : i < step
                  ? "bg-warm-accent/40 dark:bg-dark-accent/40"
                  : "bg-warm-dark/20 dark:bg-dark-border"
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
