import { Text } from '@tarojs/components'

/** 把名称开头的 [标签] 前缀解析为浅底徽章（无前缀时原样返回字符串） */
export function parseTag(name: string) {
  const m = name.match(/^\[([^\]]+)\]\s*([\s\S]*)$/)
  if (!m) return name
  return (
    <>
      <Text className='tag-badge'>{m[1]}</Text>
      {m[2] || name}
    </>
  )
}
