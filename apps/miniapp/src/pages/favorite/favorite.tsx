import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchFavorites, removeFavorite, startPractice, type FavoriteItem } from '../../services/api'
import StateView from '../../components/StateView'
import './favorite.scss'
import { useThemeClass } from '../../services/theme'

export default function FavoritePage() {
  const themeCls = useThemeClass()
  const [items, setItems] = useState<FavoriteItem[]>([])
  const load = async () => {
    try { setItems(await fetchFavorites()) } catch (e) {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    }
  }
  useDidShow(() => { load() })

  const practiceAll = async () => {
    if (!items.length) { Taro.showToast({ title: '暂无收藏', icon: 'none' }); return }
    const bankId = items[0].bankId
    try {
      const r = await startPractice({ bankId, mode: 'FAVORITE', count: Math.min(items.length, 100) })
      Taro.navigateTo({ url: `/pages/practice/quiz?practiceId=${r.practiceId}&total=${r.totalCount}&mode=FAVORITE` })
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '无法开始', icon: 'none' })
    }
  }

  const del = async (it: FavoriteItem) => {
    try {
      await removeFavorite(it.questionId)
      load()
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: 'none' })
    }
  }

  return (
    <View className={'page ' + themeCls}>
      <View className='row between head-bar'>
        <Text className='page-title'>我的收藏（{items.length}）</Text>
        <Button className='practice-all' hoverClass='button-hover' onClick={practiceAll}>收藏练习</Button>
      </View>
      {items.map((it) => (
        <View key={it.id} className='card'>
          <View className='flex1'>
            <Text className='fav-content'>{it.content}</Text>
            {it.analysis ? <Text className='sub block mt8'>解析：{it.analysis}</Text> : null}
          </View>
          <Button className='op del' hoverClass='button-hover' onClick={() => del(it)}>取消收藏</Button>
        </View>
      ))}
      {items.length === 0 && <StateView text='暂无收藏题目' />}
    </View>
  )
}
