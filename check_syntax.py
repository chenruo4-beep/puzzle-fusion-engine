# Test the file for syntax errors
import sys
sys.path.insert(0, r'D:\QCLAW\resources\node\node_modules\@babel\parser')
try:
    # Try to read the file and check for obvious issues
    with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fragments\page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for common JSX syntax issues
    issues = []
    
    # Check if return statement at line 278 has matching brace
    lines = content.splitlines()
    
    # Find the main return block
    for i, line in enumerate(lines):
        if 'return (' in line and '<div' in line:
            print(f'Found return at line {i+1}: {repr(line.strip()[:60])}')
            # Check balanced braces
            # Count braces after this line
            depth = 0
            for j in range(i, min(i+200, len(lines))):
                l = lines[j]
                for c in l:
                    if c == '{': depth += 1
                    elif c == '}': depth -= 1
                if j - i > 50 and depth == 0:
                    print(f'  Balanced at line {j+1}, depth={depth}')
                    break
            break
    
    # Check if there are duplicate className keys
    for i, line in enumerate(lines):
        if 'className=' in line:
            # Count className occurrences in this line
            count = line.count('className=')
            if count > 1:
                print(f'Line {i+1} has {count} className occurrences: {repr(line[:100])}')
    
    print('Basic checks done')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()