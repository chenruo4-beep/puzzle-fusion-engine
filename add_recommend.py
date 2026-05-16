with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = (
    '                  <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs border transition-all ${\n'
    '                    isSelected\n'
    '                      ? \'bg-warm-accent border-warm-accent text-white\'\n'
    '                      : \'border-warm-dark/15\'\n'
    '                  }`}>\n'
    '                    {isSelected ? \'✓\' : \'\'}\n'
    '                  </span>\n'
    '                  <span className="truncate">{f.content}</span>\n'
    '                </button>'
)

new = (
    '                  <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs border transition-all ${\n'
    '                    isSelected\n'
    '                      ? \'bg-warm-accent border-warm-accent text-white\'\n'
    '                      : \'border-warm-dark/15\'\n'
    '                  }`}>\n'
    '                    {isSelected ? \'✓\' : \'\'}\n'
    '                  </span>\n'
    '                  <span className="truncate">{f.content}</span>\n'
    '                  <button\n'
    '                    onClick={async (e) => {\n'
    '                      e.stopPropagation();\n'
    '                      try {\n'
    '                        const exclude = Array.from(selectedIds).join(\',\');\n'
    '                        const res = await fetch(`${API_BASE}/api/fragments/recommend?target_id=${f.id}&exclude_ids=${exclude}&limit=5`);\n'
    '                        const data = await res.json();\n'
    '                        if (data.recommendations && data.recommendations.length > 0) {\n'
    '                          setRecModal({\n'
    '                            open: true,\n'
    '                            target: f,\n'
    '                            recs: data.recommendations,\n'
    '                          });\n'
    '                        } else {\n'
    '                          alert(\'没有找到更多相关碎片了\');\n'
    '                        }\n'
    '                      } catch { alert(\'推荐失败\'); }\n'
    '                    }}\n'
    '                    title="查找相关碎片"\n'
    '                    className="shrink-0 px-1.5 py-0.5 rounded text-xs bg-warm-accent/5 text-warm-accent/50 border border-warm-accent/20 hover:bg-warm-accent/15 hover:text-warm-accent/80 transition-all ml-1"\n'
    '                  >\n'
    '                    💡\n'
    '                  </button>\n'
    '                </button>'
)

if old not in content:
    print('PATTERN NOT FOUND')
else:
    new_content = content.replace(old, new, 1)
    with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('REPLACED OK')