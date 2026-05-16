with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the delete button line
for i, line in enumerate(lines):
    if 'title="' in line and '删除' in line and 'top-2 right-2' in line and i < 920:
        print(f'Found at line {i+1}')
        for j in range(max(0,i-2), min(len(lines), i+12)):
            print(f'  [{j+1}]: {repr(lines[j])}')
        break