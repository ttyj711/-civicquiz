import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchBanks, fetchStats, type Bank, type UserStats } from '../../services/api'
import { ensureLogin } from '../../utils/auth'
import './index.scss'
import { useThemeClass } from '../../services/theme'

/** 题库入口彩点：按索引循环取色，视觉分区更清晰 */
const DOT_COLORS = ['var(--primary)', 'var(--success)', 'var(--warn)', 'var(--info)', 'var(--danger)', 'var(--info)']

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export default function IndexPage() {
  const themeCls = useThemeClass()
  const [banks, setBanks] = useState<Bank[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [nick, setNick] = useState('')

  const load = async () => {
    try {
      const u = await ensureLogin()
      setNick(u.nickname)
      const [b, s] = await Promise.all([fetchBanks(), fetchStats()])
      setBanks(b)
      setStats(s)
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    }
  }

  // useDidShow 首次展示即触发，无需再叠加 useEffect（避免首屏双请求）
  useDidShow(() => { load() })

  const goBank = (id: number, name: string) =>
    Taro.navigateTo({ url: `/pages/practice/select?bankId=${id}&bankName=${encodeURIComponent(name)}` })

  return (
    <View className={'page ' + themeCls}>
      {/* Hero：问候 + 学习数据一屏呈现 */}
      <View className='card hero'>
        <View className='hero-circle' aria-hidden />
        <View className='title'>{greeting()}，{nick || '同学'}</View>
        <Text className='sub'>每天进步一点点，考试稳稳过。</Text>
        <View className='hero-stats'>
          <View className='hero-chip'>
            <Text className='chip-num'>{stats?.todayAnswered ?? 0}</Text>
            <Text className='chip-label'>今日答题</Text>
          </View>
          <View className='hero-chip'>
            <Text className='chip-num'>{stats?.todayAccuracy ?? 0}%</Text>
            <Text className='chip-label'>今日正确率</Text>
          </View>
          <View className='hero-chip'>
            <Text className='chip-num'>{stats?.totalAnswered ?? 0}</Text>
            <Text className='chip-label'>累计答题</Text>
          </View>
        </View>
      </View>

      <View className='card'>
        <View className='title mb16'>开始学习</View>
        {banks.length === 0 ? (
          <View className='empty'>题库准备中，敬请期待</View>
        ) : (
          <View className='quick-grid'>
            {banks.slice(0, 4).map((b, i) => (
              <View key={b.id} className='quick-item' onClick={() => goBank(b.id, b.name)}>
                <View className='quick-head'>
                  <View className='dot' style={{ background: DOT_COLORS[i % DOT_COLORS.length] }} />
                  <Text className='quick-name'>{b.name}</Text>
                </View>
                <Text className='sub'>{b.questionCount} 题</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className='actions'>
        <Button className='btn-primary' hoverClass='button-hover' onClick={() => Taro.switchTab({ url: '/pages/banks/banks' })}>开始刷题</Button>
        <Button className='btn-ghost' hoverClass='button-hover' onClick={() => Taro.switchTab({ url: '/pages/exams/exams' })}>模拟考试</Button>
      </View>
    </View>
  )
}
