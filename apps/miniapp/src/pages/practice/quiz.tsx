import { useEffect, useRef, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Button, Input } from '@tarojs/components'
import {
  answerPractice, fetchPracticeQuestions, finishPractice, addFavorite, removeFavorite, fetchFavorites,
  type AnswerRes, type Question,
} from '../../services/api'
import QuestionOptions, { type OptState } from '../../components/QuestionOptions'
import StateView from '../../components/StateView'
import './quiz.scss'
import { useThemeClass } from '../../services/theme'

interface Answered {
  userAnswer: string | string[]
  correct: boolean
  answerKeys?: string[]
  analysis?: string | null
  duration?: number
}

const typeLabel = (t: Question['type']) => (t === 'SINGLE' ? '单选题' : t === 'MULTIPLE' ? '多选题' : '判断题')

export default function PracticeQuiz() {
  const themeCls = useThemeClass()
  const router = useRouter()
  const pid = Number(router.params.practiceId || 0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Record<number, Answered>>({})
  const [pending, setPending] = useState<{ [qid: number]: string | string[] }>({})
  const [favs, setFavs] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [judging, setJudging] = useState(false)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [noteDraft, setNoteDraft] = useState('')
  const qStartAt = useRef<number>(Date.now())

  useEffect(() => {
    fetchPracticeQuestions(pid).then((r) => {
      setQuestions(r.questions)
      const rec: Record<number, Answered> = {}
      for (const a of r.answered) {
        if (a.correct !== null) {
          rec[a.questionId] = {
            userAnswer: a.userAnswer ?? [],
            correct: a.correct,
            answerKeys: a.answerKeys ?? [],
            analysis: a.analysis ?? null,
            duration: a.duration ?? undefined,
          }
        }
      }
      setResults(rec)
      setLoading(false)
      qStartAt.current = Date.now()
    }).catch((e) => {
      Taro.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
      setLoading(false)
    })
    fetchFavorites().then((list) => setFavs(new Set(list.map((f) => f.questionId)))).catch(() => {})
  }, [pid])

  const q = questions[idx]
  const qid = q?.id
  const answered = qid != null && !!results[qid]
  const isMulti = q?.type === 'MULTIPLE'
  const isFav = qid != null && favs.has(qid)

  // 本场练习累计正确率（用于三列统计第二列）
  const doneCount = Object.values(results).length
  const correctTotal = Object.values(results).filter((r) => r.correct).length
  const sessionAccuracy = doneCount ? Math.round((correctTotal / doneCount) * 100) : 0

  const applyResult = (questionId: number, answer: string | string[], res: AnswerRes) => {
    const duration = Math.max(1, Math.round((Date.now() - qStartAt.current) / 1000))
    setResults((prev) => ({
      ...prev,
      [questionId]: { userAnswer: answer, correct: res.correct, answerKeys: res.answerKeys, analysis: res.analysis, duration },
    }))
    setPending((prev) => ({ ...prev, [questionId]: answer }))
  }

  const submitSingle = async (qid: number, key: string) => {
    setJudging(true)
    try {
      const res = await answerPractice(pid, { questionId: qid, answer: key })
      applyResult(qid, key, res)
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '提交失败', icon: 'none' })
    } finally {
      setJudging(false)
    }
  }

  const submitMulti = async (qid: number) => {
    const cur = (pending[qid] as string[]) || []
    if (cur.length === 0) { Taro.showToast({ title: '请至少选择一项', icon: 'none' }); return }
    setJudging(true)
    try {
      const res = await answerPractice(pid, { questionId: qid, answer: cur })
      applyResult(qid, cur, res)
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '提交失败', icon: 'none' })
    } finally {
      setJudging(false)
    }
  }

  const onOptionTap = (key: string) => {
    if (!qid || answered || judging) return
    if (isMulti) {
      const cur = (pending[qid] as string[]) || []
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
      setPending({ ...pending, [qid]: next })
    } else {
      void submitSingle(qid, key)
    }
  }

  const optCls = (key: string): OptState => {
    if (!answered || !results[qid!].answerKeys) return ''
    const answerKeys = results[qid!].answerKeys!
    const picked = results[qid!].userAnswer
    const pickedArr = Array.isArray(picked) ? picked : [picked]
    if (answerKeys.includes(key)) return 'correct'
    if (pickedArr.includes(key)) return 'wrong'
    return 'dim'
  }

  const favToggle = async () => {
    if (!qid) return
    const next = new Set(favs)
    try {
      if (next.has(qid)) { await removeFavorite(qid); next.delete(qid) }
      else { await addFavorite(qid); next.add(qid) }
      setFavs(next)
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: 'none' })
    }
  }

  const goNav = (nextIdx: number) => {
    setIdx(nextIdx)
    qStartAt.current = Date.now()
    setNoteDraft(notes[questions[nextIdx]?.id] ?? '')
  }

  const saveNote = () => {
    if (!qid) return
    const t = noteDraft.trim()
    if (!t) { Taro.showToast({ title: '先写点什么吧', icon: 'none' }); return }
    setNotes((prev) => ({ ...prev, [qid]: t }))
    Taro.showToast({ title: '笔记已保存', icon: 'success' })
  }

  const doFinish = async () => {
    try {
      const r = await finishPractice(pid)
      Taro.redirectTo({
        url: `/pages/practice/result?practiceId=${pid}&correct=${r.correctCount}&total=${r.totalCount}&wrong=${r.wrongCount}&accuracy=${r.accuracy}`,
      })
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '结束失败', icon: 'none' })
    }
  }

  if (loading) return <View className={'page ' + themeCls}><StateView text='加载中…' /></View>
  if (!q) return <View className={'page ' + themeCls}><StateView text='暂无题目' /></View>

  const curPending = (pending[qid] as string[]) || []
  const optState = (key: string): OptState =>
    !answered && isMulti && curPending.includes(key) ? 'picked' : optCls(key)

  // 答题后统计：易错项 = 答错时展示用户选错的第一个 key
  const res = results[qid]
  const pickedArr = Array.isArray(res?.userAnswer) ? (res!.userAnswer as string[]) : res ? [res.userAnswer as string] : []
  const wrongKey = res && !res.correct ? pickedArr[0] : ''

  return (
    <View className={'page ' + themeCls}>
      {/* 顶部：题号进度 + 题型徽章 + 进度条 */}
      <View className='row between topbar'>
        <Text className='idx'>第 {idx + 1} / {questions.length} 题</Text>
        <Text className='type-tag'>{typeLabel(q.type)}</Text>
      </View>
      <View className='progress'>
        <View className='progress-fill' style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </View>

      <View className='card'>
        <Text className='q-content'>{q.content}</Text>
      </View>

      <View className='card card-options'>
        <QuestionOptions options={q.options} getState={optState}
          onSelect={(key) => onOptionTap(key)} />

        {isMulti && !answered && curPending.length > 0 && (
          <Button className='confirm-btn' hoverClass='button-hover' loading={judging} onClick={() => void submitMulti(qid)}>提交本题</Button>
        )}
      </View>

      {answered && (
        <View className='card'>
          {/* 正确答案 / 你的答案 对比 */}
          <View className='answer-compare'>
            <View className='compare-item'>
              <Text>正确答案</Text>
              <Text className={'compare-value ' + (res.correct ? 'ok' : 'no')}>{(res.answerKeys ?? []).join(',')}</Text>
            </View>
            <View className='compare-item'>
              <Text>你的答案</Text>
              <Text className={'compare-value ' + (res.correct ? 'ok' : 'no')}>{pickedArr.join(',') || '未作答'}</Text>
            </View>
          </View>

          {/* 三列统计：答题时间 / 正确率 / 易错项 */}
          <View className='stats-row'>
            <View className='stat-item'>
              <Text className='stat-num green'>{res.duration ?? '-'}<Text className='stat-unit'>秒</Text></Text>
              <Text className='stat-label'>答题时间</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-num green'>{sessionAccuracy}%</Text>
              <Text className='stat-label'>本次正确率</Text>
            </View>
            <View className='stat-item'>
              <Text className={'stat-num ' + (wrongKey ? 'red' : '')}>{wrongKey || '无'}</Text>
              <Text className='stat-label'>易错项</Text>
            </View>
          </View>
        </View>
      )}

      {answered && res.analysis && (
        <View className='card analysis'>
          <View className='analysis-head'>解析</View>
          <Text className='analysis-text'>{res.analysis}</Text>

          {/* 耎点：题目分类 */}
          <View className='kaodian'>
            <Text className='label'>考点</Text>
            <Text className='kaodian-tag'>{q.categoryName || '综合'}</Text>
          </View>

          {/* 题目整理：笔记 */}
          <View className='note-section'>
            <Text className='note-title'>题目整理</Text>
            <View className='note-row'>
              <Input
                className='note-input'
                value={noteDraft}
                placeholder='记下你的思考…'
                onInput={(e) => setNoteDraft(e.detail.value)}
              />
              <Button className='note-btn' hoverClass='button-hover' onClick={saveNote}>添加笔记</Button>
            </View>
          </View>
        </View>
      )}

      <View className='row between bottom-bar'>
        {idx > 0 && <Button className='nav-btn' hoverClass='button-hover' onClick={() => goNav(idx - 1)}>上一题</Button>}
        <Button className='fav-btn' hoverClass='button-hover' onClick={() => void favToggle()}>{isFav ? '★ 已收藏' : '☆ 收藏'}</Button>
        {idx < questions.length - 1
          ? <Button className='nav-btn primary' hoverClass='button-hover' onClick={() => goNav(idx + 1)}>下一题</Button>
          : <Button className='nav-btn primary' hoverClass='button-hover' onClick={() => void doFinish()}>完成</Button>}
      </View>
    </View>
  )
}
