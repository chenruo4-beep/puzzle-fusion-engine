/** 技能熟练度 */
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** 碎片分类 */
export type FragmentCategory =
  | 'technical'    // 技术类（编程、数据分析等）
  | 'creative'     // 创意类（设计、写作等）
  | 'business'     // 商业类（营销、管理、销售等）
  | 'social'       // 社交类（沟通、教学、咨询等）
  | 'other';       // 其他

/** 能力碎片 */
export interface SkillFragment {
  id: string;
  name: string;
  category: FragmentCategory;
  proficiency: ProficiencyLevel;
  description?: string;
  evidence?: string[];      // 证明材料（项目链接、截图等）
  createdAt: string;
  updatedAt: string;
}