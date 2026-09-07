import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { fetchBanks, type Bank } from '../../services/api'
import { useThemeClass } from '../../services/theme'
import './banks.scss'
import { parseTag } from '../../utils/tag'

export default function BanksPage() {
  const themeCls = useThemeClass()
  const [banks, setBanks] = useState<Bank[]>([])

  const load = async () => {
    try {
      const b = await fetchBanks()
      setBanks(b)
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    }
  }
  useDidShow(() => { load() })

  const choose = (b: Bank) =>
    Taro.navigateTo({ url: `/pages/practice/select?bankId=${b.id}&bankName=${encodeURIComponent(b.name)}` })

  return (
    <View className={'page ' + themeCls}>
      <Text className='page-title'>选择题库开始刷题</Text>
      {banks.map((b) => (
        <View key={b.id} className='card bank-card' onClick={() => choose(b)}>
          <View className='card-ico'>📚</View>
          <View className='flex1'>
            <View className='title'>{parseTag(b.name)}</View>
            <View className='sub mt8'>{b.description || '暂无描述'}</View>
            <View className='sub mt8'>共 {b.questionCount} 题 · {b.categoryCount} 个分类</View>
          </View>
          <Button className='go-btn soft-go' hoverClass='button-hover'>去刷题</Button>
        </View>
      ))}
    </View>
  )
}
