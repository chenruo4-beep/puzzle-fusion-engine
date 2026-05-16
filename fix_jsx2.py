with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert lowQualityCount before the main return
insert_point = '  return (\n    <div className="space-y-5">'
new_code = '''  // ── Stats (computed before render) ───────────────────────────────────
  const lowQualityCount = fragments.filter(f => {
    try { return (JSON.parse(f.tags || '{}').quality_score || 0) <= 2; } catch { return false; }
  }).length;

  return (
    <div className="space-y-5">'''

if insert_point in content:
    content = content.replace(insert_point, new_code, 1)
    print('Inserted lowQualityCount before return')
else:
    print('Insert point not found')

with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)