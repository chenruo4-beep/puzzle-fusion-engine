with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '  const selectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: true })));)));',
    '  const selectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: true })));'
)
content = content.replace(
    '  const deselectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: false })));e })));',
    '  const deselectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: false })));'
)

with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed both lines')