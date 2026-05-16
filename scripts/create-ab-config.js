// 创建 A/B 测试配置文件
const fs = require('fs');
const path = require('path');

const config = {
  abTest: {
    enabled: true,
    versions: {
      A: {
        title: "你散落的能力碎片，可能早就够开一门课了",
        subtitle: "12年讲台 + 日更3年 + 提分15分 = 作文训练营创始人？AI帮你发现你没看见的自己",
        cta: "免费试用 →"
      },
      B: {
        title: "你可能会发现——你早就会了",
        subtitle: "不是让你学新东西，是帮你看见已经长在身上的能力。碎片输入 → AI融合 → 发现隐藏的你可能",
        cta: "看看我有什么 →"
      },
      C: {
        title: "为什么你学了那么多，还是不知道自己会什么？",
        subtitle: "因为能力是碎片状的。AI帮你把散落的经验、技能、洞察拼成完整的自己",
        cta: "拼图我的能力 →"
      }
    },
    bucketing: {
      algorithm: "hash-mod",
      split: [50, 50] // A: 50%, B: 50%
    },
    tracking: {
      events: ["page_view", "cta_click", "register_start", "first_fragment_add"]
    }
  }
};

const outputPath = path.join(__dirname, '..', 'frontend', 'public', 'ab-config.json');
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf8');
console.log('✅ A/B测试配置文件已创建:', outputPath);
