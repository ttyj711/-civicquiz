import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchWrong, masterWrong, removeWrong, startPractice, type WrongItem } from '../../services/api'
import StateView from '../../components/StateView'
import './wrong.scss'
import { useThemeClass } from '../../services/theme'

export default function WrongPage() {
  const themeCls = useThemeClass()
  const [items, setItems] = useState<WrongItem[]>([])
  const load = async () => {
    try { setItems(await fetchWrong()) } catch (e) {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    }
  }
  useDidShow(() => { load() })

  const reviewAll = async () => {
    if (!items.length) { Taro.showToast({ title: '暂无错题', icon: 'none' }); return }
    const bankId = items[0].bankId
    try {
      const r = await startPractice({ bankId, mode: 'WRONG', count: Math.min(items.length, 100) })
      Taro.navigateTo({ url: `/pages/practice/quiz?practiceId=${r.practiceId}&total=${r.totalCount}&mode=WRONG` })
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '无法开始', icon: 'none' })
    }
  }

  const markMaster = async (it: WrongItem) => {
    try {
      await masterWrong(it.id)
      Taro.showToast({ title: '已标记掌握', icon: 'success' })
      load()
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: 'none' })
    }
  }
  const del = async (it: WrongItem) => {
    try {
      await removeWrong(it.id)
      load()
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: 'none' })
    }
  }

  return (
    <View className={'page ' + themeCls}>
      <View className='row between head-bar'>
        <Text className='page-title'>错题本（{items.length}）</Text>
        <Button className='review-all' hoverClass='button-hover' onClick={reviewAll}>错题重练</Button>
      </View>
      {items.map((it) => (
        <View key={it.id} className='card'>
          <View className='flex1'>
            <Text className='wrong-content'>{it.content}</Text>
            <View className='row mt8'>
              <Text className='sub'>错 {it.wrongCount} 次</Text>
              {it.mastered ? <Text className='mastered-tag'>已掌握</Text> : null}
            </View>
            {it.analysis ? <Text className='sub block mt8'>解析：{it.analysis}</Text> : null}
          </View>
          <View className='row ops'>
            {!it.mastered && <Button className='op ok' hoverClass='button-hover' onClick={() => markMaster(it)}>掌握了</Button>}
            <Button className='op del' hoverClass='button-hover' onClick={() => del(it)}>移除</Button>
          </View>
        </View>
      ))}
      {items.length === 0 && <StateView text='太棒了，暂无错题' />}
    </View>
  )
}
