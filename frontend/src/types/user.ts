/** 用户职业方向 */
export type Profession =
  | 'freelancer'      // 自由职业者
  | 'sideHustler'     // 副业探索者
  | 'careerSwitcher'  // 转行准备中
  | 'student'         // 学生/新人
  | 'creator';        // 内容创作者

/** 用户画像 */
export interface UserProfile {
  id: string;
  name: string;
  profession: Profession;
  goals?: string[];
  createdAt: string;
  updatedAt: string;
}