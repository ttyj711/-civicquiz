import { SignJWT, jwtVerify } from 'jose'

const DEV_SECRET = 'dev-secret-change-me'

/**
 * 签名密钥：生产环境必须显式配置 JWT_SECRET，否则直接启动失败（避免用可预测密钥签发 token）。
 */
const secret = () => {
  const s = process.env.JWT_SECRET
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[security] 生产环境必须配置 JWT_SECRET 环境变量')
    }
    return new TextEncoder().encode(DEV_SECRET)
  }
  return new TextEncoder().encode(s)
}

export interface UserPayload {
  uid: number
  openid: string
  typ: 'user'
}

export interface AdminPayload {
  aid: number
  username: string
  typ: 'admin'
}

export async function signToken(payload: UserPayload | AdminPayload, expiresIn = '7d') {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret())
}

export async function verifyToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as T
  } catch {
    return null
  }
}
