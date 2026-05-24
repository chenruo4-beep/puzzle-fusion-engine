"""
领域识别系统 — 15 个行业领域 + 10 个生活场景关键词词典
"""

import re
from typing import Optional

# 15 个行业领域关键词
INDUSTRY_KEYWORDS: dict[str, list[str]] = {
    "餐饮": ["餐厅", "厨师", "厨房", "外卖", "做菜", "炒菜", "配菜", "服务员", "奶茶", "小吃",
            "火锅", "烧烤", "面馆", "早餐", "夜宵", "食堂", "切菜", "端盘", "洗碗"],
    "物流配送": ["快递", "外卖骑手", "配送", "送货", "物流", "仓库", "骑手", "跑腿", "送餐",
               "分拣", "驿站", "卡车", "司机", "货运", "同城送", "搬货"],
    "零售小店": ["便利店", "超市", "小卖部", "摆摊", "批发", "进货", "库存", "收银", "理货",
               "店铺", "摊位", "杂货", "闲鱼", "二手", "开店"],
    "制造工厂": ["工厂", "车间", "流水线", "操作工", "质检", "机修", "组装", "包装", "生产线",
               "普工", "技工", "班长", "产能", "排班", "倒班"],
    "销售服务": ["销售", "推销", "中介", "房产", "保险", "电销", "客服", "接待", "谈判",
               "签单", "客户", "提成", "涨价", "砍价", "促销"],
    "家政护理": ["保洁", "月嫂", "保姆", "护工", "养老", "家政", "打扫", "带娃", "育儿嫂",
               "钟点工", "做饭阿姨", "看护", "洗衣"],
    "美容美发": ["美发", "理发", "美容", "美甲", "化妆", "发型", "染发", "烫发", "纹绣",
               "护肤", "美睫", "采耳", "按摩", "足疗"],
    "汽修汽配": ["修车", "汽车", "修理", "发动机", "轮胎", "钣金", "喷漆", "电动车",
               "摩托车", "4S店", "年检", "换油", "二手车"],
    "建筑装修": ["装修", "工地", "建筑", "水电", "木工", "瓦工", "油漆", "钢筋", "水泥",
               "搬砖", "砌墙", "贴砖", "打墙", "刮腻子"],
    "教育培训": ["老师", "培训", "家教", "补习", "考证", "学历", "学生", "学校", "课程",
               "辅导", "讲课", "学员", "知识点", "考试"],
    "互联网技术": ["编程", "代码", "程序员", "前端", "后端", "APP", "小程序", "服务器",
                 "数据库", "测试", "运维", "UI", "Python", "Java"],
    "农牧养殖": ["种地", "养猪", "养鸡", "种菜", "农田", "果园", "水产", "大棚", "饲料",
               "收成", "耕地", "养殖", "垂钓", "农庄"],
    "医疗健康": ["医院", "护士", "药店", "中医", "看病", "养生", "体检", "康复", "针灸",
               "推拿", "诊所", "慢性病", "手术"],
    "普通职场": ["上班", "公司", "办公", "会议", "PPT", "Excel", "周报", "考勤", "工资",
               "年终", "社保", "加班", "辞职", "跳槽", "简历", "面试"],
    "自由职业": ["自由职业", "接单", "兼职", "副业", "自媒体", "博主", "直播", "主播",
               "短视频", "小红书", "抖音", "知乎", "B站", "公众号"],
}


# 10 个生活场景关键词
LIFE_SITUATION_KEYWORDS: dict[str, list[str]] = {
    "宝妈回归": ["带娃", "产假", "哺乳", "宝妈", "全职妈妈", "接送孩子", "断奶", "二胎", "三胎"],
    "小镇青年": ["县城", "镇上", "村里", "老家", "小城市", "小镇", "乡里"],
    "城市务工": ["打工", "租房", "城中村", "外地人", "北漂", "深漂", "沪漂", "务工"],
    "中年转行": ["三十", "四十", "转行", "改行", "重新", "换行业", "中年", "上有老", "房贷"],
    "学历不高": ["初中", "高中", "中专", "技校", "没考上", "辍学", "没学历", "学历低"],
    "残障适应": ["残疾", "听障", "视障", "轮椅", "聋哑", "拐杖", "障碍", "残疾证"],
    "退伍军人": ["退伍", "当兵", "退役", "军人", "部队", "士官", "转业"],
    "刚毕业": ["毕业", "应届", "找工作", "第一份", "实习生", "试用期", "刚出学校"],
    "负债压力": ["欠债", "贷款", "还钱", "逾期", "网贷", "信用卡", "催收", "负债"],
    "社恐内向": ["社恐", "内向", "不爱说话", "宅", "人多了", "社交", "不想出去", "独处"],
}


class DomainExtractor:
    """从碎片中提取行业领域和生活场景"""

    @staticmethod
    def extract_domains(fragments: list[dict], profession: str = "") -> dict:
        """
        分析碎片列表，返回领域识别结果。

        Returns:
            {
                "primary_industry": str,
                "secondary_industries": list[str],
                "life_situations": list[str],
                "domain_scores": dict,
                "template_group": str,
            }
        """
        all_text = " ".join(f.get("content", "") for f in fragments)
        if profession:
            all_text += " " + profession

        # 行业打分
        industry_scores: dict[str, int] = {}
        for industry, keywords in INDUSTRY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in all_text)
            if score > 0:
                # 加分：关键词长度越长越精准
                score += sum(0.5 for kw in keywords if len(kw) >= 3 and kw in all_text)
                industry_scores[industry] = int(score)

        # 生活场景打分
        life_scores: dict[str, int] = {}
        for situation, keywords in LIFE_SITUATION_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in all_text)
            if score > 0:
                life_scores[situation] = score

        # 排序
        sorted_industries = sorted(industry_scores.items(), key=lambda x: x[1], reverse=True)
        sorted_life = sorted(life_scores.items(), key=lambda x: x[1], reverse=True)

        primary = sorted_industries[0][0] if sorted_industries else "通用"
        secondary = [s[0] for s in sorted_industries[1:3]] if len(sorted_industries) > 1 else []
        life = [s[0] for s in sorted_life[:3]] if sorted_life else []

        # 模板组映射
        template_group = DomainExtractor._map_to_template_group(primary)

        return {
            "primary_industry": primary,
            "secondary_industries": secondary,
            "life_situations": life,
            "domain_scores": dict(sorted_industries),
            "template_group": template_group,
        }

    @staticmethod
    def _map_to_template_group(industry: str) -> str:
        """将行业映射到模板组"""
        mapping = {
            "餐饮": "餐饮组",
            "物流配送": "物流组",
            "零售小店": "小店主组",
            "制造工厂": "蓝领组",
            "销售服务": "销售组",
            "家政护理": "家政组",
            "美容美发": "手艺人组",
            "汽修汽配": "手艺人组",
            "建筑装修": "手艺人组",
            "教育培训": "知识组",
            "互联网技术": "技术组",
            "农牧养殖": "本地服务组",
            "医疗健康": "知识组",
            "普通职场": "职场组",
            "自由职业": "斜杠组",
        }
        return mapping.get(industry, "通用组")
