import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchExamDetail, type ExamDetail } from '../../services/api'
import StateView from '../../components/StateView'
import './detail.scss'
import { useThemeClass } from '../../services/theme'

export default function ExamDetailPage() {
  const themeCls = useThemeClass()
  const router = useRouter()
  const id = Number(router.params.id || 0)
  const [exam, setExam] = useState<ExamDetail | null>(null)

  useEffect(() => {
    fetchExamDetail(id).then(setExam).catch((e) =>
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' }))
  }, [id])

  if (!exam) return <View className={'page ' + themeCls}><StateView text='加载中…' /></View>

  const start = () => {
    Taro.navigateTo({ url: `/pages/exams/quiz?id=${exam.id}` })
  }

  return (
    <View className={'page ' + themeCls}>
      <View className='card'>
        <View className='title'>{exam.name}</View>
        <View className='info-line mt16'>
          <View className='flex1'><Text className='info-num'>{exam.questionCount}</Text><Text className='sub'>题数</Text></View>
          <View className='flex1'><Text className='info-num'>{Number(exam.totalScore)}</Text><Text className='sub'>总分</Text></View>
          <View className='flex1'><Text className='info-num'>{exam.duration}</Text><Text className='sub'>分钟</Text></View>
        </View>
        {exam.description ? <View className='sub mt16'>{exam.description}</View> : null}
      </View>

      <View className='card'>
        <Text className='title mb16'>题型构成</Text>
        {(exam.typeList?.length ? exam.typeList : [{ type: 'SINGLE', count: exam.questionCount }]).map((t) => (
          <View key={t.type} className='row between'>
            <Text>{t.type === 'SINGLE' ? '单选题' : t.type === 'MULTIPLE' ? '多选题' : '判断题'}</Text>
            <Text className='sub'>{t.count} 题</Text>
          </View>
        ))}
      </View>

      <View className='tips card'>
        <Text className='title mb16'>考试须知</Text>
        <Text className='sub'>考试期间不显示答案与解析；交卷后由服务器统一判分。</Text>
        <Text className='sub mt8'>到时会自动交卷，请合理安排时间。</Text>
      </View>

      <Button className='btn-primary' hoverClass='button-hover' onClick={start}>开始考试</Button>
    </View>
  )
}
