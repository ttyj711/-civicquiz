import { useState } from 'react'
import { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useThemeClass, loadTheme, saveTheme, type ThemeKey } from '../../services/theme'
import { ensureLogin } from '../../utils/auth'
import { fetchStats, type UserStats } from '../../services/api'
import './settings.scss'

export default function SettingsPage() {
  const themeCls = useThemeClass()
  const [theme, setTheme] = useState<ThemeKey>(() => loadTheme())
  const [nick, setNick] = useState('')
  const [stats, setStats] = useState<UserStats | null>(null)

  useDidShow(() => {
    setTheme(loadTheme())
    ensureLogin().then((u) => setNick(u.nickname)).catch(() => {})
    fetchStats().then(setStats).catch(() => {})
  })

  const switchTheme = (t: ThemeKey) => {
    saveTheme(t)
    setTheme(t)
  }

  return (
    <View className={'page ' + themeCls}>
      <View className='card'>
        <Text className='title mb16'>账号</Text>
        <View className='row between info-row'>
          <Text>昵称</Text>
          <Text className='sub'>{nick || '备考用户'}</Text>
        </View>
        <View className='row between info-row'>
          <Text>学习数据</Text>
          <Text className='sub'>累计 {stats?.totalAnswered ?? 0} 题 · 考试 {stats?.examCount ?? 0} 次</Text>
        </View>
      </View>

      <View className='card'>
        <Text className='title mb16'>外观</Text>
        <View className='theme-row'>
          <View className={`theme-opt ${theme === 'a' ? 'on' : ''}`} onClick={() => switchTheme('a')}>
            <View className='swatch'><View className='sw c1' /><View className='sw c2' /></View>
            <Text className='theme-name'>舒缓绿</Text>
            {theme === 'a' && <Text className='theme-check'>✓</Text>}
          </View>
          <View className={`theme-opt ${theme === 'b' ? 'on' : ''}`} onClick={() => switchTheme('b')}>
            <View className='swatch'><View className='sw c3' /><View className='sw c4' /></View>
            <Text className='theme-name'>暖棕</Text>
            {theme === 'b' && <Text className='theme-check'>✓</Text>}
          </View>
        </View>
        <Text className='sub tip'>主题全局生效，并会在下次打开时记住。</Text>
      </View>
    </View>
  )
}
