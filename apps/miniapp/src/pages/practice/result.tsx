import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import './result.scss'
import { useThemeClass } from '../../services/theme'

export default function PracticeResult() {
  const themeCls = useThemeClass()
  const router = useRouter()
  const correct = Number(router.params.correct || 0)
  const total = Number(router.params.total || 0)
  const wrong = Number(router.params.wrong || 0)
  const accuracy = Number(router.params.accuracy || 0)

  // 按正确率分级鼓励语
  const cheer = accuracy >= 90 ? '太棒了，实力在线！' : accuracy >= 60 ? '不错，再接再厉！' : '别灰心，错题都在等你攻克'

  return (
    <View className={'page result-page ' + themeCls}>
      <View className='card center'>
        {/* 环形正确率：conic-gradient 绘制进度 */}
        <View
          className='ring'
          style={{ background: `conic-gradient(var(--primary) ${accuracy}%, var(--border) 0)` }}
        >
          <View className='ring-inner'>
            <Text className='ring-acc'>{accuracy}%</Text>
            <Text className='ring-label'>本次正确率</Text>
          </View>
        </View>
        <Text className='cheer'>{cheer}</Text>

        <View className='row nums'>
          <View className='flex1 center'><Text className='num ok'>{correct}</Text><Text className='sub'>答对</Text></View>
          <View className='flex1 center'><Text className='num no'>{wrong}</Text><Text className='sub'>答错</Text></View>
          <View className='flex1 center'><Text className='num'>{total}</Text><Text className='sub'>总数</Text></View>
        </View>
      </View>

      <Button className='btn primary' hoverClass='button-hover' onClick={() => Taro.switchTab({ url: '/pages/banks/banks' })}>继续刷题</Button>
      <Button className='btn ghost' hoverClass='button-hover' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>返回首页</Button>
    </View>
  )
}
