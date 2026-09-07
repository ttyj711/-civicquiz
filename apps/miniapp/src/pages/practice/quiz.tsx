import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
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
}

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

  useEffect(() => {
    fetchPracticeQuestions(pid).then((r) => {
      setQuestions(r.questions)
      const rec: Record<number, Answered> = {}
      for (const a of r.answered) {
        if (a.correct !== null) {
          rec[a.questionId] = { userAnswer: a.userAnswer ?? [], correct: a.correct }
        }
      }
      setResults(rec)
      setLoading(false)
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

  const applyResult = (questionId: number, answer: string | string[], res: AnswerRes) => {
    setResults((prev) => ({
      ...prev,
      [questionId]: { userAnswer: answer, correct: res.correct, answerKeys: res.answerKeys, analysis: res.analysis },
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

  const doFinish = async () => {
    try {
      const r = await finishPractice(pid)
      Taro.redirectTo({
        url: `/pages/practice/result?correct=${r.correctCount}&total=${r.totalCount}&wrong=${r.wrongCount}&accuracy=${r.accuracy}`,
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

  return (
    <View className={'page ' + themeCls}>
      {/* 顶部：题号 + 题型 + 进度条 */}
      <View className='row between topbar'>
        <Text className='sub'>第 {idx + 1} / {questions.length} 题</Text>
        <Text className='type-tag'>{q.type === 'SINGLE' ? '单选' : q.type === 'MULTIPLE' ? '多选' : '判断'}</Text>
      </View>
      <View className='progress'>
        <View className='progress-fill' style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </View>

      <View className='card'>
        <Text className='q-content'>{q.content}</Text>
      </View>

      <View className='card'>
        <QuestionOptions options={q.options} getState={optState}
          onSelect={(key) => onOptionTap(key)} />

        {isMulti && !answered && curPending.length > 0 && (
          <Button className='confirm-btn' hoverClass='button-hover' loading={judging} onClick={() => void submitMulti(qid)}>提交本题</Button>
        )}
      </View>

      {answered && results[qid].analysis && (
        <View className='card analysis'>
          <Text className='title mb16'>解析</Text>
          <Text className='analysis-text'>{results[qid].analysis}</Text>
        </View>
      )}

      <View className='row between bottom-bar'>
        <Button className='nav-btn' hoverClass='button-hover' disabled={idx === 0} onClick={() => setIdx(idx - 1)}>上一题</Button>
        <Button className='fav-btn' hoverClass='button-hover' onClick={() => void favToggle()}>{isFav ? '★ 已收藏' : '☆ 收藏'}</Button>
        {idx < questions.length - 1
          ? <Button className='nav-btn primary' hoverClass='button-hover' onClick={() => setIdx(idx + 1)}>下一题</Button>
          : <Button className='nav-btn primary' hoverClass='button-hover' onClick={() => void doFinish()}>完成</Button>}
      </View>
    </View>
  )
}
