"""初始化数据库表结构（修复 archived 列缺失问题）"""
from database import engine, Base
from models.fragment import Fragment
from models.fusion import Fusion
from models.journal import JournalEntry
from models.template import Template
from models.checkin import CheckIn

# 手动 ALTER TABLE 添加 archived 列（SQLite 不支持 ALTER ADD COLUMN 直接添加）
import sqlite3

conn = sqlite3.connect('puzzle_fusion.db')
cursor = conn.cursor()

# 检查 fragments 表结构
cursor.execute("PRAGMA table_info(fragments)")
cols = [row[1] for row in cursor.fetchall()]
print("Current fragments columns:", cols)

if 'archived' not in cols:
    print("Adding 'archived' column to fragments...")
    try:
        cursor.execute("ALTER TABLE fragments ADD COLUMN archived INTEGER DEFAULT 0")
        print("✅ archived column added")
    except Exception as e:
        print(f"Error: {e}")

conn.commit()
conn.close()

# 验证
conn2 = sqlite3.connect('puzzle_fusion.db')
c2 = conn2.cursor()
c2.execute("PRAGMA table_info(fragments)")
cols2 = [row[1] for row in c2.fetchall()]
print("Updated fragments columns:", cols2)
conn2.close()

print("Done!")