import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'

const KEY = 'civicquiz_theme'

export type ThemeKey = 'a' | 'b'

export function loadTheme(): ThemeKey {
  try {
    const t = Taro.getStorageSync(KEY)
    return t === 'b' ? 'b' : 'a'
  } catch {
    return 'a'
  }
}

export function saveTheme(t: ThemeKey) {
  try { Taro.setStorageSync(KEY, t) } catch { /* ignore */ }
}

/**
 * 页面根节点主题 class：方案 A 返回 ''，方案 B 返回 'theme-b'。
 * 在页面组件顶层调用；每次页面显示时自动同步最新主题。
 */
export function useThemeClass(): string {
  const [theme, setTheme] = useState<ThemeKey>(() => loadTheme())
  useDidShow(() => { setTheme(loadTheme()) })
  return theme === 'b' ? 'theme-b' : ''
}
