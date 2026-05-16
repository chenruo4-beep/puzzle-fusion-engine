import sqlite3, json
conn = sqlite3.connect(r'D:\projects\puzzle-fusion-engine\backend\puzzle_fusion.db')
cur = conn.cursor()

# Check the most recent fusions and their content
for fid in [9, 7, 6]:
    cur.execute("SELECT id, title, profession, result, fragment_ids FROM fusions WHERE id=?", (fid,))
    r = cur.fetchone()
    if r:
        print(f"\n=== Fusion ID {r[0]} ({r[2]}) ===")
        print(f"Title: {r[1]}")
        try:
            result = json.loads(r[3])
            print(f"golden_sentence: {result.get('golden_sentence', 'MISSING')[:80]}")
            print(f"directions count: {len(result.get('directions', []))}")
            for i, d in enumerate(result.get('directions', [])):
                print(f"  Dir[{i}] title: {d.get('title', 'MISSING')[:50]}")
                print(f"  Dir[{i}] why_this_works length: {len(d.get('why_this_works', '') or '')}")
            print(f"insight: {result.get('insight', 'MISSING')[:100]}")
            print(f"skill_gaps count: {len(result.get('skill_gaps', []))}")
            print(f"fragment_connections count: {len(result.get('fragment_connections', []))}")
        except Exception as e:
            print(f"PARSE ERROR: {e}")
            print(f"Raw result[:200]: {str(r[3])[:200]}")

conn.close()