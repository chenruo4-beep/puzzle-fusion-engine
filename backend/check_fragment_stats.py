"""检查碎片统计信息"""
import requests
import json

base_url = "http://localhost:8000/api"

# 获取所有碎片
response = requests.get(f"{base_url}/fragments/")
fragments = response.json()

print(f"总碎片数: {len(fragments)}")

# 统计碎片类型
type_counts = {}
for fragment in fragments:
    ftype = fragment.get('fragment_type', 'unknown')
    type_counts[ftype] = type_counts.get(ftype, 0) + 1

print("\n碎片类型分布:")
for ftype, count in sorted(type_counts.items()):
    print(f"  {ftype}: {count}")

# 检查是否有职业标签
print("\n碎片内容示例（前3个）:")
for i, fragment in enumerate(fragments[:3]):
    print(f"  {i+1}. {fragment['content'][:50]}...")

# 检查API端点是否正常工作
print("\n检查其他API端点:")
endpoints = ["/health", "/fragments/", "/fusions/"]
for endpoint in endpoints:
    try:
        resp = requests.get(f"{base_url}{endpoint}")
        print(f"  {endpoint}: {resp.status_code} - OK")
    except Exception as e:
        print(f"  {endpoint}: ERROR - {str(e)}")