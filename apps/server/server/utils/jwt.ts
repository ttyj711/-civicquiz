import { SignJWT, jwtVerify } from 'jose'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

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
