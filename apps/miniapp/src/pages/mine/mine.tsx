import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { fetchStats, fetchUserExams, type UserExamItem, type UserStats } from '../../services/api'
import { ensureLogin } from '../../utils/auth'
import './mine.scss'
import { loadTheme, saveTheme, type ThemeKey } from '../../services/theme'

const fmtTime = (s: string) => (s ? s.replace('T', ' ').slice(5, 16) : '')

export default function MinePage() {
  const [nick, setNick] = useState('')
  const [stats, setStats] = useState<UserStats | null>(null)
  const [records, setRecords] = useState<UserExamItem[]>([])
  const [active, setActive] = useState<UserExamItem[]>([])
  const [theme, setTheme] = useState<ThemeKey>(() => loadTheme())

  const themeCls = theme === 'b' ? 'theme-b' : ''
  const switchTheme = (t: ThemeKey) => { saveTheme(t); setTheme(t) }

  const load = async () => {
    try {
      const u = await ensureLogin()
      setNick(u.nickname)
      const [s, exams] = await Promise.all([fetchStats(), fetchUserExams()])
      setStats(s)
      setRecords(exams)
      setActive(exams.filter((e) => e.status === 1))
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    }
  }
  // useDidShow 首次展示即触发，无需再叠加 useEffect（避免首屏双请求）
  useDidShow(() => { load() })

  // 金刚区：浅底块 + 语义色数字
  const entries = [
    { label: '错题本', value: stats?.wrongCount ?? 0, url: '/pages/wrong/wrong', icon: '📕', color: 'var(--danger)', soft: 'var(--danger-soft)' },
    { label: '收藏夹', value: stats?.favoriteCount ?? 0, url: '/pages/favorite/favorite', icon: '⭐', color: 'var(--warn)', soft: 'var(--warn-soft)' },
    { label: '累计答题', value: stats?.totalAnswered ?? 0, url: '', icon: '✏️', color: 'var(--primary)', soft: 'var(--primary-soft)' },
    { label: '考试次数', value: stats?.examCount ?? 0, url: '', icon: '📝', color: 'var(--info)', soft: 'var(--info-soft)' },
  ]

  return (
    <View className={'page ' + themeCls}>
      <View className='card head'>
        <View className='avatar'>{nick?.[0] || '考'}</View>
        <View className='flex1'>
          <Text className='head-title'>{nick || '备考用户'}</Text>
          <Text className='head-sub'>累计正确率 {stats?.totalAccuracy ?? 0}% · 平均分 {stats?.avgExamScore ?? 0}</Text>
        </View>
      </View>

      <View className='card stat-grid'>
        {entries.map((e) => (
          <View key={e.label} className={`stat-item ${e.url ? 'clickable' : ''}`}
            onClick={() => e.url && Taro.navigateTo({ url: e.url })}>
            <View className='stat-icon' style={{ background: e.soft }}>{e.icon}</View>
            <Text className='num' style={{ color: e.color }}>{e.value}</Text>
            <Text className='sub'>{e.label}</Text>
          </View>
        ))}
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
      </View>

      {active.length > 0 && (
        <View className='card'>
          <Text className='title mb16'>进行中的考试</Text>
          {active.map((r) => (
            <View key={r.id} className='row between act-item'
              onClick={() => Taro.navigateTo({ url: `/pages/exams/quiz?id=${r.examId}` })}>
              <Text>{r.examName}</Text>
              <Text className='primary'>继续考试 ›</Text>
            </View>
          ))}
        </View>
      )}

      <View className='card'>
        <Text className='title mb16'>历史考试</Text>
        {records.slice(0, 10).map((r) => (
          <View key={r.id} className='row between rec-item'
            onClick={() => r.status === 2 && Taro.navigateTo({ url: `/pages/exams/review?id=${r.id}` })}>
            <View className='flex1'>
              <Text className='rec-name'>{r.examName}</Text>
              <Text className='sub block'>{fmtTime(r.startTime)}</Text>
            </View>
            {r.status === 2
              ? <Text className={`rec-score ${Number(r.score) >= (Number(r.totalScore) || 0) * 0.6 ? 'ok' : 'no'}`}>{r.score} 分</Text>
              : <Text className='primary'>进行中</Text>}
          </View>
        ))}
        {records.length === 0 && (
          <View className='sub' style={{ display: 'block', padding: '8px 0' }}>
            还没有考试记录，去「考试」页参加一次吧
          </View>
        )}
      </View>
    </View>
  )
}
