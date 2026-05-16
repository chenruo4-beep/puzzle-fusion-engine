with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix line 257: toggleBatchItem is truncated
old1 = (
    '    setBatchPreview(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected '
    '  };\n'
)
new1 = (
    '    setBatchPreview(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected }));'
    '\n'
)

# Fix line 260: selectAllBatch is truncated
old2 = '  const selectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: true }'
new2 = '  const selectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: true })));'

# Fix line 261: deselectAllBatch is truncated
old3 = '  const deselectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: fals'
new3 = '  const deselectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: false })));'

count = 0
for old, new in [(old1, new1), (old2, new2), (old3, new3)]:
    if old in content:
        content = content.replace(old, new, 1)
        count += 1
        print(f'Fixed: {repr(old[:50])}')
    else:
        print(f'NOT FOUND: {repr(old[:50])}')

with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print(f'\nTotal fixes: {count}')