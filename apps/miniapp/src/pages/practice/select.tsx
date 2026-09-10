import { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchBankDetail, startPractice, type CategoryNode } from '../../services/api'
import './select.scss'
import { useThemeClass } from '../../services/theme'

const MODES = [
  { key: 'NORMAL', label: '顺序练习', desc: '按题号依次作答' },
  { key: 'RANDOM', label: '随机练习', desc: '随机抽取题目' },
  { key: 'WRONG', label: '错题重练', desc: '只练未掌握的错题' },
  { key: 'FAVORITE', label: '收藏练习', desc: '练习收藏的题目' },
]
const COUNTS = [10, 20, 50]

export default function PracticeSelect() {
  const themeCls = useThemeClass()
  const router = useRouter()
  const bankId = Number(router.params.bankId || 0)
  const bankName = decodeURIComponent(router.params.bankName || '')
  const [cats, setCats] = useState<CategoryNode[]>([])
  const [mode, setMode] = useState('NORMAL')
  const [count, setCount] = useState(20)
  const [loading, setLoading] = useState(false)

  // 分类在进入时后台拉取
  useEffect(() => {
    if (bankId) fetchBankDetail(bankId).then((d) => setCats(d.categories || [])).catch(() => {})
  }, [bankId])

  const start = async () => {
    if (!bankId) { Taro.showToast({ title: '缺少题库', icon: 'none' }); return }
    setLoading(true)
    try {
      const r = await startPractice({ bankId, mode, count })
      Taro.redirectTo({ url: `/pages/practice/quiz?practiceId=${r.practiceId}&total=${r.totalCount}&mode=${mode}` })
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '无法开始', icon: 'none' })
      setLoading(false)
    }
  }

  return (
    <View className={'page ' + themeCls}>
      <View className='card'>
        <Text className='title'>{bankName}</Text>
        <Text className='sub'>{cats.length} 个分类可选</Text>
      </View>

      <View className='card'>
        <Text className='title mb16'>练习模式</Text>
        {MODES.map((m) => (
          <View key={m.key} className={`mode-item ${mode === m.key ? 'active' : ''}`} onClick={() => setMode(m.key)}>
            <View>
              <Text className='mode-name'>{m.label}</Text>
              <Text className='sub block'>{m.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className='card'>
        <Text className='title mb16'>题目数量</Text>
        <View className='row'>
          {COUNTS.map((c) => (
            <View key={c} className={`count-chip ${count === c ? 'active' : ''}`} onClick={() => setCount(c)}>{c} 题</View>
          ))}
        </View>
      </View>

      <Button className='btn-primary' loading={loading} onClick={start}>开始练习</Button>
    </View>
  )
}
