import json
from database import SessionLocal
from models.fusion import Fusion
from models.fragment import Fragment

db = SessionLocal()
fusions = db.query(Fusion).all()
for f in fusions:
    try:
        ids = json.loads(f.fragment_ids) if f.fragment_ids else []
        frags = db.query(Fragment).filter(Fragment.id.in_(ids)).all()
        print(f'Fusion {f.id}: ids={ids}')
        for x in frags:
            print(f'  -> {x.id}: {x.content[:30]}')
    except Exception as e:
        print(f'Fusion {f.id}: error={e}')
