-- M2 后端 API 所需结构补充
-- 1) practice 固化题目快照（start 时选题，questions/answer 依此为准）
-- 2) user_exam_answer 增加 (user_exam_id, question_id) 唯一约束，支持考试中改答案 upsert

ALTER TABLE practice ADD COLUMN IF NOT EXISTS question_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE user_exam_answer
  ADD CONSTRAINT uq_user_exam_answer UNIQUE (user_exam_id, question_id);
