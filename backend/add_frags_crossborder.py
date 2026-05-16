import requests, json, time, sys

sys.stdout.reconfigure(encoding='utf-8')

API = "http://localhost:8000/api/fragments"
headers = {'Content-Type': 'application/json'}

# 跨境电商从业者 20条碎片
fragments = [
    ("技能", "在亚马逊后台处理订单和退款"),
    ("技能", "用PS给产品图换背景和白底"),
    ("技能", "写英文产品标题和五点描述"),
    ("技能", "用ERP系统批量上传产品"),
    ("技能", "分析竞品评论找出产品痛点"),
    ("能力", "在多个时区回复客户消息"),
    ("能力", "快速判断一个产品有没有爆款潜质"),
    ("能力", "在利润率低于5%时及时止损"),
    ("经历", "第一次产品被跟卖，学会品牌备案"),
    ("经历", "旺季一天出300单，通宵打包"),
    ("经历", "踩过海关扣货的坑，损失2万元"),
    ("经历", "把一个死链接盘活，月销重新破千"),
    ("习惯", "每天早上看前一日广告ROI数据"),
    ("习惯", "定期下载竞品评论做关键词分析"),
    ("习惯", "把客户常见问题整理成FAQ文档"),
    ("知识", "了解欧盟和美国的合规认证要求"),
    ("知识", "知道不同物流渠道的时效和清关特点"),
    ("资源", "有靠谱的海外仓合作方"),
    ("资源", "认识几个能帮忙赶跟卖的服务商"),
    ("资源", "有稳定的供应链工厂可私模定制"),
]

print(f"准备添加 {len(fragments)} 条碎片...")
added = 0
for frag_type, content in fragments:
    resp = requests.post(API, headers=headers, json={
        'fragment_type': frag_type,
        'content': content,
        'tags': json.dumps({'quality_score': 4})
    })
    if resp.status_code in (200, 201):
        added += 1
        print(f"  [OK] [{frag_type}] {content[:20]}...")
    else:
        print(f"  [FAIL] 失败 {resp.status_code} {resp.text[:100]}")
    time.sleep(0.3)

print(f"\n完成：成功添加 {added}/{len(fragments)} 条碎片")
