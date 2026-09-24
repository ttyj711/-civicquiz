import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import {
  fetchStats, fetchUserExams, fetchWrong, startPractice,
  type UserExamItem, type UserStats,
} from '../../services/api'
import { ensureLogin } from '../../utils/auth'
import './mine.scss'
import { useThemeClass } from '../../services/theme'

const fmtTime = (s: string) => (s ? s.replace('T', ' ').slice(5, 16) : '')
const TODAY_TARGET = 20

export default function MinePage() {
  const themeCls = useThemeClass()
  const [nick, setNick] = useState('')
  const [stats, setStats] = useState<UserStats | null>(null)
  const [records, setRecords] = useState<UserExamItem[]>([])
  const [ongoing, setOngoing] = useState<UserExamItem | null>(null)
  const [wrongN, setWrongN] = useState(0)
  const [starting, setStarting] = useState(false)

  const load = async () => {
    try {
      const u = await ensureLogin()
      setNick(u.nickname)
      const [s, exams, wrongs] = await Promise.all([fetchStats(), fetchUserExams(), fetchWrong()])
      setStats(s)
      setRecords(exams.filter((e) => e.status === 2))
      setOngoing(exams.find((e) => e.status === 1) || null)
      setWrongN(wrongs.filter((w) => !w.mastered).length)
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    }
  }

  useDidShow(() => { load() })

  const startRandom = async () => {
    if (starting) return
    setStarting(true)
    try {
      const banks = await (await import('../../services/api')).fetchBanks()
      const bankId = banks[0]?.id
      if (!bankId) { Taro.showToast({ title: '暂无题库', icon: 'none' }); return }
      const r = await startPractice({ bankId, mode: 'RANDOM', count: 20 })
      Taro.navigateTo({ url: `/pages/practice/quiz?practiceId=${r.practiceId}` })
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '开始失败', icon: 'none' })
    } finally {
      setStarting(false)
    }
  }

  const todayDone = stats?.todayAnswered ?? 0
  const pct = Math.min(100, Math.round((todayDone / TODAY_TARGET) * 100))

  return (
    <View className={'page ' + themeCls}>
      <View className='card head'>
        <View className='avatar'>{nick?.[0] || '考'}</View>
        <View className='flex1'>
          <Text className='head-title'>{nick || '备考用户'}</Text>
          <Text className='head-sub'>今日已完成 {todayDone} / {TODAY_TARGET} 题</Text>
          <View className='progress'>
            <View className='progress-fill' style={{ width: `${pct}%` }} />
          </View>
        </View>
        <View className='gear' onClick={() => Taro.navigateTo({ url: '/pages/mine/settings' })}>⚙</View>
      </View>

      <View className='card'>
        <Text className='title mb12'>核心指标</Text>
        <View className='metric-grid'>
          <View className='metric core'>
            <Text className='metric-num'>{stats?.totalAnswered ?? 0}</Text>
            <Text className='metric-lab'>累计答题</Text>
          </View>
          <View className='metric core'>
            <Text className='metric-num'>{stats?.totalAccuracy ?? 0}%</Text>
            <Text className='metric-lab'>正确率</Text>
          </View>
          <View className='metric core'>
            <Text className='metric-num'>{wrongN}</Text>
            <Text className='metric-lab'>错题</Text>
          </View>
        </View>
        <View className='metric-grid secondary'>
          <View className='metric'>
            <Text className='metric-num soft'>{stats?.favoriteCount ?? 0}</Text>
            <Text className='metric-lab'>收藏</Text>
          </View>
          <View className='metric'>
            <Text className='metric-num soft'>{stats?.examCount ?? 0}</Text>
            <Text className='metric-lab'>模拟考试</Text>
          </View>
        </View>
      </View>

      <View className='card'>
        <View className='row between mb12'>
          <Text className='title'>错题复习</Text>
          <Button className='mini-danger' hoverClass='button-hover'
            onClick={() => Taro.navigateTo({ url: '/pages/wrong/wrong' })}>去复习</Button>
        </View>
        <Text className='sub'>还有 {wrongN} 道题待巩固</Text>
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
            <Text className='sub block mb12'>开始今天的练习 · 随机 20 题</Text>
            <Button className='btn-primary' hoverClass='button-hover' loading={starting} onClick={() => void startRandom()}>
              开始刷题
            </Button>
          </>
        )}
      </View>

      <View className='card'>
        <Text className='title mb16'>历史考试</Text>
        {records.slice(0, 5).map((r) => {
          const total = Number(r.totalScore) || 0
          const score = Number(r.score) || 0
          const acc = accOf(r)
          return (
            <View key={r.id} className='rec-item'
              onClick={() => Taro.navigateTo({ url: `/pages/exams/review?id=${r.id}` })}>
              <View className='row between mb8'>
                <Text className='rec-name'>{r.examName}</Text>
                <Text className={`rec-score ${total && score >= total * 0.6 ? 'ok' : 'no'}`}>{r.score ?? '-'}</Text>
              </View>
              <Text className='sub block mb8'>{fmtTime(r.startTime)}</Text>
              <View className='rec-kv'>
                <Text className='sub'>正确率 {acc}%</Text>
                <Text className='sub'>{r.correctCount + r.wrongCount + r.unansweredCount} 题</Text>
                <Text className='sub'>{r.duration != null ? `${Math.max(1, Math.round(Number(r.duration) / 60))}′` : '-'}</Text>
                <Text className='go'>查看详情 →</Text>
              </View>
            </View>
          )
        })}
        {records.length === 0 && (
          <Text className='sub empty-line'>还没有考试记录，去「考试」页参加一次吧</Text>
        )}
      </View>
    </View>
  )
}

// 局部辅助：用对/错/未答推正确率（列表接口未带 accuracy 字段）
function accOf(r: UserExamItem) {
  const n = r.correctCount + r.wrongCount + r.unansweredCount
  return n ? Math.round((r.correctCount / n) * 100) : 0
}
