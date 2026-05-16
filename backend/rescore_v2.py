import requests, json

API = "http://localhost:8000/api/fragments"
headers = {'Content-Type': 'application/json'}

# 调OpenClaw网关评分
def ai_score(frag_type, content):
    resp = requests.post(
        "http://127.0.0.1:28789/v1/chat/completions",
        headers=headers,
        json={
            "model": "openclaw/main",
            "messages": [
                {"role": "system", "content": "给这个能力碎片打个质量分（1-5）。只看三个维度：1.具体性——越具体分越高 2.可操作性——能直接转化为行动的更高 3.独特性——越少人有的越高。只输出一个1-5的数字，不要其他内容。5=非常具体+可操作+独特 4=具体+有一点独特 3=中等，不突出也不差 2=模糊或太常见 1=太空泛"},
                {"role": "user", "content": f"[{frag_type}] {content}"}
            ],
            "max_tokens": 5,
            "temperature": 0.2
        },
        timeout=15
    )
    data = resp.json()
    try:
        score_text = data['choices'][0]['message']['content'].strip()
        score = int(score_text)
        return max(1, min(5, score))
    except:
        return 3

# 获取所有碎片
r = requests.get(API)
fragments = r.json()
print(f"总碎片数: {len(fragments)}")

# 对没有分数的进行评分
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
    
    score = ai_score(frag_type, content)
    print(f"  id={fid} [{frag_type}] score={score} | {content[:15]}...")
    
    tags_obj['quality_score'] = score
    patch = requests.patch(f"{API}/{fid}", json={'tags': json.dumps(tags_obj)})
    print(f"    → {patch.status_code}")

print("\nAI评分完成!")