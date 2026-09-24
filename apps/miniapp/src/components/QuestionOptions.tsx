// 通用选项列表组件：练习答题 / 考试作答 / 试卷复盘
import { View, Text } from '@tarojs/components'
import type { QuestionOption } from '../services/api'
import './QuestionOptions.scss'

export type OptState = '' | 'picked' | 'correct' | 'wrong' | 'dim'

interface Props {
  options: QuestionOption[]
  getState?: (key: string) => OptState
  onSelect?: (key: string) => void
  /** chip = 练习/复盘；plain = 考试（同为圆形字母键） */
  variant?: 'chip' | 'plain'
}

export default function QuestionOptions({ options, getState, onSelect, variant = 'chip' }: Props) {
  return (
    <View>
      {options.map((o) => {
        const st = getState?.(o.optionKey) ?? ''
        const cls = ['qopt', variant, st].filter(Boolean).join(' ')
        return (
          <View key={o.id} className={cls} onClick={onSelect ? () => onSelect(o.optionKey) : undefined}>
            <Text className='qopt-key'>{o.optionKey}</Text>
            <Text className='qopt-content'>{o.content}</Text>
            {st === 'correct' && <Text className='qopt-mark ok'>✓</Text>}
            {st === 'wrong' && <Text className='qopt-mark no'>✕</Text>}
          </View>
        )
      })}
    </View>
  )
}
