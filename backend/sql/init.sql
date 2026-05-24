-- 拼拼看Me - 数据库初始化 SQL
-- 适用于 PostgreSQL（开发环境可用 SQLite，SQLAlchemy 会自动处理）

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 日记表
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    tags VARCHAR(500),
    extracted_fragment_ids VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 碎片表
CREATE TABLE IF NOT EXISTS fragments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    journal_id INTEGER REFERENCES journal_entries(id),
    content TEXT NOT NULL,
    tags TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 融合表
CREATE TABLE IF NOT EXISTS fusions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    fragment_ids TEXT NOT NULL,
    result TEXT NOT NULL,
    iteration INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 打卡表
CREATE TABLE IF NOT EXISTS checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    fusion_id INTEGER REFERENCES fusions(id),
    status VARCHAR(50) DEFAULT 'pending',
    feedback TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 模板表
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    prompts TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入 6 个默认模板
INSERT INTO templates (name, description, prompts) VALUES
('今日三件事', '快速记录今天最想做的三件事', '["今天最重要的是什么？","为什么这件事很重要？","完成后你会感觉如何？"]'),
('情绪日记', '觉察并记录今日的情绪流动', '["今天主要情绪是什么？","什么触发了这种情绪？","你是如何应对的？"]'),
('感恩记录', '记录今天值得感恩的人事物', '["今天你感谢什么？","谁让你感到温暖？","你学到了什么？"]'),
('成长复盘', '回顾今天的决策与行动，思考改进方向', '["今天做了什么决定？","结果如何？","下次你会怎么做？"]'),
('关系觉察', '觉察今天与他人的互动模式', '["今天和谁的互动印象深刻？","你的沟通模式是什么？","有什么想对对方说的？"]'),
('自由书写', '不受约束地写下任何你想表达的', '["此刻脑海中浮现的是什么？","有什么想说的？","写完后感觉如何？"]');

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_fragments_user_id ON fragments(user_id);
CREATE INDEX IF NOT EXISTS idx_fusions_user_id ON fusions(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);