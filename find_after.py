with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(865, 900):
    print(f'[{i+1}]: {repr(lines[i][:120])}')