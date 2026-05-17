"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface DemoPiece {
  id: string;
  emoji: string;
  text: string;
  type: string;
}

const PRESET_PIECES: DemoPiece[] = [
  { id: "p1", emoji: "📚", text: "12年教学经验", type: "技能" },
  { id: "p2", emoji: "🎤", text: "公开演讲不怯场", type: "能力" },
  { id: "p3", emoji: "📝", text: "朋友圈读书笔记", type: "习惯" },
  { id: "p4", emoji: "💬", text: "家长爱找你聊天", type: "性格" },
  { id: "p5", emoji: "🎨", text: "PPT模板同事抢着借", type: "技能" },
  { id: "p6", emoji: "👨‍👩‍👧", text: "辅导邻居孩子提分", type: "经历" },
];

export default function FusionDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const [fusing, setFusing] = useState(false);
  const [result, setResult] = useState<{
    golden: string;
    direction: string;
    action: string;
  } | null>(null);
  const [shakePiece, setShakePiece] = useState<string | null>(null);

  const togglePiece = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= 4) {
        // 超过4个，抖动提示
        setShakePiece(id);
        setTimeout(() => setShakePiece(null), 500);
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const handleFusion = useCallback(() => {
    if (selected.length < 2) return;
    setFusing(true);
    setResult(null);

    // 模拟融合动画
    setTimeout(() => {
      setFusing(false);
      setResult({
        golden: "你早就会讲课了，只是还没学会给自己定价。",
        direction: "暑假作文陪跑营 + 读书笔记IP",
        action: "本周：把朋友圈最好的5条读书笔记发到小红书",
      });
    }, 2000);
  }, [selected]);

  const reset = useCallback(() => {
    setSelected([]);
    setResult(null);
  }, []);

  const selectedPieces = PRESET_PIECES.filter((p) => selected.includes(p.id));

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-warm-bg to-warm-light">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 bg-warm-accent/15 text-warm-accent text-sm font-medium rounded-full mb-4">
            👇 无需登录，立即体验
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-warm-dark mb-4">
            选几块拼图片，看看能拼出什么
          </h2>
          <p className="text-warm-dark/60 max-w-xl mx-auto">
            下面是一位中学老师的拼图片。选2-4块，点击「融合」，
            AI会告诉你这些能力能组合成什么副业方向。
          </p>
        </div>

        {/* 拼图片池 */}
        <div className="bg-white/80 rounded-2xl p-6 shadow-sm mb-6">
          <h3 className="text-sm font-semibold text-warm-dark/60 mb-4 uppercase tracking-wide">
            拼图片池（点击选择）
          </h3>
          <div className="flex flex-wrap gap-3">
            {PRESET_PIECES.map((piece) => {
              const isSelected = selected.includes(piece.id);
              const isShaking = shakePiece === piece.id;
              return (
                <button
                  key={piece.id}
                  onClick={() => togglePiece(piece.id)}
                  className={`
                    relative px-4 py-3 rounded-xl border-2 transition-all duration-200
                    ${
                      isSelected
                        ? "border-warm-accent bg-warm-accent/10 shadow-md scale-105"
                        : "border-warm-border bg-white hover:border-warm-accent/50 hover:shadow-sm"
                    }
                    ${isShaking ? "animate-[shake_0.5s_ease-in-out]" : ""}
                  `}
                >
                  <span className="text-2xl mr-2">{piece.emoji}</span>
                  <span className="text-sm text-warm-dark">{piece.text}</span>
                  {isSelected && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-warm-accent text-white rounded-full text-xs flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-warm-dark/40 mt-3">
            已选 {selected.length}/4 块 · 选2块以上可融合
          </p>
        </div>

        {/* 已选碎片 + 融合按钮 */}
        {selected.length > 0 && (
          <div className="bg-white/80 rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-warm-dark/60 mb-4 uppercase tracking-wide">
              已选拼图片
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPieces.map((piece) => (
                <span
                  key={piece.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-accent/15 rounded-full text-sm text-warm-dark"
                >
                  <span>{piece.emoji}</span>
                  <span>{piece.text}</span>
                </span>
              ))}
            </div>

            {!result && (
              <div className="flex gap-3">
                <button
                  onClick={handleFusion}
                  disabled={selected.length < 2 || fusing}
                  className={`
                    flex-1 py-3 rounded-xl font-semibold text-white transition-all
                    ${
                      selected.length >= 2 && !fusing
                        ? "bg-warm-accent hover:bg-warm-accent/90 hover:shadow-lg hover:shadow-warm-accent/20 active:scale-[0.98]"
                        : "bg-warm-dark/30 cursor-not-allowed"
                    }
                  `}
                >
                  {fusing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      融合中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>⚡</span>
                      开始融合
                    </span>
                  )}
                </button>
                <button
                  onClick={reset}
                  disabled={fusing}
                  className="px-4 py-3 rounded-xl border-2 border-warm-border text-warm-dark/60 hover:border-warm-dark/30 transition-colors"
                >
                  重置
                </button>
              </div>
            )}
          </div>
        )}

        {/* 融合结果 */}
        {result && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-warm-accent/30 animate-[fadeInUp_0.5s_ease-out]">
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 bg-green-50 text-green-600 text-sm font-medium rounded-full mb-3">
                ✅ 融合成功
              </span>
              <h3 className="text-xl font-bold text-warm-dark mb-2">
                融合结果
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-warm-accent/10 rounded-xl p-4">
                <span className="text-sm text-warm-dark/60">💡 金句</span>
                <p className="text-lg text-warm-dark font-medium mt-1 italic">
                  &ldquo;{result.golden}&rdquo;
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <span className="text-sm text-warm-dark/60">🎯 方向</span>
                <p className="text-warm-dark mt-1">{result.direction}</p>
              </div>

              <div className="bg-amber-50 rounded-xl p-4">
                <span className="text-sm text-warm-dark/60">🚀 今天能做的事</span>
                <p className="text-warm-dark mt-1">{result.action}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                href="/onboarding/vision"
                className="flex-1 py-3 bg-warm-accent text-white rounded-xl font-semibold text-center hover:bg-warm-accent/90 transition-colors"
              >
                我也要试试 →
              </Link>
              <button
                onClick={reset}
                className="px-4 py-3 rounded-xl border-2 border-warm-border text-warm-dark/60 hover:border-warm-dark/30 transition-colors"
              >
                再试一次
              </button>
            </div>

            <p className="text-xs text-warm-dark/40 text-center mt-4">
              登录后可保存拼图片、记录融合历史、生成行进地图
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
