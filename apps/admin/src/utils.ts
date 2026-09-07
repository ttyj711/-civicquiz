// 通用工具函数

/** ISO 时间 → 'YYYY-MM-DD HH:mm:ss'（空值返回 '-'） */
export function formatTime(v?: string | null): string {
  return v ? v.replace('T', ' ').slice(0, 19) : '-'
}
