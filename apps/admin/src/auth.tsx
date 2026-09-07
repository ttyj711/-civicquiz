// 登录态轻量上下文
import { createContext, useCallback, useContext, useState } from 'react'
import { getToken, setToken, clearToken } from './api/http'

export interface AdminUser {
  id: number
  username: string
  nickname: string
}

interface AuthCtx {
  user: AdminUser | null
  login: (u: AdminUser, token: string) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} })
const USER_KEY = 'civicquiz_admin_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 同步从 localStorage 恢复，避免首帧 user=null 导致 RequireAuth 误跳登录页（刷新闪跳 bug）
  const [user, setUser] = useState<AdminUser | null>(() => {
    if (!getToken()) return null
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as AdminUser) : null
    } catch {
      return null
    }
  })

  const login = useCallback((u: AdminUser, token: string) => {
    setToken(token)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    localStorage.removeItem(USER_KEY)
    setUser(null)
    location.href = '/login'
  }, [])

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}
