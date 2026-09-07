import { useEffect, useRef, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { saveExamAnswer, startExam, submitExam, type Question } from '../../services/api'
import QuestionOptions from '../../components/QuestionOptions'
import StateView from '../../components/StateView'
import './quiz.scss'
import { useThemeClass } from '../../services/theme'

export default function ExamQuizPage() {
  const themeCls = useThemeClass()
  const router = useRouter()
  const examId = Number(router.params.id || 0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<{ [qid: number]: string | string[] }>({})
  const [remaining, setRemaining] = useState(0)
  const [showSheet, setShowSheet] = useState(false)
  const [loading, setLoading] = useState(true)
  const userExamIdRef = useRef<number>(0)
  const submittingRef = useRef(false)

  // 启动考试
  useEffect(() => {
    startExam(examId).then((r) => {
      userExamIdRef.current = r.userExamId
      setQuestions(r.questions)
      setRemaining(r.remainingSeconds)
      setLoading(false)
      Taro.setNavigationBarTitle({ title: r.exam.name })
    }).catch((e) => {
      Taro.showToast({ title: (e as Error).message || '考试启动失败', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1200)
    })
  }, [examId])

  const doSubmit = async (auto = false) => {
    if (!userExamIdRef.current || submittingRef.current) return
    submittingRef.current = true
    try {
      const r = await submitExam(examId, { userExamId: userExamIdRef.current })
      Taro.redirectTo({
        url: `/pages/exams/result?ueid=${r.userExamId}&score=${r.score}&total=${r.totalScore}&correct=${r.correctCount}&wrong=${r.wrongCount}&unanswered=${r.unansweredCount}&accuracy=${r.accuracy}&auto=${auto ? 1 : 0}`,
      })
    } catch (e) {
      submittingRef.current = false
      Taro.showToast({ title: (e as Error).message || '交卷失败', icon: 'none' })
    }
  }

  // 倒计时：每秒递减
  useEffect(() => {
    if (remaining <= 0) return
    const timer = setInterval(() => setRemaining((sec) => Math.max(0, sec - 1)), 1000)
    return () => clearInterval(timer)
  }, [remaining > 0])

  // 到 0 自动交卷（副作用与状态更新分离，且只触发一次）
  useEffect(() => {
    if (!loading && remaining === 0 && userExamIdRef.current) void doSubmit(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, loading])

  const pick = (qid: number, key: string) => {
    const q = questions.find((x) => x.id === qid)
    const answer = q?.type === 'MULTIPLE'
      ? (() => {
          const cur = (answers[qid] as string[]) || []
          return cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
        })()
      : key
    setAnswers({ ...answers, [qid]: answer })
    void saveExamAnswer(examId, { userExamId: userExamIdRef.current, questionId: qid, answer })
  }

  const confirmSubmit = () => {
    const answeredCount = Object.keys(answers).length
    Taro.showModal({
      title: '确认交卷？',
      content: `已答 ${answeredCount} / ${questions.length} 题`,
      success: (res) => { if (res.confirm) void doSubmit(false) },
    })
  }

  if (loading) return <View className={'page ' + themeCls}><StateView text='加载中…' /></View>

  const q = questions[idx]
  const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const qid = q?.id
  const myAnswer = qid != null ? answers[qid] : undefined
  const isMulti = q?.type === 'MULTIPLE'

  const optState = (key: string) =>
    myAnswer ? (Array.isArray(myAnswer) ? myAnswer.includes(key) : myAnswer === key) ? 'picked' : '' : ''

  return (
    <View className={'exam-page ' + themeCls}>
      <View className='top'>
        <Text className={`timer ${remaining < 300 ? 'danger' : ''}`}>{fmt(remaining)}</Text>
        <Button className='sheet-btn' hoverClass='button-hover' onClick={() => setShowSheet(true)}>{Object.keys(answers).length}/{questions.length}</Button>
      </View>

      <ScrollView scrollY className='body'>
        <View className='q-head'><Text>{q.type === 'SINGLE' ? '单选题' : q.type === 'MULTIPLE' ? '多选题' : '判断题'} · 第 {idx + 1}/{questions.length} 题</Text></View>
        <View className='q-content'>{q.content}</View>

        <QuestionOptions options={q.options} variant='plain'
          getState={optState} onSelect={(key) => pick(q.id, key)} />
        {isMulti && <Text className='sub'>多选：可再次点击取消选择</Text>}
      </ScrollView>

      <View className='foot'>
        {idx > 0 && <Button className='f-btn' hoverClass='button-hover' onClick={() => setIdx(idx - 1)}>上一题</Button>}
        {idx < questions.length - 1
          ? <Button className='f-btn primary' hoverClass='button-hover' onClick={() => setIdx(idx + 1)}>下一题</Button>
          : <Button className='f-btn danger' hoverClass='button-hover' onClick={confirmSubmit}>交卷</Button>}
      </View>

      {showSheet && (
        <View className='sheet-mask' onClick={() => setShowSheet(false)}>
          <View className='sheet' onClick={(e) => e.stopPropagation()}>
            <Text className='title mb16'>答题卡</Text>
            <View className='sheet-grid'>
              {questions.map((x, i) => {
                const done = x.id in answers
                return (
                  <View key={x.id} className={`sheet-cell ${done ? 'done' : ''} ${i === idx ? 'cur' : ''}`} onClick={() => { setIdx(i); setShowSheet(false) }}>
                    {i + 1}
                  </View>
                )
              })}
            </View>
            <Button className='submit-btn' hoverClass='button-hover' onClick={confirmSubmit}>交卷</Button>
          </View>
        </View>
      )}
    </View>
  )
}
