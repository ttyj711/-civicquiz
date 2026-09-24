import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import './result.scss'
import { useThemeClass } from '../../services/theme'

export default function ExamResult() {
  const themeCls = useThemeClass()
  const router = useRouter()
  const ueid = Number(router.params.ueid || 0)
  const examId = Number(router.params.examId || 0)
  const score = Number(router.params.score || 0)
  const total = Number(router.params.total || 0)
  const correct = Number(router.params.correct || 0)
  const wrong = Number(router.params.wrong || 0)
  const unanswered = Number(router.params.unanswered || 0)
  const accuracy = Number(router.params.accuracy || 0)
  const auto = Number(router.params.auto || 0) === 1
  const bad = total > 0 && score < total * 0.6

  return (
    <View className={'page ' + themeCls}>
      <View className='card center score-card'>
        <Text className={`score ${bad ? 'bad' : ''}`}>{score}</Text>
        <Text className='sub'>总分 {total} · 正确率 {accuracy}%</Text>
        {auto ? <Text className='tag mt8'>已到时自动交卷</Text> : null}
      </View>

      <View className='card'>
        <View className='row nums'>
          <View className='flex1 center'><Text className='num ok'>{correct}</Text><Text className='sub'>答对</Text></View>
          <View className='flex1 center'><Text className='num no'>{wrong}</Text><Text className='sub'>答错</Text></View>
          <View className='flex1 center'><Text className='num'>{unanswered}</Text><Text className='sub'>未答</Text></View>
        </View>
      </View>

      <View className='actions'>
        <Button className='btn danger' onClick={() => Taro.navigateTo({ url: `/pages/exams/review?id=${ueid}&onlyWrong=1` })}>
          查看错题
        </Button>
        {examId > 0 && (
          <Button className='btn ghost' onClick={() => Taro.redirectTo({ url: `/pages/exams/detail?id=${examId}` })}>
            再做一次
          </Button>
        )}
        <Button className='btn primary' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
          返回首页
        </Button>
      </View>
    </View>
  )
}
