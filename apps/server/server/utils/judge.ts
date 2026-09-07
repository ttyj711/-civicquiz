/** 单选/多选通用判题：key 集合完全一致即正确 */
export function judge(userAnswer: string | string[], correctKeys: string[]): boolean {
  const user = (Array.isArray(userAnswer) ? userAnswer : [userAnswer]).map((s) => String(s).trim().toUpperCase()).sort()
  const correct = correctKeys.map((s) => s.trim().toUpperCase()).sort()
  if (user.length !== correct.length) return false
  return user.every((k, i) => k === correct[i])
}

/** 归一化用户答案为 key 数组 */
export function normalizeKeys(userAnswer: string | string[]): string[] {
  return (Array.isArray(userAnswer) ? userAnswer : [userAnswer]).map((s) => String(s).trim().toUpperCase())
}
