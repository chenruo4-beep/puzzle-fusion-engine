import requests, json, time

API = "http://localhost:8000/api/fragments"
headers = {'Content-Type': 'application/json'}

fragments = [
    ("技能", "用Figma或Photoshop做主图"),
    ("技能", "把客户模糊的想法变成具体画面"),
    ("技能", "从竞品图中找出设计趋势"),
    ("技能", "设计兼顾美观和转化率"),
    ("技能", "快速出3个方案让客户选"),
    ("能力", "在客户反复改稿时保持耐心"),
    ("能力", "把复杂信息变成简洁的视觉语言"),
    ("经历", "第一次作品被客户当众表扬"),
    ("经历", "踩过版权图片的坑，赔了钱"),
    ("经历", "熬夜3天完成一个急单"),
    ("习惯", "每天收集10个设计灵感"),
    ("习惯", "定期整理自己的作品集"),
    ("资源", "有设计素材网站的付费账号"),
    ("资源", "认识几个靠谱的印刷厂"),
    ("资源", "有可参考的设计工具箱"),
    ("技能", "做海报和社交媒体配图"),
    ("能力", "同时管多个项目不遗漏"),
    ("知识", "了解印刷和数字输出的差异"),
    ("经历", "参与过从0到1的品牌设计"),
    ("习惯", "做设计前先了解品牌调性"),
]

added = 0
for frag_type, content in fragments:
    resp = requests.post(API, headers=headers, json={
        'fragment_type': frag_type,
        'content': content,
        'tags': json.dumps({'quality_score': 4})
    })
    if resp.status_code in (200, 201):
        added += 1
        print(f"OK [{frag_type}] {content[:15]}")
    else:
        print(f"FAIL {resp.status_code}: {content[:20]}")
    time.sleep(0.3)

print(f"DONE: {added}/{len(fragments)}")