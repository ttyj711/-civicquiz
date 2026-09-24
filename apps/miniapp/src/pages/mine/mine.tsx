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

function accOf(r: UserExamItem) {
  const n = r.correctCount + r.wrongCount + r.unansweredCount
  return n ? Math.round((r.correctCount / n) * 100) : 0
}

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
      {/* L2 主卡：身份 + 今日进度（头像弱化） */}
      <View className='card profile-card'>
        <View className='row between'>
          <View className='row profile-id'>
            <View className='avatar-sm'>{nick?.[0] || '考'}</View>
            <View>
              <Text className='profile-name'>{nick || '备考用户'}</Text>
              <Text className='profile-tag'>准备好继续学习了吗？</Text>
            </View>
          </View>
          <Text className='settings-link' onClick={() => Taro.navigateTo({ url: '/pages/mine/settings' })}>设置</Text>
        </View>

        <Text className='block-label'>今日进度</Text>
        <View className='progress'>
          <View className='progress-fill' style={{ width: `${pct}%` }} />
        </View>
        <Text className='sub'>已完成 {todayDone} / {TODAY_TARGET} 题 · {pct}%</Text>

        <Button className='btn-primary mt24' hoverClass='button-hover'
          loading={starting}
          onClick={() => {
            if (ongoing) Taro.navigateTo({ url: `/pages/exams/quiz?id=${ongoing.examId}` })
            else void startRandom()
          }}>
          {ongoing ? '继续答题 →' : '继续学习 →'}
        </Button>
      </View>

      {/* L3 学习数据：网格，非嵌套卡片 */}
      <Text className='section-title'>学习数据</Text>
      <View className='stat-board'>
        <View className='stat-cell'>
          <Text className='stat-num'>{stats?.totalAnswered ?? 0}</Text>
          <Text className='stat-lab'>答题数</Text>
        </View>
        <View className='stat-cell'>
          <Text className='stat-num'>{stats?.totalAccuracy ?? 0}%</Text>
          <Text className='stat-lab'>正确率</Text>
        </View>
        <View className='stat-cell'>
          <Text className='stat-num'>{wrongN}</Text>
          <Text className='stat-lab'>错题</Text>
        </View>
        <View className='stat-cell'>
          <Text className='stat-num'>{stats?.favoriteCount ?? 0}</Text>
          <Text className='stat-lab'>收藏</Text>
        </View>
      </View>

      {/* 错题行动行 */}
      <View className='card action-row' onClick={() => Taro.navigateTo({ url: '/pages/wrong/wrong' })}>
        <View className='flex1'>
          <Text className='title'>错题复习</Text>
          <Text className='sub block mt8'>还有 {wrongN} 道题需要巩固</Text>
        </View>
        <Text className='arrow'>→</Text>
      </View>

      {/* 最近考试 */}
      <Text className='section-title'>最近考试</Text>
      <View className='card'>
        {records.slice(0, 5).map((r) => {
          const total = Number(r.totalScore) || 0
          const score = Number(r.score) || 0
          return (
            <View key={r.id} className='exam-row'
              onClick={() => Taro.navigateTo({ url: `/pages/exams/review?id=${r.id}` })}>
              <View className='flex1'>
                <Text className='exam-name'>{r.examName}</Text>
                <Text className='sub block mt8'>
                  {fmtTime(r.startTime)} · 正确率 {accOf(r)}% · {r.correctCount + r.wrongCount + r.unansweredCount} 题
                </Text>
              </View>
              <Text className={`exam-score ${total && score >= total * 0.6 ? 'ok' : 'no'}`}>{r.score ?? '-'}</Text>
              <Text className='arrow'>→</Text>
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
