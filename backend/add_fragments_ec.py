import requests, json, time

API = "http://localhost:8000/api/fragments"
headers = {'Content-Type': 'application/json'}

fragments = [
    ("技能", "用Google Trends分析产品搜索趋势"),
    ("技能", "批量上传产品到Amazon/eBay"),
    ("技能", "用Canva或Photoshop做产品主图"),
    ("技能", "写高转化率的英文产品描述"),
    ("技能", "多平台同步库存避免超卖"),
    ("技能", "用ERP系统管理订单和发货"),
    ("能力", "快速判断一个产品有没有市场"),
    ("能力", "跟海外客户邮件沟通不卡壳"),
    ("能力", "用翻译工具+AI写出地道英文"),
    ("经历", "第一次日出单激动到半夜没睡"),
    ("经历", "因为产品侵权被下架，赔了运费"),
    ("经历", "旺季爆单却发不出货的崩溃"),
    ("经历", "找到一个小众品类月入过万"),
    ("知识", "了解欧盟CE认证和美国FCC认证流程"),
    ("知识", "各国VAT税率大致范围"),
    ("知识", "不同国家海关常见扣件原因"),
    ("知识", "空运和海运的成本和时效对比"),
    ("习惯", "每天刷竞品评论找差评机会"),
    ("习惯", "定期盘点库存，提前备货旺季"),
    ("资源", "有靠谱的货代联系方式"),
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
