with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the pattern: <span className="truncate">{f.content}</span> + next lines leading to </button>
# We'll replace it with content + recommend button

old_pattern = '<span className="truncate">{f.content}</span>'
if old_pattern not in content:
    print('PATTERN NOT FOUND')
    print('Searching for truncate...')
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'truncate' in line:
            print(f'Line {i+1}: {repr(line)}')
else:
    print('Found pattern')
    # Count occurrences
    count = content.count(old_pattern)
    print(f'Found {count} times')