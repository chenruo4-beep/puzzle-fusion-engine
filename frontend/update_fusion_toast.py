path = r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useToast import
if 'import { useToast }' not in content:
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            last_import_idx = i
    lines.insert(last_import_idx + 1, "import { useToast } from '@/components/Toast';")
    content = '\n'.join(lines)

# 2. Add useToast hook call
if 'const { toast } = useToast();' not in content:
    lines = content.split('\n')
    insert_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith('useEffect('):
            insert_idx = i
            break
    if insert_idx:
        lines.insert(insert_idx, '')
        lines.insert(insert_idx, '  const { toast } = useToast();')
        content = '\n'.join(lines)

# 3. Replace alert() calls
content = content.replace(
    "alert('未找到匹配的碎片');",
    "toast('未找到匹配的碎片', 'warning');"
)
content = content.replace(
    "} catch { alert('技术失败'); }",
    "} catch { toast('技术失败', 'error'); }"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(path, 'r', encoding='utf-8') as f:
    final = f.read()
has_toast = 'useToast' in final
remaining = final.count('alert(')
print('Has useToast import:', has_toast)
print('Remaining alert() calls:', remaining)
print('Done!')