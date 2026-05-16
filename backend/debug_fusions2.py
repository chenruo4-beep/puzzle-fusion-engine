import json, os, sys
os.chdir(r'D:\projects\puzzle-fusion-engine\backend')
sys.path.insert(0, r'D:\projects\puzzle-fusion-engine\backend')

from database import SessionLocal
from models.fusion import Fusion
from models.fragment import Fragment

db = SessionLocal()
fusions = db.query(Fusion).all()
for f in fusions:
    try:
        ids = json.loads(f.fragment_ids) if f.fragment_ids else []
        if not ids:
            continue
        frags = db.query(Fragment).filter(Fragment.id.in_(ids)).all()
        print(f'Fusion {f.id}: ids={ids}, n_frags={len(frags)}')
        for x in frags:
            # Encode to avoid console issues
            content = x.content.encode('utf-8', errors='replace').decode('utf-8')
            print(f'  -> frag {x.id}: [{x.fragment_type}] {content[:40]}')
    except Exception as e:
        print(f'Fusion {f.id}: error={e}')
