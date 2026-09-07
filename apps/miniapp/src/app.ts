import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { ensureLogin } from './utils/auth'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    // 冷启动静默登录（失败不阻塞首屏，页面拉数据时再兜底）
    ensureLogin().catch((e) => console.warn('[auth] auto login failed', e?.message))
  })

  // children 是将要会渲染的页面
  return children
}

export default App
