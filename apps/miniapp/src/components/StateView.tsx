// 通用状态视图：空状态 / 加载中统一展示（温情文案 + 柔和圆点装饰）
import { View, Text } from '@tarojs/components'

interface Props {
  text: string
}

// 常见空状态的温情文案映射
const WARM_TEXT: Record<string, string> = {
  '暂无已发布的考试': '考试正在路上～\n先去刷题区练练手吧',
  '暂无错题': '太棒了，暂时没有错题！\n保持这个节奏 💪',
  '暂无收藏': '还没有收藏的题目～\n遇到好题记得点亮收藏',
  '暂无题目': '题目准备中，稍后再来看看',
  '加载中…': '正在为你准备内容…',
}

export default function StateView({ text }: Props) {
  const warm = WARM_TEXT[text] || text
  const lines = warm.split('\n')
  return (
    <View className='empty'>
      <View className='empty-dots'>
        <View className='edot d1' />
        <View className='edot d2' />
        <View className='edot d3' />
      </View>
      {lines.map((l, i) => (
        <Text key={i} className='empty-line'>{l}</Text>
      ))}
    </View>
  )
}
