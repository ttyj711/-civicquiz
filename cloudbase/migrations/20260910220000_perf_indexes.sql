-- 性能优化：清理冗余索引 + 补齐高频查询组合索引
-- 说明：user_exam_answer 在两次迁移中重复创建了 (user_exam_id, question_id) 唯一索引，
--       且 idx_user_exam_answer_exam 被该唯一索引的最左前缀完全覆盖，属纯写入负担，予以清理。

-- 1. 清理冗余索引（写入路径每答一题都要维护，去掉可降低写放大）
--    注意：user_exam_answer_user_exam_id_question_id_key 是唯一约束（非普通索引），
--    由后续迁移新增的 uq_user_exam_answer 唯一索引完全等价，可安全移除该约束。
ALTER TABLE public.user_exam_answer
  DROP CONSTRAINT IF EXISTS user_exam_answer_user_exam_id_question_id_key;
DROP INDEX IF EXISTS public.idx_user_exam_answer_exam;

-- 2. 题库列表：WHERE status = 1 ORDER BY sort, id
CREATE INDEX IF NOT EXISTS idx_question_bank_status_sort
  ON public.question_bank (status, sort, id);

-- 3. 分类树：WHERE bank_id = ? ORDER BY sort
CREATE INDEX IF NOT EXISTS idx_question_category_bank_sort
  ON public.question_category (bank_id, sort);

-- 4. 题目列表（用户端按题库/分类取题）：bank_id + status 组合
CREATE INDEX IF NOT EXISTS idx_question_bank_status
  ON public.question (bank_id, status);

-- 5. 考试列表：WHERE status = 1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_exam_status_created
  ON public.exam (status, created_at DESC);

-- 6. 学情统计：user_exam 按用户过滤已交卷（status = 2）
CREATE INDEX IF NOT EXISTS idx_user_exam_user_status
  ON public.user_exam (user_id, status);

-- 7. 管理端错题率统计：按题目聚合答题记录
CREATE INDEX IF NOT EXISTS idx_uqr_question_correct
  ON public.user_question_record (question_id, correct);
