import sys
sys.path.insert(0, '.')

from database import engine, Base
from models.user import User
from models.fragment import Fragment
from models.fusion import Fusion
from models.journal import JournalEntry
from models.checkin import CheckIn
from models.template import Template
from models.analytics import ABEvent
from models.inspiration import Inspiration
from models.co_creation import CoCreation, CoCreationFragment
from models.co_creation_order import CoCreationOrder

# Create all tables
Base.metadata.create_all(bind=engine)
print('Tables created!')

# Verify
import sqlite3
conn = sqlite3.connect('puzzle_fusion.db')
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print(f'Tables: {tables}')

# Check fragment columns
cur.execute("PRAGMA table_info(fragments)")
print(f'fragments cols: {[c[1] for c in cur.fetchall()]}')

# Check fusion columns
cur.execute("PRAGMA table_info(fusions)")
print(f'fusions cols: {[c[1] for c in cur.fetchall()]}')

conn.close()
print('Done!')