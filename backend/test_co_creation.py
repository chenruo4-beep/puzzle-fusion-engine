"""Quick test script to debug co_creation analyze"""
import sys
sys.path.insert(0, '.')
from database import SessionLocal
from models.fragment import Fragment
from routers.co_creation import analyze_co_creation, CoCreationCreate

db = SessionLocal()
try:
    body = CoCreationCreate(
        user_a_name="testA",
        user_b_name="testB",
        relationship="partner",
        project_type="test",
        user_a_fragment_ids=[279, 280],
        user_b_fragment_ids=[281, 282],
    )
    result = analyze_co_creation(body, db)
    print("SUCCESS:", result)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
