with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix line 260: has double closing
old2 = '  const selectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: true })));))));'
new2 = '  const selectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: true })));'

# Fix line 261: has garbage at end
old3 = '  const deselectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: false })));e }))));'
new3 = '  const deselectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: false })));'

count = 0
for old, new in [(old2, new2), (old3, new3)]:
    if old in content:
        content = content.replace(old, new, 1)
        count += 1
        print(f'Fixed')
    else:
        print(f'NOT FOUND')

with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Total fixes: {count}')