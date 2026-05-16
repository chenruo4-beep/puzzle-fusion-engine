with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
lines = content.split('\n')

# Check bracket balance for each line
depth = 0
for i, line in enumerate(lines):
    # Count { } (ignoring strings)
    in_str = False
    for ch in line:
        if ch == '"' or ch == "'" or ch == '`':
            in_str = not in_str
        if not in_str:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
    
    if depth < 0 or (i > 240 and i < 280):
        print(f'[{i+1}] depth={depth}: {repr(line[:80])}')

print(f'\nFinal depth: {depth}')