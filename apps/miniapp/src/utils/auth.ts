import Taro from '@tarojs/taro'
import { getToken, setToken } from '../services/request'
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
    try {
      const r = await Taro.login()
      code = r.code
    } catch {
      // H5 联调降级：固定 dev code 便于服务端建同一用户
      code = 'dev_h5_' + (Taro.getStorageSync('dev_uid') || '001')
    }
    const res = await loginByCode(code)
    setToken(res.token)
    const user = { id: res.user.id, nickname: res.user.nickname }
    Taro.setStorageSync(USER_KEY, user)
    return user
  })().finally(() => { loginPromise = null })

  return loginPromise
}
