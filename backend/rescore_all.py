import requests, json, asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from services.ai_service import AIService

API = "http://localhost:8000/api/fragments"

# 获取所有碎片
r = requests.get(API)
fragments = r.json()
print(f"总碎片数: {len(fragments)}")

async def score_all():
    for f in fragments:
        fid = f['id']
        frag_type = f['fragment_type']
        content = f['content']
        tags = f.get('tags') or '{}'
        try:
            tags_obj = json.loads(tags)
        except:
            tags_obj = {}
        
        current_score = tags_obj.get('quality_score', 0)
        if current_score > 0:
            print(f"  id={fid} 已有分数={current_score}，跳过")
            continue
        
        # 调用AI评分
        score = await AIService.score_fragment(frag_type, content)
        print(f"  id={fid} [{frag_type}] score={score} | {content[:20]}...")
        
        # 写回数据库
        tags_obj['quality_score'] = score
        patch = requests.patch(f"{API}/{fid}", json={'tags': json.dumps(tags_obj)})
        print(f"    → 更新结果: {patch.status_code}")

asyncio.run(score_all())
print("\n重评完成!")