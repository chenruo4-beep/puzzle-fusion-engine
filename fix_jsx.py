with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and split at the return statement
# Find "  return (\n    <div className=\"space-y-5\">" and insert lowQualityCount before it

# The problematic const is inside JSX - need to move before return
# Find the pattern:
# - Look for "  // ── Stats ──" followed by const lowQualityCount
# - And move it BEFORE "  return ("

old_code = '''  // ── Stats ──────────────────────────────────────────────────────
  const lowQualityCount = fragments.filter(f => {
    try { return (JSON.parse(f.tags || '{}').quality_score || 0) <= 2; } catch { return false; }
  }).length;

  // ── Filter + Search bar ───────────────────────────────────────
  {fragments.length > 0 && (
    <>
      {/* Quality stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-white/50 border border-warm-dark/5 text-xs">'''

new_code = '''  // ── Stats ──────────────────────────────────────────────────────
  // (Moved outside JSX, before return below)
  
  // ── Filter + Search bar ───────────────────────────────────────
  {fragments.length > 0 && (
    <>
      {/* Quality stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-white/50 border border-warm-dark/5 text-xs">'''

if old_code in content:
    content = content.replace(old_code, new_code, 1)
    print('Found and replaced the code block')
else:
    print('Pattern not found - trying different approach')
    # Let me find the line numbers for lowQualityCount and split differently
    lines = content.split('\n')
    # Find line index where "  // ── Stats ──" appears
    stats_idx = None
    return_idx = None
    for i, line in enumerate(lines):
        if '// ── Stats ──' in line and i > 260 and i < 280:
            stats_idx = i
        if 'return (\n    <div className="space-y-5">' in line:
            return_idx = i
    
    print(f'stats_idx={stats_idx}, return_idx={return_idx}')

# Write back
with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)