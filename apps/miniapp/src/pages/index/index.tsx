import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import {
  fetchBanks, fetchStats, fetchUserExams, fetchWrong, fetchFavorites,
  startPractice, type Bank, type UserStats, type UserExamItem, type WrongItem, type FavoriteItem,
} from '../../services/api'
import { ensureLogin } from '../../utils/auth'
import './index.scss'
import { useThemeClass } from '../../services/theme'

const DOT_COLORS = ['var(--primary)', 'var(--success)', 'var(--warn)', 'var(--info)', 'var(--danger)', 'var(--info)']
const TODAY_TARGET = 20

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
  const [ongoing, setOngoing] = useState<UserExamItem | null>(null)
  const [wrongs, setWrongs] = useState<WrongItem[]>([])
  const [favs, setFavs] = useState<FavoriteItem[]>([])
  const [firstBankId, setFirstBankId] = useState(0)
  const [starting, setStarting] = useState(false)

  const load = async () => {
    try {
      const u = await ensureLogin()
      setNick(u.nickname)
      const [b, s, exams, wrongList, favList] = await Promise.all([
        fetchBanks(), fetchStats(), fetchUserExams(), fetchWrong(), fetchFavorites(),
      ])
      setBanks(b)
      setStats(s)
      setOngoing(exams.find((e) => e.status === 1) || null)
      setWrongs(wrongList.filter((w) => !w.mastered))
      setFavs(favList)
      setFirstBankId(b[0]?.id || 0)
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    }
  }

  useDidShow(() => { load() })

  const goBank = (id: number, name: string) =>
    Taro.navigateTo({ url: `/pages/practice/select?bankId=${id}&bankName=${encodeURIComponent(name)}` })

  const startRandom = async () => {
    if (!firstBankId || starting) return
    setStarting(true)
    try {
      const r = await startPractice({ bankId: firstBankId, mode: 'RANDOM', count: 20 })
      Taro.navigateTo({ url: `/pages/practice/quiz?practiceId=${r.practiceId}` })
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '开始失败', icon: 'none' })
    } finally {
      setStarting(false)
    }
  }

  const startWrongPractice = async () => {
    if (!wrongs.length || starting) return
    setStarting(true)
    try {
      // 服务端按 bankId 过滤错题，须用错题自身 bankId
      const r = await startPractice({ bankId: wrongs[0].bankId, mode: 'WRONG', count: Math.min(wrongs.length, 20) })
      Taro.navigateTo({ url: `/pages/practice/quiz?practiceId=${r.practiceId}` })
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '开始失败', icon: 'none' })
    } finally {
      setStarting(false)
    }
  }

  const startFavPractice = async () => {
    if (!favs.length || starting) return
    setStarting(true)
    try {
      const r = await startPractice({ bankId: favs[0].bankId, mode: 'FAVORITE', count: Math.min(favs.length, 20) })
      Taro.navigateTo({ url: `/pages/practice/quiz?practiceId=${r.practiceId}` })
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '开始失败', icon: 'none' })
    } finally {
      setStarting(false)
    }
  }

  const todayDone = stats?.todayAnswered ?? 0
  const pct = Math.min(100, Math.round((todayDone / TODAY_TARGET) * 100))
  const wrongN = wrongs.length
  const favN = favs.length

  return (
    <View className={'page ' + themeCls}>
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
        <View className='row between mb12'>
          <Text className='title'>今日任务</Text>
          <Text className='sub'>{todayDone} / {TODAY_TARGET} 题</Text>
        </View>
        <View className='progress'>
          <View className='progress-fill' style={{ width: `${pct}%` }} />
        </View>
        <View className='row between'>
          <Text className='sub'>完成 {pct}%</Text>
          <Text className='sub'>正确率 {stats?.todayAccuracy ?? 0}% · 错题 {wrongN}</Text>
        </View>
      </View>

      <View className='card'>
        <Text className='title mb12'>继续学习</Text>
        {ongoing ? (
          <>
            <Text className='sub block mb12'>上次做到：{ongoing.examName}</Text>
            <Button className='btn-primary' hoverClass='button-hover'
              onClick={() => Taro.navigateTo({ url: `/pages/exams/quiz?id=${ongoing.examId}` })}>
              继续答题 →
            </Button>
          </>
        ) : (
          <>
            <Text className='sub block mb12'>开始今天的练习 · 随机练习 20 题</Text>
            <Button className='btn-primary' hoverClass='button-hover' loading={starting} onClick={() => void startRandom()}>
              开始刷题
            </Button>
          </>
        )}
      </View>

      <View className='card'>
        <Text className='title mb12'>今日建议</Text>
        <View className='suggest-item' onClick={() => void startWrongPractice()}>
          <View className='s-dot danger'>🔴</View>
          <View className='flex1'>
            <Text className='s-title'>错题复习</Text>
            <Text className='sub'>{wrongN} 道待巩固</Text>
          </View>
          <Text className='go'>去复习</Text>
        </View>
        <View className='suggest-item' onClick={() => void startFavPractice()}>
          <View className='s-dot warn'>⭐</View>
          <View className='flex1'>
            <Text className='s-title'>收藏题</Text>
            <Text className='sub'>{favN} 道</Text>
          </View>
          <Text className='go'>去练习</Text>
        </View>
        <View className='suggest-item' onClick={() => void startRandom()}>
          <View className='s-dot ok'>📝</View>
          <View className='flex1'>
            <Text className='s-title'>继续刷题</Text>
            <Text className='sub'>随机练习 20 题</Text>
          </View>
          <Text className='go'>开始</Text>
        </View>
      </View>

      <View className='card'>
        <Text className='title mb16'>开始学习</Text>
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
        <Button className='btn-ghost' hoverClass='button-hover' onClick={() => Taro.switchTab({ url: '/pages/banks/banks' })}>开始刷题</Button>
        <Button className='btn-ghost' hoverClass='button-hover' onClick={() => Taro.switchTab({ url: '/pages/exams/exams' })}>模拟考试</Button>
      </View>
    </View>
  )
}
