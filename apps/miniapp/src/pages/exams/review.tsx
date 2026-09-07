import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchUserExamDetail, type UserExamDetail } from '../../services/api'
import QuestionOptions, { type OptState } from '../../components/QuestionOptions'
import StateView from '../../components/StateView'
import './review.scss'
import { useThemeClass } from '../../services/theme'

export default function ExamReviewPage() {
  const themeCls = useThemeClass()
  const router = useRouter()
  const ueid = Number(router.params.id || 0)
  const [detail, setDetail] = useState<UserExamDetail | null>(null)
  const [cur, setCur] = useState(0)

  useEffect(() => {
    fetchUserExamDetail(ueid).then(setDetail).catch((e) =>
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' }))
  }, [ueid])

  if (!detail) return <View className={'page ' + themeCls}><StateView text='加载中…' /></View>
  const qs = detail.questions || []
  if (qs.length === 0) return <View className={'page ' + themeCls}><StateView text='暂无题目数据' /></View>
  const q = qs[cur]
  const ua = q.userAnswer
  const uaArr = ua ? (Array.isArray(ua) ? ua : [ua]) : []
  const ak = q.answerKeys || []

  const optCls = (key: string): OptState => {
    if (ak.includes(key)) return 'correct'
    if (uaArr.includes(key)) return 'wrong'
    return ''
  }

  return (
    <View className={'page ' + themeCls}>
      <View className='row between'>
        <Text className='sub'>第 {cur + 1} / {qs.length} 题 {q.correct ? '· ✓' : '· ✕'}</Text>
        <Text className='score-text'>得分 {Number(q.score) || 0}</Text>
      </View>
      <View className='card'>
        <Text className='q-content'>{q.content}</Text>
        {q.options && (
          <QuestionOptions options={q.options} variant='plain' getState={optCls} />
        )}
        <View className='mt16'>
          <Text className='sub'>你的答案：{uaArr.length ? uaArr.join(',') : '（未作答）'} · 正确答案：{ak.join(',')}</Text>
        </View>
        {q.analysis ? (
          <View className='analysis mt16'>
            <Text className='title mb16'>解析</Text>
            <Text className='sub'>{q.analysis}</Text>
          </View>
        ) : null}
      </View>

      <View className='row between'>
        <Button className='nav-btn' hoverClass='button-hover' disabled={cur === 0} onClick={() => setCur(cur - 1)}>上一题</Button>
        {cur < qs.length - 1
          ? <Button className='nav-btn primary' hoverClass='button-hover' onClick={() => setCur(cur + 1)}>下一题</Button>
          : <Button className='nav-btn ghost' hoverClass='button-hover' onClick={() => Taro.navigateBack()}>返回</Button>}
      </View>
    </View>
  )
}
