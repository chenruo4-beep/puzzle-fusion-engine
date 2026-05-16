import re

path = r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useToast import
if 'import { useToast }' not in content:
    content = content.replace(
        "import { useState, useEffect, useCallback } from 'react';",
        "import { useState, useEffect, useCallback } from 'react';\nimport { useToast } from '@/components/Toast';"
    )

# 2. Add useToast hook call
if 'const { toast } = useToast();' not in content:
    # Find a good place to add it - after the last useState declaration
    target = 'const [dedupeDeleting, setDedupeDeleting] = useState(false);'
    replacement = 'const [dedupeDeleting, setDedupeDeleting] = useState(false);\n  const { toast } = useToast();'
    content = content.replace(target, replacement)

# 3. Replace alert() calls with toast() calls
replacements = [
    ("alert('保存失败：' + (err.message || '未知错误'));", 
     "toast('保存失败：' + (err.message || '未知错误'), 'error');"),
    ("alert('删除失败：' + (err.message || '未知错误'));", 
     "toast('删除失败：' + (err.message || '未知错误'), 'error');"),
    ("alert('评分失败：' + (err.message || '未知错误'));", 
     "toast('评分失败：' + (err.message || '未知错误'), 'error');"),
    ("alert('AI分析失败：' + (err.message || '未知错误'));", 
     "toast('AI分析失败：' + (err.message || '未知错误'), 'error');"),
    ("alert('批量保存失败：' + (err.message || '未知错误'));", 
     "toast('批量保存失败：' + (err.message || '未知错误'), 'error');"),
    ("alert('去重扫描失败：' + (err.message || '未知错误'));", 
     "toast('去重扫描失败：' + (err.message || '未知错误'), 'error');"),
    ("alert('删除失败：' + (err.message || '未知错误'));", 
     "toast('删除失败：' + (err.message || '未知错误'), 'error');"),
    ("alert('请输入至少20个字符');", 
     "toast('请输入至少20个字符', 'warning');"),
    ("alert('请至少选择一条碎片');", 
     "toast('请至少选择一条碎片', 'warning');"),
]

for old, new in replacements:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Toast integration complete!')
print(f'Content length: {len(content)} chars')
