import { createError } from 'nitro/h3'

export interface WxSession {
  openid: string
  unionid?: string
  dev: boolean
}

/**
 * code 换 openid。
 * 未配置 WX_APPID/WX_APP_SECRET 时进入开发模式：openid = dev_<code>，便于本地联调。
 */
export async function code2session(code: string): Promise<WxSession> {
  const appid = process.env.WX_APPID
  const secret = process.env.WX_APP_SECRET
  if (!appid || !secret) {
    return { openid: `dev_${code}`, dev: true }
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
  const res = await fetch(url)
  const data = (await res.json()) as { openid?: string; unionid?: string; errcode?: number; errmsg?: string }
  if (!data.openid) {
    throw createError({ statusCode: 401, message: `微信登录失败: ${data.errcode ?? ''} ${data.errmsg ?? ''}` })
  }
  return { openid: data.openid, unionid: data.unionid, dev: false }
}
