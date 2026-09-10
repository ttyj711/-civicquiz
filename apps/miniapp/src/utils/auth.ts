import Taro from '@tarojs/taro'
import { getToken, setToken, setReloginHook } from '../services/request'
import { loginByCode } from '../services/api'

const USER_KEY = 'civicquiz_miniapp_user'

export interface MiniUser {
  id: number
  nickname: string
}

let loginPromise: Promise<MiniUser> | null = null

/** 确保已登录：小程序优先走 wx.login 换真实 code（后端 dev 模式直接 dev_<code> 落库） */
export async function ensureLogin(): Promise<MiniUser> {
  const cached = Taro.getStorageSync<MiniUser>(USER_KEY)
  if (getToken() && cached) return cached
  if (loginPromise) return loginPromise

  loginPromise = (async () => {
    let code = ''
    // H5 无微信登录环境：直接使用 dev code（Taro.login 在 H5 下不可用，会挂起/失败）
    if (process.env.TARO_ENV === 'h5') {
      code = 'dev_h5_' + (Taro.getStorageSync('dev_uid') || '001')
    } else {
      try {
        const r = await Taro.login()
        code = r.code
      } catch {
        // 微信登录失败降级：固定 dev code 便于本地联调
        code = 'dev_h5_' + (Taro.getStorageSync('dev_uid') || '001')
      }
    }
    const res = await loginByCode(code)
    setToken(res.token)
    const user = { id: res.user.id, nickname: res.user.nickname }
    Taro.setStorageSync(USER_KEY, user)
    return user
  })().finally(() => { loginPromise = null })

  return loginPromise
}

// 向请求层注册重登钩子：任意接口遇到 401 时静默重登并重试一次
setReloginHook(() => ensureLogin())
