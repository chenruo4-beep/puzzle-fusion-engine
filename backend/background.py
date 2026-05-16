"""后台任务 — 异步碎片提取"""

import json
import logging

from database import SessionLocal
from models.journal import JournalEntry
from services.ai_service import AIService

logger = logging.getLogger(__name__)


async def run_fragment_extraction(journal_id: int, content: str):
    """后台异步从日记中提取碎片"""
    db = SessionLocal()
    try:
        fragments = await AIService.extract_fragments_from_journal(content)
        if fragments:
            journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
            if journal:
                journal.suggested_fragments = json.dumps(fragments, ensure_ascii=False)
                db.commit()
                logger.info(f"Extracted {len(fragments)} fragments from journal {journal_id}")
        else:
            logger.info(f"No fragments extracted from journal {journal_id}")
    except Exception as e:
        logger.error(f"Fragment extraction failed for journal {journal_id}: {e}")
    finally:
        db.close()
