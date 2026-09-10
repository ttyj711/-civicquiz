import { definePlugin } from 'nitro'

/**
 * 启动期环境自检：生产环境缺失关键变量时直接拒绝启动（fail fast），
 * 避免带着可预测的默认密钥上线。
 */
export default definePlugin(() => {
  if (process.env.NODE_ENV !== 'production') return

  const missing: string[] = []
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET')
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL')

  if (missing.length) {
    console.error(
      `[security] 生产环境缺少必需的环境变量：${missing.join(', ')}。已拒绝启动。`
    )
    process.exit(1)
  }

  if (!process.env.WX_APPID || !process.env.WX_APP_SECRET) {
    console.warn('[warn] 未配置 WX_APPID/WX_APP_SECRET，微信登录将走 dev 降级模式（不可用于生产）')
  }
})
