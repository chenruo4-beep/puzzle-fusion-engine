with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_pattern = '<span className="truncate">{f.content}</span>'
idx = content.find(old_pattern)

# Extract bytes around the match
start = max(0, idx - 150)
end = min(len(content), idx + len(old_pattern) + 150)
snippet = content[start:end]

with open(r'D:\projects\puzzle-fusion-engine\context.txt', 'w', encoding='utf-8') as out:
    out.write(f'Found at index {idx}\n')
    out.write('Snippet:\n')
    out.write(snippet)
    out.write('\n\n')
    # Also show line number
    lines = content[:idx].split('\n')
    out.write(f'Line: {len(lines)+1}\n')

print('Done')