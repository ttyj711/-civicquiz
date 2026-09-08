import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchPracticeQuestions } from '../../services/api'
import StateView from '../../components/StateView'
import './result.scss'
import { useThemeClass } from '../../services/theme'

interface PerQuestion {
  questionId: number
  content: string
  categoryName?: string | null
  /** null = 未答 */
  correct: boolean | null
  duration: number
}

export default function PracticeResult() {
  const themeCls = useThemeClass()
  const router = useRouter()
  const pid = Number(router.params.practiceId || 0)
  const [items, setItems] = useState<PerQuestion[] | null>(null)

  useEffect(() => {
    if (!pid) { setItems([]); return }
    fetchPracticeQuestions(pid).then((r) => {
      const answeredMap = new Map(r.answered.map((a) => [a.questionId, a]))
      const list: PerQuestion[] = r.questions.map((q) => {
        const a = answeredMap.get(q.id)
        return {
          questionId: q.id,
          content: q.content,
          categoryName: q.categoryName ?? null,
          correct: a ? (a.correct === null ? null : a.correct) : null,
          duration: 0,
        }
      })
      setItems(list)
    }).catch(() => setItems([]))
  }, [pid])

  if (items === null) return <View className={'page ' + themeCls}><StateView text='生成报告中…' /></View>

  const total = items.length
  const answeredList = items.filter((i) => i.correct !== null)
  const correct = answeredList.filter((i) => i.correct).length
  const wrong = answeredList.length - correct
  const unanswered = total - answeredList.length
  const accuracy = answeredList.length ? Math.round((correct / answeredList.length) * 100) : 0

  // 按分类聚合（考点维度）
  const groups = new Map<string, { total: number; correct: number }>()
  for (const it of items) {
    const key = it.categoryName || '综合'
    const g = groups.get(key) ?? { total: 0, correct: 0 }
    g.total++
    if (it.correct === true) g.correct++
    groups.set(key, g)
  }
  const groupList = [...groups.entries()]

  const cheer = accuracy >= 90 ? '太棒了，实力在线！' : accuracy >= 60 ? '不错，再接再厉！' : '错题都在等你攻克，继续加油'
  const goQuiz = (target: 'all' | 'wrong') => {
    const first = target === 'wrong'
      ? items.findIndex((i) => i.correct === false)
      : items.findIndex((i) => i.correct === null || !i.correct)
    if (first < 0) { Taro.showToast({ title: '没有需要看的题目', icon: 'none' }); return }
    Taro.redirectTo({ url: `/pages/practice/quiz?practiceId=${pid}` })
  }

  return (
    <View className={'page result-page ' + themeCls}>
      {/* 圆环 + 鼓励语 */}
      <View className='card center'>
        <View
          className='ring'
          style={{ background: `conic-gradient(var(--primary) ${accuracy}%, var(--border) 0)` }}
        >
          <View className='ring-inner'>
            <Text className='ring-acc'>{correct}</Text>
            <Text className='ring-label'>答对 / {total}</Text>
          </View>
        </View>
        <Text className='cheer'>{cheer}</Text>

        <View className='meta-row'>
          <Text className='sub'>练习类型：专项智能练习</Text>
        </View>
        <View className='meta-row'>
          <Text className='sub'>交卷时间：{new Date().toLocaleString('zh-CN', { hour12: false })}</Text>
        </View>
      </View>

      {/* 考试情况：四列 */}
      <View className='card'>
        <View className='sec-head blue'>考试情况</View>
        <View className='grid4'>
          <View className='g4-item'><Text className='g4-num'>{total}<Text className='g4-unit'>题</Text></Text><Text className='g4-label'>一共</Text></View>
          <View className='g4-item'><Text className='g4-num ok'>{correct}<Text className='g4-unit'>题</Text></Text><Text className='g4-label'>答对</Text></View>
          <View className='g4-item'><Text className='g4-num no'>{wrong}<Text className='g4-unit'>题</Text></Text><Text className='g4-label'>答错</Text></View>
          <View className='g4-item'><Text className='g4-num'>{unanswered}<Text className='g4-unit'>题</Text></Text><Text className='g4-label'>未答</Text></View>
        </View>
        <View className='total-time'><Text className='sub'>总用时：{answeredList.length} 题已作答 · 正确率 {accuracy}%</Text></View>
      </View>

      {/* 分类小结（每分类一行） */}
      {groupList.map(([name, g]) => (
        <View key={name} className='card cat-row'>
          <View className='sec-head plain'>{name}</View>
          <Text className='sub'>共{g.total}题，答对{g.correct}题，正确率{g.total ? Math.round((g.correct / g.total) * 100) : 0}%</Text>
        </View>
      ))}

      {/* 答题卡：数字圆网格 */}
      <View className='card'>
        <View className='sec-head orange'>答题卡</View>
        <View className='legend'>
          <View className='lg-item'><View className='lg-dot unset' /><Text className='lg-text'>未答</Text></View>
          <View className='lg-item'><View className='lg-dot ok' /><Text className='lg-text'>答对</Text></View>
          <View className='lg-item'><View className='lg-dot no' /><Text className='lg-text'>答错</Text></View>
        </View>
        <View className='sheet'>
          {items.map((it, i) => {
            const cls = it.correct === true ? 'ok' : it.correct === false ? 'no' : 'unset'
            return <View key={it.questionId} className={'sheet-num ' + cls}>{i + 1}</View>
          })}
        </View>
      </View>

      {/* 能力变化：按考点星级 */}
      {groupList.length > 0 && (
        <View className='card'>
          <View className='sec-head orange'>能力变化</View>
          <Text className='sub block mb16'>通过本次练习，以下考点的掌握度评估如下（星星越多代表掌握越好）</Text>
          {groupList.map(([name, g]) => {
            const rate = g.total ? g.correct / g.total : 0
            const stars = Math.max(1, Math.round(rate * 5))
            return (
              <View key={name} className='ability'>
                <View className='ability-head'>
                  <View className='ability-bar' />
                  <Text className='ability-name'>{name}</Text>
                </View>
                <View className='ability-stars'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Text key={i} className={'star ' + (i < stars ? 'on' : '')}>★</Text>
                  ))}
                  <View className='ability-check'>✓</View>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* 底部双按钮 */}
      <View className='row foot-btns'>
        <Button className='foot-btn ghost' hoverClass='button-hover' onClick={() => goQuiz('all')}>全部解析</Button>
        <Button className='foot-btn solid' hoverClass='button-hover' onClick={() => goQuiz('wrong')}>错题解析</Button>
      </View>
    </View>
  )
}
