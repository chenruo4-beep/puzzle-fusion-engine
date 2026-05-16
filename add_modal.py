with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the insertion point: before the final </div> of the main return
# Look for the pattern "      {/* 融合按钮 */}" and insert modal before it
target = '      {/* 融合按钮 */}'
modal_code = '''      {/* AI推荐相关碎片弹窗 */}
      {recModal.open && recModal.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-warm-dark/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-warm-dark/5">
              <div>
                <h3 className="font-bold text-warm-dark">💡 相关碎片推荐</h3>
                <p className="text-xs text-warm-dark/40 mt-0.5">
                  基于「{recModal.target.content.slice(0, 15)}...」推荐
                </p>
              </div>
              <button
                onClick={() => setRecModal({ open: false, target: null, recs: [] })}
                className="w-7 h-7 rounded-full bg-warm-dark/5 text-warm-dark/40 hover:bg-warm-dark/10 hover:text-warm-dark/60 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {recModal.recs.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl border border-warm-dark/10 bg-warm-light/40 hover:border-warm-accent/30 transition-colors cursor-pointer"
                  onClick={() => {
                    if (!selectedIds.has(String(rec.id))) {
                      if (selectedIds.size >= MAX_FRAGMENTS) return;
                      setSelectedIds(prev => new Set(prev).add(String(rec.id)));
                    }
                    setRecModal({ open: false, target: null, recs: [] });
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: TYPE_COLORS[rec.fragment_type] || '#b8a088' }}
                    >
                      {rec.fragment_type}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-warm-dark/30">相似度 {(rec.composite_score * 100).toFixed(0)}%</span>
                      {selectedIds.has(String(rec.id)) && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">已选</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-warm-dark/80">{rec.content}</p>
                  {rec.quality_score >= 4 && (
                    <p className="text-xs text-amber-600 mt-1">⭐ 高质量碎片</p>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setRecModal({ open: false, target: null, recs: [] })}
                className="w-full py-2 rounded-xl bg-warm-dark/5 text-warm-dark/50 text-sm hover:bg-warm-dark/10 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

'''

if target not in content:
    print('TARGET NOT FOUND')
else:
    new_content = content.replace(target, modal_code + target, 1)
    with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('MODAL ADDED OK')