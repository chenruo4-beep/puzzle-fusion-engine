with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line after "truncate">{f.content}</span>" inside the fragment button
# This is inside the fragment list map - we need the "truncate" + "suggest similar" area
for i, line in enumerate(lines):
    if 'truncate' in line and i < 920:
        # Check if next non-empty line has </span> and </button> pattern
        if i + 1 < len(lines) and '</span>' in lines[i+1] and i + 2 < len(lines) and '</button>' in lines[i+2]:
            print(f'Found at line {i+1}: {repr(line.strip())}')
            print(f'  [{i+2}]: {repr(lines[i+1].strip())}')
            print(f'  [{i+3}]: {repr(lines[i+2].strip())}')
            # Check around line 866
            for j in range(i-5, i+8):
                if 0 <= j < len(lines):
                    print(f'    [{j+1}]: {repr(lines[j][:80])}')
            break