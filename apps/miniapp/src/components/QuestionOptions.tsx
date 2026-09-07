// 通用选项列表组件：练习答题 / 考试作答 / 试卷复盘三处复用
import { View, Text } from '@tarojs/components'
import type { QuestionOption } from '../services/api'
import './QuestionOptions.scss'

export type OptState = '' | 'picked' | 'correct' | 'wrong' | 'dim'

interface Props {
  options: QuestionOption[]
  /** 返回每个选项的展示状态（不传则全部为普通态） */
  getState?: (key: string) => OptState
  /** 点击选项回调（不传则纯展示，无按压反馈） */
  onSelect?: (key: string) => void
  /** chip = 圆形字母芯片（练习/复盘）；plain = 字母前缀（考试中） */
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
            <Text className='qopt-key'>{variant === 'plain' ? `${o.optionKey}.` : o.optionKey}</Text>
            <Text className='qopt-content'>{o.content}</Text>
            {st === 'correct' && <Text className='qopt-mark ok'>✓</Text>}
            {st === 'wrong' && <Text className='qopt-mark no'>✕</Text>}
          </View>
        )
      })}
    </View>
  )
}
