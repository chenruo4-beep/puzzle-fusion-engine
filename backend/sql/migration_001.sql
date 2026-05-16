-- 迁移: 添加 fragment_type 到 fragments 表
ALTER TABLE fragments ADD COLUMN fragment_type VARCHAR(20) DEFAULT '技能';

-- 迁移: 添加 profession 和 title 到 fusions 表
ALTER TABLE fusions ADD COLUMN profession VARCHAR(100);
ALTER TABLE fusions ADD COLUMN title VARCHAR(200);