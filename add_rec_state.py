with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Check if recModal already exists
if 'recModal' in content:
    print('recModal already in file - skip state addition')
else:
    # Add recModal state after goalError state
    old = '  const [goalError, setGoalError] = useState(\'\');'
    new = (
        '  const [goalError, setGoalError] = useState(\'\');\n'
        '  const [recModal, setRecModal] = useState<{\n'
        '    open: boolean;\n'
        '    target: Fragment | null;\n'
        '    recs: any[];\n'
        '  }>({ open: false, target: null, recs: [] });'
    )
    if old not in content:
        print('goalError not found - looking for alternative')
        # Try to find where to insert
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'MAX_GOAL_LENGTH' in line or 'goalError' in line:
                print(f'  Line {i+1}: {repr(line[:80])}')
    else:
        new_content = content.replace(old, new, 1)
        with open(r'D:\projects\puzzle-fusion-engine\frontend\src\app\dashboard\fusion\page.tsx', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('State added OK')

print('Done')