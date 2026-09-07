// 全局枚举字典（题库/题目/考试/记录共用的显示映射，消除各页散落定义）

/** 题型文案 */
export const TYPE_LABEL: Record<string, string> = { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断' }

/** 题型标签色 */
export const TYPE_COLOR: Record<string, string> = { SINGLE: 'blue', MULTIPLE: 'purple', JUDGE: 'orange' }

/** 考试状态：0 草稿 / 1 发布 / 2 下架 */
export const EXAM_STATUS: Record<number, { c: string; t: string }> = {
  0: { c: 'default', t: '草稿' },
  1: { c: 'green', t: '发布' },
  2: { c: 'orange', t: '下架' },
}

/** 考试记录状态：1 进行中 / 2 已交卷 */
export const RECORD_STATUS: Record<number, { c: string; t: string }> = {
  1: { c: 'processing', t: '进行中' },
  2: { c: 'success', t: '已交卷' },
}
