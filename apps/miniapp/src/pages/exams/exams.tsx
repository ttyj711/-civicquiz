import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchExams, type Exam } from '../../services/api'
import StateView from '../../components/StateView'
import './exams.scss'
import { parseTag } from '../../utils/tag'
import { useThemeClass } from '../../services/theme'

export default function ExamsPage() {
  const themeCls = useThemeClass()
  const [exams, setExams] = useState<Exam[]>([])
  const load = async () => {
    try { setExams(await fetchExams()) } catch (e) {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    }
  }
  useDidShow(() => { load() })

  const go = (id: number) => Taro.navigateTo({ url: `/pages/exams/detail?id=${id}` })

  return (
    <View className={'page ' + themeCls}>
      <Text className='page-title'>模拟考试</Text>
      {exams.map((e) => (
        <View key={e.id} className='card exam-card'>
          <View className='card-ico' onClick={() => go(e.id)}>📝</View>
          <View className='flex1' onClick={() => go(e.id)}>
            <View className='title'>{parseTag(e.name)}</View>
            <View className='sub mt8'>{e.questionCount} 题 · {e.duration} 分钟 · {Number(e.totalScore)} 分</View>
            {e.description ? <View className='sub mt8'>{e.description}</View> : null}
          </View>
          <Button className='go-btn soft-go' hoverClass='button-hover' onClick={() => go(e.id)}>开始</Button>
        </View>
      ))}
      {exams.length === 0 && <StateView text='暂无已发布的考试' />}
    </View>
  )
}
