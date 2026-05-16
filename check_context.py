with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_pattern = '<span className="truncate">{f.content}</span>'
idx = content.find(old_pattern)
print(f'Found at character index: {idx}')

# Show surrounding context (200 chars before and after)
start = max(0, idx - 200)
end = min(len(content), idx + len(old_pattern) + 200)
print('Context:')
print(repr(content[start:end]))