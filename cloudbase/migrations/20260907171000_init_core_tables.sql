-- =====================================================================
-- 20260907171000_init_core_tables
-- 在线考试刷题系统 · 核心表结构（14 核心表 + sys_admin 后台账号）
-- 设计原则（对齐 PRD / ER 模型）：
--   1. 题目与选项分离（question -> question_option），选项数量不固定
--   2. 答案与题目分离（question_answer 选项级答案），为多选预留
--   3. 用户答题记录为追加事实表（INSERT only，绝不覆盖）—— AI/统计的数据基础
--   4. 错题/收藏为用户维度，UNIQUE(user_id, question_id)
--   5. 考试固化试卷快照（exam_question），考试开始后不实时抽题
--   6. 用户答案一律 JSONB（"A" / ["A","C"] / "TRUE"）
-- 兼容：CloudBase 迁移目录命名 <14位时间戳>_<name>.sql
-- =====================================================================

-- 通用：updated_at 自动维护
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 一、用户域
-- ---------------------------------------------------------------------

-- 管理员（后台账号，与普通用户分离，不混用业务表）
CREATE TABLE sys_admin (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL,
  nickname      VARCHAR(100),
  status        SMALLINT     NOT NULL DEFAULT 1,          -- 1 启用 / 0 禁用
  last_login_at TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sys_admin_updated_at BEFORE UPDATE ON sys_admin
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 微信用户（openid 为唯一标识，勿用昵称）
CREATE TABLE sys_user (
  id            BIGSERIAL PRIMARY KEY,
  openid        VARCHAR(64)  NOT NULL UNIQUE,
  unionid       VARCHAR(64),
  nickname      VARCHAR(100),
  avatar_url    VARCHAR(500),
  status        SMALLINT     NOT NULL DEFAULT 1,          -- 1 启用 / 0 禁用
  last_login_at TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sys_user_updated_at BEFORE UPDATE ON sys_user
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 二、题库基础数据
-- ---------------------------------------------------------------------

CREATE TABLE question_bank (
  id             BIGSERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  description    TEXT,
  cover_url      VARCHAR(500),
  status         SMALLINT     NOT NULL DEFAULT 1,         -- 1 启用 / 0 禁用
  sort           INTEGER      NOT NULL DEFAULT 0,
  question_count INTEGER      NOT NULL DEFAULT 0,         -- 冗余统计（真实数 = COUNT(question)）
  created_at     TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_question_bank_updated_at BEFORE UPDATE ON question_bank
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 分类：parent_id=0 表示顶级，支持无限层级
CREATE TABLE question_category (
  id         BIGSERIAL PRIMARY KEY,
  bank_id    BIGINT       NOT NULL REFERENCES question_bank(id),
  parent_id  BIGINT       NOT NULL DEFAULT 0,
  name       VARCHAR(100) NOT NULL,
  sort       INTEGER      NOT NULL DEFAULT 0,
  status     SMALLINT     NOT NULL DEFAULT 1,             -- 1 启用 / 0 禁用
  created_at TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_question_category_bank ON question_category(bank_id);
CREATE INDEX idx_question_category_parent ON question_category(parent_id);

CREATE TRIGGER trg_question_category_updated_at BEFORE UPDATE ON question_category
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 题目（最核心表）。type 用枚举编码，第一阶段仅 SINGLE，预留 MULTIPLE/JUDGE
CREATE TABLE question (
  id          BIGSERIAL PRIMARY KEY,
  bank_id     BIGINT        NOT NULL REFERENCES question_bank(id),
  category_id BIGINT        REFERENCES question_category(id),
  type        VARCHAR(20)   NOT NULL DEFAULT 'SINGLE'
              CHECK (type IN ('SINGLE', 'MULTIPLE', 'JUDGE')),
  content     TEXT          NOT NULL,
  analysis    TEXT,                                      -- 解析/答案解析
  difficulty  SMALLINT      NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
  score       NUMERIC(5,2)  NOT NULL DEFAULT 2,
  status      SMALLINT      NOT NULL DEFAULT 1,          -- 1 启用 / 0 禁用（软删）
  source      VARCHAR(100),                              -- 来源（真题年份/书籍等）
  created_at  TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX idx_question_bank ON question(bank_id);
CREATE INDEX idx_question_category ON question(category_id);
CREATE INDEX idx_question_status ON question(status);

CREATE TRIGGER trg_question_updated_at BEFORE UPDATE ON question
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 选项（与题目分离，排序不固定数量）
CREATE TABLE question_option (
  id          BIGSERIAL PRIMARY KEY,
  question_id BIGINT       NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  option_key  VARCHAR(10)  NOT NULL,                     -- A / B / C / D / TRUE / FALSE
  content     TEXT         NOT NULL,
  sort        INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_question_option_question ON question_option(question_id);
-- 同题内 key 唯一（PUT 整组重建依赖唯一约束做 ON CONFLICT）
CREATE UNIQUE INDEX uq_question_option_key ON question_option(question_id, option_key);

CREATE TRIGGER trg_question_option_updated_at BEFORE UPDATE ON question_option
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 答案：question_id -> option_id（多选 = 多行）
CREATE TABLE question_answer (
  id          BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  option_id   BIGINT NOT NULL REFERENCES question_option(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (question_id, option_id)
);
CREATE INDEX idx_question_answer_question ON question_answer(question_id);

-- ---------------------------------------------------------------------
-- 三、刷题会话
-- ---------------------------------------------------------------------

CREATE TABLE practice (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT     NOT NULL REFERENCES sys_user(id),
  bank_id       BIGINT     NOT NULL REFERENCES question_bank(id),
  category_id   BIGINT     REFERENCES question_category(id),
  mode          VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
                CHECK (mode IN ('NORMAL', 'RANDOM', 'WRONG', 'FAVORITE', 'CATEGORY')),
  total_count   INTEGER    NOT NULL DEFAULT 0,
  correct_count INTEGER    NOT NULL DEFAULT 0,
  wrong_count   INTEGER    NOT NULL DEFAULT 0,
  status        SMALLINT   NOT NULL DEFAULT 1,           -- 1 进行中 / 2 已完成
  question_ids  JSONB      NOT NULL DEFAULT '[]',        -- 本次会话固化题序快照
  started_at    TIMESTAMP  NOT NULL DEFAULT now(),
  finished_at   TIMESTAMP,
  created_at    TIMESTAMP  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP  NOT NULL DEFAULT now()
);
CREATE INDEX idx_practice_user ON practice(user_id, started_at DESC);

CREATE TRIGGER trg_practice_updated_at BEFORE UPDATE ON practice
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 错题本（用户维度）
CREATE TABLE user_wrong_question (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT    NOT NULL REFERENCES sys_user(id),
  question_id   BIGINT    NOT NULL REFERENCES question(id),
  wrong_count   INTEGER   NOT NULL DEFAULT 1,
  mastered      BOOLEAN   NOT NULL DEFAULT FALSE,
  last_wrong_at TIMESTAMP NOT NULL DEFAULT now(),
  mastered_at   TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
CREATE INDEX idx_wrong_user ON user_wrong_question(user_id, mastered);

CREATE TRIGGER trg_user_wrong_question_updated_at BEFORE UPDATE ON user_wrong_question
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 收藏（用户维度；取消收藏 = DELETE 即可）
CREATE TABLE user_favorite_question (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT    NOT NULL REFERENCES sys_user(id),
  question_id BIGINT    NOT NULL REFERENCES question(id),
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
CREATE INDEX idx_fav_user ON user_favorite_question(user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 四、考试业务
-- ---------------------------------------------------------------------

CREATE TABLE exam (
  id             BIGSERIAL PRIMARY KEY,
  bank_id        BIGINT       NOT NULL REFERENCES question_bank(id),
  name           VARCHAR(200) NOT NULL,
  description    TEXT,
  duration       INTEGER      NOT NULL DEFAULT 60,       -- 单位：分钟
  total_score    NUMERIC(6,2) NOT NULL DEFAULT 100,
  question_count INTEGER      NOT NULL DEFAULT 0,
  exam_type      VARCHAR(20)  NOT NULL DEFAULT 'FIXED'   -- FIXED 固定组卷 / RANDOM 随机抽题
                 CHECK (exam_type IN ('FIXED', 'RANDOM')),
  status         SMALLINT     NOT NULL DEFAULT 1,        -- 1 发布 / 0 草稿 / 2 下架
  start_at       TIMESTAMP,                              -- 考试窗口（可空）
  end_at         TIMESTAMP,
  created_at     TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_exam_status ON exam(status);

CREATE TRIGGER trg_exam_updated_at BEFORE UPDATE ON exam
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 试卷快照：管理员组卷时固化，考试开始后不实时抽题
CREATE TABLE exam_question (
  id          BIGSERIAL PRIMARY KEY,
  exam_id     BIGINT      NOT NULL REFERENCES exam(id) ON DELETE CASCADE,
  question_id BIGINT      NOT NULL REFERENCES question(id),
  sort        INTEGER     NOT NULL DEFAULT 0,
  score       NUMERIC(5,2) NOT NULL DEFAULT 2,
  created_at  TIMESTAMP   NOT NULL DEFAULT now(),
  UNIQUE (exam_id, question_id)
);
CREATE INDEX idx_exam_question_exam ON exam_question(exam_id, sort);

-- 用户考试记录（status: 1 进行中 / 2 已交卷）
CREATE TABLE user_exam (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT       NOT NULL REFERENCES sys_user(id),
  exam_id          BIGINT       NOT NULL REFERENCES exam(id),
  status           SMALLINT     NOT NULL DEFAULT 1,
  total_score      NUMERIC(6,2) NOT NULL DEFAULT 0,
  score            NUMERIC(6,2),
  correct_count    INTEGER      NOT NULL DEFAULT 0,
  wrong_count      INTEGER      NOT NULL DEFAULT 0,
  unanswered_count INTEGER      NOT NULL DEFAULT 0,
  start_time       TIMESTAMP    NOT NULL DEFAULT now(),
  submit_time      TIMESTAMP,
  duration         INTEGER,                              -- 实际用时（秒）
  created_at       TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_exam_user ON user_exam(user_id, start_time DESC);
CREATE INDEX idx_user_exam_exam ON user_exam(exam_id);

CREATE TRIGGER trg_user_exam_updated_at BEFORE UPDATE ON user_exam
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 用户考试逐题答案（交卷前只存答案，交卷后补判分结果）
CREATE TABLE user_exam_answer (
  id           BIGSERIAL PRIMARY KEY,
  user_exam_id BIGINT       NOT NULL REFERENCES user_exam(id) ON DELETE CASCADE,
  question_id  BIGINT       NOT NULL REFERENCES question(id),
  user_answer  JSONB,
  correct      BOOLEAN,
  score        NUMERIC(5,2),
  answered_at  TIMESTAMP    NOT NULL DEFAULT now(),
  UNIQUE (user_exam_id, question_id)
);
CREATE INDEX idx_user_exam_answer_exam ON user_exam_answer(user_exam_id);

-- 答题事实表：每次作答 INSERT，绝不覆盖（统计/AI 数据基础）
-- 置于最后：同时引用 practice / exam，二者已就绪
CREATE TABLE user_question_record (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT       NOT NULL REFERENCES sys_user(id),
  question_id BIGINT       NOT NULL REFERENCES question(id),
  practice_id BIGINT       REFERENCES practice(id),      -- 刷题来源（可空：纯考试答题）
  exam_id     BIGINT       REFERENCES exam(id),          -- 考试来源（可空：刷题答题）
  user_answer JSONB,                                     -- "A" / ["A","C"] / "TRUE"
  correct     BOOLEAN,
  duration    INTEGER,                                   -- 单题耗时（秒）
  answered_at TIMESTAMP    NOT NULL DEFAULT now(),
  created_at  TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_ur_user ON user_question_record(user_id, answered_at DESC);
CREATE INDEX idx_ur_question ON user_question_record(question_id);
CREATE INDEX idx_ur_practice ON user_question_record(practice_id);
CREATE INDEX idx_ur_exam ON user_question_record(exam_id);
