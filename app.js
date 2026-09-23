/* CivicQuiz 学习闭环 MVP 原型 */
const $ = (id) => document.getElementById(id)

// ---------- Mock ----------
const QUESTIONS = [
  { id: 1, type: 'SINGLE', stem: '2026年我国 GDP 增长预期目标大约是多少？', options: [['A','4%'],['B','5%'],['C','6%'],['D','7%']], answer: ['B'], analysis: '政府工作报告预期目标为 5% 左右。', point: '宏观经济' },
  { id: 2, type: 'SINGLE', stem: '我国的根本政治制度是？', options: [['A','人民代表大会制度'],['B','政治协商制度'],['C','民族区域自治'],['D','基层群众自治']], answer: ['A'], analysis: '人民代表大会制度是根本政治制度。', point: '宪法' },
  { id: 3, type: 'MULTIPLE', stem: '下列属于法定节假日的有？', options: [['A','春节'],['B','清明'],['C','重阳'],['D','中秋']], answer: ['A','B','D'], analysis: '重阳节不是法定节假日。', point: '文化常识' },
  { id: 4, type: 'JUDGE', stem: '行政处罚的种类包括警告、罚款、行政拘留等。', options: [['TRUE','正确'],['FALSE','错误']], answer: ['TRUE'], analysis: '表述正确。', point: '行政法' },
  { id: 5, type: 'SINGLE', stem: '“一国两制”最早是为解决什么问题提出的？', options: [['A','台湾问题'],['B','香港问题'],['C','澳门问题'],['D','南海问题']], answer: ['A'], analysis: '最早是为解决台湾问题提出的。', point: '政治' },
  { id: 6, type: 'SINGLE', stem: '下列哪项不属于公民基本义务？', options: [['A','依法纳税'],['B','服兵役'],['C','自由迁徙'],['D','受教育']], answer: ['C'], analysis: '自由迁徙是权利，不是义务。', point: '宪法' },
  { id: 7, type: 'MULTIPLE', stem: '下列属于可再生能源的有？', options: [['A','太阳能'],['B','煤炭'],['C','风能'],['D','石油']], answer: ['A','C'], analysis: '煤炭、石油是非可再生能源。', point: '科技常识' },
  { id: 8, type: 'JUDGE', stem: '行政复议期间具体行政行为一律停止执行。', options: [['TRUE','正确'],['FALSE','错误']], answer: ['FALSE'], analysis: '原则上不停止执行。', point: '行政法' },
]

const TYPE_LABEL = { SINGLE: '单选题', MULTIPLE: '多选题', JUDGE: '判断题' }

const state = {
  tab: 'home',
  view: 'home',
  params: {},
  stack: [],
  theme: 'a',
  // stats
  todayTarget: 20,
  todayDone: 6,
  todayCorrect: 4,
  totalAnswered: 22,
  totalCorrect: 16,
  wrongIds: [1, 3, 6],
  wrongMeta: { 1: { n: 2, mastered: false }, 3: { n: 1, mastered: false }, 6: { n: 3, mastered: true } },
  favIds: [2, 5],
  examCount: 2,
  avgScore: 36,
  maxScore: 72,
  // practice session
  practice: null,
  // exam session
  exam: null,
  history: [
    {
      id: 101, name: '时政热点模拟卷', examId: 1, at: '2026-09-08 02:58', score: 0, total: 100, accuracy: 0,
      count: 8, right: 0, wrong: 8, blank: 0, duration: 12, status: 2, auto: true,
      detail: QUESTIONS.map((q) => ({ id: q.id, correct: false, user: [q.options[0][0]], answer: q.answer })),
    },
    {
      id: 102, name: '宪法专项模考', examId: 2, at: '2026-09-07 21:10', score: 72, total: 100, accuracy: 72,
      count: 8, right: 6, wrong: 2, blank: 0, duration: 28, status: 2, auto: false,
      detail: QUESTIONS.map((q, i) => ({
        id: q.id, correct: i < 6, user: i < 6 ? q.answer : [q.options[0][0]], answer: q.answer,
      })),
    },
    {
      id: 103, name: '综合模拟（进行中）', examId: 1, at: '2026-09-08 03:20', score: null, total: 100, accuracy: 0,
      count: 8, right: 0, wrong: 0, blank: 0, duration: 0, status: 1, auto: false, detail: [],
    },
  ],
  exams: [
    { id: 1, name: '时政热点模拟卷', desc: '覆盖近期时政要点', count: 8, duration: 30, total: 100 },
    { id: 2, name: '宪法专项模考', desc: '宪法高频考点', count: 8, duration: 25, total: 100 },
  ],
  banks: [
    { id: 1, name: '[公考]时政热点', desc: '近期时政与政策要点', count: 8, cats: 3 },
  ],
}

const accuracy = (c, t) => (t ? Math.round((c / t) * 100) : 0)
const wrongCount = () => state.wrongIds.filter((id) => !state.wrongMeta[id]?.mastered).length

// ---------- Router ----------
const TABS = [
  { key: 'home', label: '首页', ico: '🏠', view: 'home' },
  { key: 'banks', label: '刷题', ico: '📝', view: 'banks' },
  { key: 'exams', label: '考试', ico: '🎯', view: 'exams' },
  { key: 'mine', label: '我的', ico: '👤', view: 'mine' },
]

const VIEW_META = {
  home: { title: '刷题备考', tab: 'home', showTabs: true, root: true },
  banks: { title: '开始刷题', tab: 'banks', showTabs: true, root: true },
  exams: { title: '模拟考试', tab: 'exams', showTabs: true, root: true },
  mine: { title: '我的', tab: 'mine', showTabs: true, root: true },
  'practice-select': { title: '刷题设置', tab: 'banks', showTabs: false },
  'practice-quiz': { title: '练习中', tab: 'banks', showTabs: false },
  'practice-result': { title: '练习结果', tab: 'banks', showTabs: false },
  'exam-detail': { title: '考试详情', tab: 'exams', showTabs: false },
  'exam-quiz': { title: '考试中', tab: 'exams', showTabs: false },
  'exam-result': { title: '考试结果', tab: 'exams', showTabs: false },
  'exam-review': { title: '答卷回顾', tab: 'exams', showTabs: false },
  wrong: { title: '错题本', tab: 'mine', showTabs: false },
  favorite: { title: '我的收藏', tab: 'mine', showTabs: false },
  settings: { title: '设置', tab: 'mine', showTabs: false },
  'exam-record': { title: '考试详情', tab: 'mine', showTabs: false },
}

function go(view, params = {}, push = true) {
  if (push && state.view) state.stack.push({ view: state.view, params: state.params })
  state.view = view
  state.params = params
  const meta = VIEW_META[view]
  if (meta?.tab) state.tab = meta.tab
  render()
}

function goBack() {
  const prev = state.stack.pop()
  if (prev) {
    state.view = prev.view
    state.params = prev.params
    const meta = VIEW_META[state.view]
    if (meta?.tab) state.tab = meta.tab
    render()
  } else {
    go(VIEW_META[state.view]?.tab || 'home', {}, false)
  }
}

function applyTheme() {
  $('app').classList.toggle('theme-b', state.theme === 'b')
  $('app').classList.toggle('theme-a', state.theme === 'a')
}

// ---------- Render shell ----------
function render() {
  applyTheme()
  const meta = VIEW_META[state.view] || VIEW_META.home
  $('nav-bar').innerHTML = `
    ${meta.root ? '<span style="width:32px"></span>' : `<button class="back" id="btn-back">‹</button>`}
    <div class="nav-title">${meta.title}</div>
    ${state.view === 'exam-quiz' ? `<button class="nav-right" id="btn-card">答题卡</button>` : '<span style="width:32px"></span>'}
  `
  const back = $('btn-back')
  if (back) back.onclick = () => goBack()
  const bc = $('btn-card')
  if (bc) bc.onclick = openAnswerCard

  $('tab-bar').classList.toggle('hidden', !meta.showTabs)
  $('tab-bar').innerHTML = TABS.map((t) => `
    <button class="tab-item ${state.tab === t.key ? 'active' : ''}" data-tab="${t.key}">
      <span class="ico">${t.ico}</span><span>${t.label}</span>
    </button>`).join('')
  $('tab-bar').querySelectorAll('.tab-item').forEach((el) => {
    el.onclick = () => {
      const t = TABS.find((x) => x.key === el.dataset.tab)
      go(t.view)
    }
  })

  const renderers = {
    home: renderHome, banks: renderBanks, exams: renderExams, mine: renderMine,
    'practice-select': renderPracticeSelect, 'practice-quiz': renderPracticeQuiz,
    'practice-result': renderPracticeResult, 'exam-detail': renderExamDetail,
    'exam-quiz': renderExamQuiz, 'exam-result': renderExamResult,
    'exam-review': renderExamReview, wrong: renderWrong, favorite: renderFavorite,
    settings: renderSettings, 'exam-record': renderExamRecord,
  }
  $('screen').innerHTML = (renderers[state.view] || renderHome)()
  bindScreen()
}

function bindScreen() {
  document.querySelectorAll('[data-go]').forEach((el) => {
    el.onclick = () => go(el.dataset.go, JSON.parse(el.dataset.params || '{}'))
  })
  document.querySelectorAll('[data-act]').forEach((el) => {
    el.onclick = () => handleAction(el.dataset.act, JSON.parse(el.dataset.params || '{}'))
  })
}

function handleAction(act, p) {
  switch (act) {
    case 'start-random': startPractice('RANDOM', p.count || 20); break
    case 'start-wrong': startPractice('WRONG', Math.min(wrongCount() || 1, 20)); break
    case 'start-fav': startPractice('FAVORITE', Math.min(state.favIds.length, 20)); break
    case 'start-normal': startPractice('NORMAL', p.count || 20); break
    case 'begin-practice':
      if (p.preview) { state.params = { ...state.params, mode: p.mode, count: p.count }; render(); break }
      startPractice(p.mode, p.count); break
    case 'pick-multi': toggleMulti(p); break
    case 'pick-one': pickOne(p); break
    case 'submit-multi': submitMulti(); break
    case 'next-q': nextQ(); break
    case 'prev-q': prevQ(); break
    case 'fav-q': toggleFavCur(); break
    case 'finish-practice': go('practice-result'); break
    case 'start-exam': startExam(p.id); break
    case 'submit-exam': confirmSubmitExam(false); break
    case 'review-exam': go('exam-review', { id: p.id }); break
    case 'resume-exam': resumeExam(); break
    case 'retake': go('exam-detail', { id: p.id }); break
    case 'go-wrong': go('wrong'); break
    case 'master-wrong': masterWrong(p.id); break
    case 'remove-wrong': removeWrong(p.id); break
    case 'remove-fav': removeFav(p.id); break
    case 'set-theme': state.theme = p.t; render(); break
    case 'jump-q': jumpQ(p); break
    case 'jump-review-practice': state.practice.idx = p.i; go('practice-quiz'); break
    case 'close-sheet': closeSheet(); break
    case 'confirm-submit': doSubmitExam(); break
    case 'go-review-wrong': go('exam-review', { id: p.id, onlyWrong: true }); break
    case 'exam-one': {
      const s = state.exam
      const q = s.questions[s.idx]
      s.answers[q.id] = [p.k]
      render(); break
    }
    case 'exam-multi': {
      const s = state.exam
      const q = s.questions[s.idx]
      const cur = s.answers[q.id] || []
      s.answers[q.id] = cur.includes(p.k) ? cur.filter((x) => x !== p.k) : [...cur, p.k]
      render(); break
    }
    case 'review-next': state.params.i = (state.params.i || 0) + 1; render(); break
    case 'review-prev': state.params.i = Math.max(0, (state.params.i || 0) - 1); render(); break
  }
}

// ---------- Home ----------
function renderHome() {
  const pct = Math.min(100, Math.round((state.todayDone / state.todayTarget) * 100))
  const ongoing = state.history.find((h) => h.status === 1)
  const cont = ongoing
    ? `<div class="row between mb8"><div class="title">继续学习</div></div>
       <div class="sub mb8">上次做到：考试中 · ${ongoing.name}</div>
       <div class="sub mb8">${ongoing.at}</div>
       <button class="btn btn-primary btn-block" data-act="resume-exam">继续答题 →</button>`
    : `<div class="row between mb8"><div class="title">继续学习</div></div>
       <div class="sub mb8">开始今天的练习 · 随机练习 20 题</div>
       <button class="btn btn-primary btn-block" data-act="start-random" data-params='{"count":20}'>开始刷题</button>`

  return `
  <div class="card">
    <div class="greet">${greetText()}，备考用户</div>
    <div class="sub">每天进步一点点，考试稳稳过。</div>
    <div class="chip-row">
      <div class="chip"><span class="num">${state.todayDone}</span><span class="lab">今日答题</span></div>
      <div class="chip"><span class="num">${accuracy(state.todayCorrect, state.todayDone)}%</span><span class="lab">今日正确率</span></div>
      <div class="chip"><span class="num">${state.totalAnswered}</span><span class="lab">累计答题</span></div>
    </div>
  </div>

  <div class="card">
    <div class="row between mb8"><div class="title">今日任务</div><span class="sub">${state.todayDone} / ${state.todayTarget} 题</span></div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="row between sub"><span>完成 ${pct}%</span><span>正确率 ${accuracy(state.todayCorrect, state.todayDone)}% · 错题 ${wrongCount()}</span></div>
  </div>

  <div class="card">${cont}</div>

  <div class="card">
    <div class="title mb12">今日建议</div>
    <div class="suggest-item" data-act="start-wrong">
      <div class="dot" style="background:var(--danger-soft)">🔴</div>
      <div class="flex1"><div class="title">错题复习</div><div class="sub">${wrongCount()} 道待巩固</div></div>
      <div class="go">去复习</div>
    </div>
    <div class="suggest-item" data-act="start-fav">
      <div class="dot" style="background:var(--warn-soft)">⭐</div>
      <div class="flex1"><div class="title">收藏题</div><div class="sub">${state.favIds.length} 道</div></div>
      <div class="go">去练习</div>
    </div>
    <div class="suggest-item" data-act="start-random" data-params='{"count":20}'>
      <div class="dot" style="background:var(--primary-soft)">📝</div>
      <div class="flex1"><div class="title">继续刷题</div><div class="sub">随机练习 20 题</div></div>
      <div class="go">开始</div>
    </div>
  </div>

  <div class="card">
    <div class="title mb12">学习数据</div>
    <div class="metric-grid">
      <div class="metric core"><div class="num">${state.totalAnswered}</div><div class="lab">累计答题</div></div>
      <div class="metric core"><div class="num">${accuracy(state.totalCorrect, state.totalAnswered)}%</div><div class="lab">正确率</div></div>
      <div class="metric core"><div class="num">${wrongCount()}</div><div class="lab">待巩固错题</div></div>
    </div>
    <div class="metric-grid secondary">
      <div class="metric"><div class="num">${state.favIds.length}</div><div class="lab">收藏</div></div>
      <div class="metric"><div class="num">${state.examCount}</div><div class="lab">模拟考试</div></div>
    </div>
  </div>
  `
}

function greetText() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

// ---------- Banks ----------
function renderBanks() {
  if (!state.banks.length) return `<div class="card"><div class="empty">题库准备中，敬请期待</div></div>`
  return state.banks.map((b) => {
    const m = b.name.match(/^\[([^\]]+)\](.*)$/)
    const tag = m ? `<span class="tag">${m[1]}</span>` : ''
    const name = m ? m[2] : b.name
    return `<div class="card bank-card" data-go="practice-select" data-params='${JSON.stringify({ bankId: b.id, bankName: b.name })}'>
      <div class="bank-icon">📚</div>
      <div class="flex1">
        <div class="title">${tag}${name}</div>
        <div class="sub mb8">${b.desc}</div>
        <div class="sub">共 ${b.count} 题 · ${b.cats} 个分类</div>
      </div>
      <button class="btn btn-ghost">去刷题</button>
    </div>`
  }).join('')
}

// ---------- Practice select ----------
function renderPracticeSelect() {
  const p = state.params
  const modes = [
    { k: 'NORMAL', t: '顺序练习', d: '按题号依次作答' },
    { k: 'RANDOM', t: '随机练习', d: '随机抽取题目' },
    { k: 'WRONG', t: '错题重练', d: '只练未掌握错题' },
    { k: 'FAVORITE', t: '收藏练习', d: '练习收藏题目' },
  ]
  const mode = p.mode || 'RANDOM'
  const count = p.count || 20
  return `
  <div class="card">
    <div class="title mb8">${(p.bankName || '题库').replace(/^\[[^\]]+\]/, '')}</div>
    <div class="sub">共 ${QUESTIONS.length} 题可练 · 3 个分类</div>
  </div>
  <div class="card">
    <div class="title mb12">练习模式</div>
    <div class="mode-grid">
      ${modes.map((m) => `<div class="mode-opt ${mode === m.k ? 'on' : ''}" data-act="begin-practice" data-params='${JSON.stringify({ mode: m.k, count, preview: true })}'>
        <div class="t">${m.t}</div><div class="d">${m.d}</div>
      </div>`).join('')}
    </div>
  </div>
  <div class="card">
    <div class="title mb12">题量</div>
    <div class="count-row">
      ${[10, 20, 50].map((n) => `<div class="count-opt ${count === n ? 'on' : ''}" data-act="begin-practice" data-params='${JSON.stringify({ mode, count: n, preview: true })}'>${n} 题</div>`).join('')}
    </div>
  </div>
  <button class="btn btn-primary btn-block" data-act="begin-practice" data-params='${JSON.stringify({ mode, count })}'>开始练习</button>
  `
}

// ---------- Practice ----------
function startPractice(mode, count) {
  const pool = mode === 'WRONG' ? QUESTIONS.filter((q) => state.wrongIds.includes(q.id) && !state.wrongMeta[q.id]?.mastered)
    : mode === 'FAVORITE' ? QUESTIONS.filter((q) => state.favIds.includes(q.id))
    : [...QUESTIONS]
  if (!pool.length) { alert('该范围内没有可用题目'); return }
  const n = Math.min(count || 20, pool.length)
  const qs = mode === 'RANDOM' ? shuffle(pool).slice(0, n) : pool.slice(0, n)
  state.practice = {
    mode, idx: 0, questions: qs,
    results: {}, pending: {},
  }
  go('practice-quiz')
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function renderPracticeQuiz() {
  const s = state.practice
  if (!s) return `<div class="empty">暂无练习会话</div>`
  const q = s.questions[s.idx]
  const total = s.questions.length
  const done = Object.keys(s.results).length
  const res = s.results[q.id]
  const pend = s.pending[q.id]
  const pct = Math.round(((s.idx) / total) * 100)

  return `
  <div class="quiz-head">
    <div class="quiz-meta">
      <span>第 ${s.idx + 1} / ${total} 题 <span class="q-type-tag">${TYPE_LABEL[q.type]}</span></span>
      <span class="pct">${pct}%</span>
    </div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="sub">本次正确率 ${accuracy(Object.values(s.results).filter((r) => r.correct).length, done)}</div>
  </div>

  <div class="card stem-card">
    <div class="stem">${q.stem}</div>
    <button class="fav-btn ${state.favIds.includes(q.id) ? 'on' : ''}" data-act="fav-q">${state.favIds.includes(q.id) ? '★' : '☆'}</button>
  </div>

  <div class="opts">
    ${q.options.map(([k, t], i) => optHtml(q, k, t, i, res, pend)).join('')}
  </div>

  ${res ? feedbackHtml(q, res) : `<div class="card tight center sub">选择答案后查看解析</div>`}

  <div class="quiz-foot">
    <button class="btn btn-soft" data-act="prev-q" ${s.idx === 0 ? 'disabled' : ''}>← 上一题</button>
    ${!res && q.type === 'MULTIPLE'
      ? `<button class="btn btn-primary flex1" data-act="submit-multi" ${!pend || !pend.length ? 'disabled' : ''}>提交本题</button>`
      : !res && q.type !== 'MULTIPLE'
        ? `<button class="btn btn-primary flex1" disabled>请选择答案</button>`
        : s.idx < total - 1
          ? `<button class="btn btn-primary flex1" data-act="next-q">下一题 →</button>`
          : `<button class="btn btn-primary flex1" data-act="finish-practice">完成练习</button>`}
  </div>
  `
}

function optHtml(q, k, t, i, res, pend) {
  let cls = ''
  let mark = '○'
  const userKeys = res ? (Array.isArray(res.userAnswer) ? res.userAnswer : [res.userAnswer]) : (pend || [])
  const ans = q.answer
  if (res) {
    const picked = userKeys.includes(k)
    const isAns = ans.includes(k)
    if (isAns) { cls = 'correct'; mark = '✓' }
    else if (picked) { cls = 'wrong'; mark = '✕' }
    else cls = 'dim'
  } else if (userKeys.includes(k)) {
    cls = 'selected'; mark = '●'
  }
  return `<div class="opt ${cls}" data-act="${q.type === 'MULTIPLE' && !res ? 'pick-multi' : 'pick-one'}" data-params='${JSON.stringify({ i, k })}'>
    <div class="mark">${mark}</div>
    <div class="key">${k}</div>
    <div class="txt">${t}</div>
  </div>`
}

function feedbackHtml(q, res) {
  const ok = res.correct
  return `<div class="feedback ${ok ? 'ok' : 'bad'}">
    <div class="fb-title">${ok ? '✓ 回答正确' : '✕ 回答错误'}</div>
    ${!ok ? `<div class="line">正确答案：${q.answer.join('')}</div>` : ''}
    <div class="line"><b>解析</b>：${q.analysis}</div>
    <div class="line"><b>知识点</b>：${q.point}</div>
    ${!ok ? `<button class="btn btn-danger" style="margin-top:8px" data-act="fav-q">收藏本题</button>` : ''}
  </div>`
}

function pickOne({ k }) {
  const s = state.practice
  const q = s.questions[s.idx]
  if (s.results[q.id]) return
  const keys = [k]
  const correct = JSON.stringify([...keys].sort()) === JSON.stringify([...q.answer].sort())
  s.results[q.id] = { userAnswer: keys, correct, answerKeys: q.answer }
  state.todayDone = Math.min(state.todayTarget, state.todayDone + 1)
  state.totalAnswered += 1
  if (correct) { state.todayCorrect += 1; state.totalCorrect += 1 }
  else {
    if (!state.wrongIds.includes(q.id)) state.wrongIds.push(q.id)
    state.wrongMeta[q.id] = { n: (state.wrongMeta[q.id]?.n || 0) + 1, mastered: false }
  }
  render()
}

function toggleMulti({ k }) {
  const s = state.practice
  const q = s.questions[s.idx]
  if (s.results[q.id]) return
  const cur = s.pending[q.id] || []
  s.pending[q.id] = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]
  render()
}

function submitMulti() {
  const s = state.practice
  const q = s.questions[s.idx]
  const keys = s.pending[q.id] || []
  if (!keys.length) return
  const correct = JSON.stringify([...keys].sort()) === JSON.stringify([...q.answer].sort())
  s.results[q.id] = { userAnswer: keys, correct, answerKeys: q.answer }
  state.todayDone = Math.min(state.todayTarget, state.todayDone + 1)
  state.totalAnswered += 1
  if (correct) { state.todayCorrect += 1; state.totalCorrect += 1 }
  else {
    if (!state.wrongIds.includes(q.id)) state.wrongIds.push(q.id)
    state.wrongMeta[q.id] = { n: (state.wrongMeta[q.id]?.n || 0) + 1, mastered: false }
  }
  render()
}

function nextQ() {
  const s = state.view === 'exam-quiz' ? state.exam : state.practice
  if (!s) return
  if (state.view === 'practice-quiz') {
    const q = s.questions[s.idx]
    if (!s.results[q.id]) return
  }
  if (s.idx < s.questions.length - 1) { s.idx++; render() }
}

function prevQ() {
  const s = state.view === 'exam-quiz' ? state.exam : state.practice
  if (!s) return
  if (s.idx > 0) { s.idx--; render() }
}

function toggleFavCur() {
  const s = state.view === 'exam-quiz' ? state.exam : state.practice
  if (!s) return
  const q = s.questions[s.idx]
  if (state.favIds.includes(q.id)) state.favIds = state.favIds.filter((x) => x !== q.id)
  else state.favIds.push(q.id)
  render()
}

function resumeExam() {
  const rec = state.history.find((h) => h.status === 1)
  const examId = rec?.examId || state.params.id || 1
  const e = state.exams.find((x) => x.id === examId) || state.exams[0]
  if (state.exam?.examId === e.id && !state.exam._submitted) {
    startTimer()
    go('exam-quiz')
    return
  }
  const qs = shuffle(QUESTIONS).slice(0, Math.min(e.count, QUESTIONS.length))
  state.exam = {
    examId: e.id, name: e.name, total: e.total, duration: e.duration,
    idx: 0, questions: qs, answers: {}, remaining: Math.max(e.duration * 60 - 120, 60), timer: null, auto: false, _submitted: false,
  }
  go('exam-quiz')
  startTimer()
}

function renderPracticeResult() {
  const s = state.practice
  if (!s) return `<div class="empty">暂无数据</div>`
  const total = s.questions.length
  const right = Object.values(s.results).filter((r) => r.correct).length
  const wrong = Object.values(s.results).filter((r) => !r.correct).length
  const blank = total - right - wrong
  const pct = accuracy(right, total)
  const encourage = pct >= 90 ? '太棒了，继续保持！' : pct >= 60 ? '不错，再巩固错题就更稳。' : '别灰心，把错题过一遍。'
  const byPoint = {}
  s.questions.forEach((q) => {
    const r = s.results[q.id]
    if (!byPoint[q.point]) byPoint[q.point] = { n: 0, ok: 0 }
    byPoint[q.point].n++
    if (r?.correct) byPoint[q.point].ok++
  })
  return `
  <div class="card">
    <div class="ring-wrap">
      <div class="ring" style="--p:${pct * 3.6}deg">
        <div class="rv">${right}/${total}</div><div class="rl">答对</div>
      </div>
    </div>
    <div class="center title mb8">${encourage}</div>
    <div class="stat-4">
      <div><div class="num">${total}</div><div class="lab">一共</div></div>
      <div><div class="num" style="color:var(--primary)">${right}</div><div class="lab">答对</div></div>
      <div><div class="num" style="color:var(--danger)">${wrong}</div><div class="lab">答错</div></div>
      <div><div class="num muted">${blank}</div><div class="lab">未答</div></div>
    </div>
  </div>
  <div class="card">
    <div class="title mb12">考点小结</div>
    ${Object.entries(byPoint).map(([p, v]) => {
      const stars = Math.max(1, Math.round((v.ok / v.n) * 5))
      return `<div class="row between" style="padding:6px 0"><span>${p} <span style="color:var(--accent)">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span></span><span class="sub">共 ${v.n} 题，答对 ${v.ok} 题，正确率 ${accuracy(v.ok, v.n)}%</span></div>`
    }).join('')}
  </div>
  <div class="card">
    <div class="title mb12">答题卡</div>
    <div class="answer-card">
      ${s.questions.map((q, i) => {
        const r = s.results[q.id]
        const cls = !r ? '' : r.correct ? 'done' : 'wrong'
        return `<div class="ac-item ${cls} ${state.favIds.includes(q.id) ? 'fav' : ''}" data-act="jump-review-practice" data-params='${JSON.stringify({ i })}'>${i + 1}</div>`
      }).join('')}
    </div>
    <div class="legend">
      <span><i style="background:var(--primary-soft)"></i>答对</span>
      <span><i style="background:var(--danger-soft)"></i>答错</span>
      <span><i style="background:var(--bg)"></i>未答</span>
    </div>
  </div>
  <div class="btn-row">
    <button class="btn btn-ghost" data-act="go-wrong">错题解析</button>
    <button class="btn btn-primary" data-go="home">返回首页</button>
  </div>
  `
}

// ---------- Exams ----------
function renderExams() {
  return state.exams.map((e) => `
    <div class="card">
      <div class="row between mb8"><div class="title">${e.name}</div></div>
      <div class="sub mb8">${e.desc}</div>
      <div class="sub mb12">${e.count} 题 · ${e.duration} 分钟 · ${e.total} 分</div>
      <button class="btn btn-primary btn-block" data-go="exam-detail" data-params='${JSON.stringify({ id: e.id })}'>开始</button>
    </div>`).join('')
}

function renderExamDetail() {
  const e = state.exams.find((x) => x.id === state.params.id) || state.exams[0]
  return `
  <div class="card">
    <div class="title mb8">${e.name}</div>
    <div class="sub mb8">${e.desc}</div>
    <div class="kv">
      <div><div class="n">${e.count}</div><div class="l">题数</div></div>
      <div><div class="n">${e.total}</div><div class="l">总分</div></div>
      <div><div class="n">${e.duration}</div><div class="l">分钟</div></div>
    </div>
  </div>
  <div class="card">
    <div class="title mb8">题型构成</div>
    <div class="sub">单选题 · 多选题 · 判断题</div>
  </div>
  <div class="card">
    <div class="title mb8">考试须知</div>
    <div class="sub" style="line-height:1.8">1. 考试期间不显示答案与解析，交卷后统一判分。<br/>2. 到时会自动交卷，请合理安排时间。<br/>3. 作答可修改，以交卷答案为准。</div>
  </div>
  <button class="btn btn-primary btn-block" data-act="start-exam" data-params='${JSON.stringify({ id: e.id })}'>开始考试</button>
  `
}

function startExam(id) {
  const e = state.exams.find((x) => x.id === id)
  const qs = shuffle(QUESTIONS).slice(0, Math.min(e.count, QUESTIONS.length))
  if (state.exam?.timer) clearInterval(state.exam.timer)
  state.exam = {
    examId: id, name: e.name, total: e.total, duration: e.duration,
    idx: 0, questions: qs, answers: {}, remaining: e.duration * 60, timer: null, auto: false, _submitted: false,
  }
  go('exam-quiz')
  startTimer()
}

function startTimer() {
  if (state.exam?.timer) clearInterval(state.exam.timer)
  state.exam.timer = setInterval(() => {
    if (!state.exam) return
    state.exam.remaining--
    const el = $('screen').querySelector('.countdown')
    if (el) {
      el.textContent = fmtSec(state.exam.remaining)
      el.classList.toggle('warn', state.exam.remaining < 300)
    }
    if (state.exam.remaining <= 0) {
      clearInterval(state.exam.timer)
      doSubmitExam(true)
    }
  }, 1000)
}

function fmtSec(s) {
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
}

function renderExamQuiz() {
  const s = state.exam
  if (!s || s._submitted) {
    return `<div class="card"><div class="empty">本场考试已结束</div>
      <button class="btn btn-primary btn-block" data-go="exams">返回考试列表</button></div>`
  }
  const q = s.questions[s.idx]
  const total = s.questions.length
  const answered = Object.keys(s.answers).length
  const pct = Math.round((s.idx / total) * 100)
  const pend = s.answers[q.id]

  return `
  <div class="quiz-head">
    <div class="quiz-meta">
      <span>第 ${s.idx + 1} / ${total} 题 <span class="q-type-tag">${TYPE_LABEL[q.type]}</span></span>
      <span class="countdown ${s.remaining < 300 ? 'warn' : ''}">${fmtSec(s.remaining)}</span>
    </div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="row between sub"><span>进度 ${pct}%</span><span>已答 ${answered} / ${total}</span></div>
  </div>

  <div class="card stem-card">
    <div class="stem">${q.stem}</div>
    <button class="fav-btn ${state.favIds.includes(q.id) ? 'on' : ''}" data-act="fav-q">${state.favIds.includes(q.id) ? '★' : '☆'}</button>
  </div>

  <div class="opts">
    ${q.options.map(([k, t], i) => {
      const userKeys = pend ? (Array.isArray(pend) ? pend : [pend]) : []
      const cls = userKeys.includes(k) ? 'selected' : ''
      const mark = userKeys.includes(k) ? '●' : '○'
      return `<div class="opt ${cls}" data-act="${q.type === 'MULTIPLE' ? 'exam-multi' : 'exam-one'}" data-params='${JSON.stringify({ i, k })}'>
        <div class="mark">${mark}</div><div class="key">${k}</div><div class="txt">${t}</div>
      </div>`
    }).join('')}
  </div>

  <div class="card tight center sub">${q.type === 'MULTIPLE' ? '多选：可再次点击取消选择 · 点「下一题」保存' : '考试中不显示答案与解析'}</div>

  <div class="quiz-foot">
    <button class="btn btn-soft" data-act="prev-q" ${s.idx === 0 ? 'disabled' : ''}>← 上一题</button>
    ${s.idx < total - 1
      ? `<button class="btn btn-primary flex1" data-act="next-q">下一题 →</button>`
      : `<button class="btn btn-primary flex1" data-act="submit-exam">提交试卷</button>`}
  </div>
  `
}

function openAnswerCard() {
  const s = state.exam
  if (!s) return
  const root = $('modal-root')
  root.classList.add('active')
  root.innerHTML = `
    <div class="modal-mask" data-act="close-sheet">
      <div class="sheet" onclick="event.stopPropagation()">
        <h3>答题卡 · 已答 ${Object.keys(s.answers).length} / ${s.questions.length}</h3>
        <div class="answer-card">
          ${s.questions.map((q, i) => {
            const done = s.answers[q.id] ? 'done' : ''
            const cur = i === s.idx ? 'cur' : ''
            const fav = state.favIds.includes(q.id) ? 'fav' : ''
            return `<div class="ac-item ${done} ${cur} ${fav}" data-act="jump-q" data-params='${JSON.stringify({ i })}'>${i + 1}</div>`
          }).join('')}
        </div>
        <div class="legend">
          <span><i style="background:var(--primary-soft)"></i>已答</span>
          <span><i style="background:var(--bg);border:1px solid var(--line)"></i>未答</span>
          <span>★ 收藏</span>
        </div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-soft" data-act="close-sheet">返回答题</button>
          <button class="btn btn-primary" data-act="submit-exam">交卷</button>
        </div>
      </div>
    </div>`
  bindScreen()
}

function closeSheet() {
  const root = $('modal-root')
  root.classList.remove('active')
  root.innerHTML = ''
}

function jumpQ({ i }) {
  state.exam.idx = i
  closeSheet()
  render()
}

function confirmSubmitExam(auto) {
  const s = state.exam
  if (!s || s._submitted) return
  const answered = Object.keys(s.answers).length
  const total = s.questions.length
  if (!auto && !confirm(`确认交卷？已答 ${answered} / ${total} 题`)) return
  doSubmitExam(auto)
}

function doSubmitExam(auto = false) {
  const s = state.exam
  if (!s || s._submitted) return
  s._submitted = true
  if (s.timer) clearInterval(s.timer)
  let right = 0, wrong = 0, blank = 0
  const detail = []
  s.questions.forEach((q) => {
    const ua = s.answers[q.id]
    if (!ua) {
      blank++
      detail.push({ id: q.id, correct: false, user: [], answer: q.answer })
    } else {
      const ok = JSON.stringify([...ua].sort()) === JSON.stringify([...q.answer].sort())
      if (ok) {
        right++
        state.totalCorrect++
        state.todayCorrect++
      } else {
        wrong++
        if (!state.wrongIds.includes(q.id)) state.wrongIds.push(q.id)
        state.wrongMeta[q.id] = { n: (state.wrongMeta[q.id]?.n || 0) + 1, mastered: false }
      }
      detail.push({ id: q.id, correct: ok, user: ua, answer: q.answer })
    }
    state.totalAnswered++
  })
  state.todayDone = Math.min(state.todayTarget, state.todayDone + s.questions.length)
  state.examCount++
  const score = Math.round((right / s.questions.length) * s.total)
  const rec = {
    id: Date.now(), name: s.name, examId: s.examId,
    at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    score, total: s.total, accuracy: accuracy(right, s.questions.length),
    count: s.questions.length, right, wrong, blank,
    duration: Math.round((s.duration * 60 - Math.max(s.remaining, 0)) / 60),
    status: 2, auto: !!auto, detail,
  }
  // 结清该场进行中的历史记录，避免「继续学习」误引导
  state.history = state.history.filter((h) => !(h.status === 1 && h.examId === s.examId))
  state.history.unshift(rec)
  // 清空考试会话，阻断重复交卷 / 回退重做
  state.exam = null
  state.stack = []
  go('exam-result', { id: rec.id }, false)
}

function renderExamResult() {
  const rec = state.history.find((h) => h.id === state.params.id) || state.history[0]
  const bad = rec.score < rec.total * 0.6
  return `
  <div class="card">
    <div class="big-score ${bad ? 'bad' : ''}">${rec.score}</div>
    <div class="center sub mb12">${rec.total} 分 · 正确率 ${rec.accuracy}%</div>
    ${rec.auto ? `<div class="center mb12"><span class="tag">已到时自动交卷</span></div>` : ''}
    <div class="stat-4">
      <div><div class="num" style="color:var(--primary)">${rec.right}</div><div class="lab">答对</div></div>
      <div><div class="num" style="color:var(--danger)">${rec.wrong}</div><div class="lab">答错</div></div>
      <div><div class="num muted">${rec.blank}</div><div class="lab">未答</div></div>
      <div><div class="num">${rec.duration}′</div><div class="lab">用时</div></div>
    </div>
  </div>
  <div class="btn-row mb12">
    <button class="btn btn-danger" data-act="go-review-wrong" data-params='${JSON.stringify({ id: rec.id })}'>查看错题</button>
    <button class="btn btn-ghost" data-act="retake" data-params='${JSON.stringify({ id: rec.examId || state.exam?.examId || 1 })}'>再做一次</button>
  </div>
  <button class="btn btn-primary btn-block" data-go="exam-review" data-params='${JSON.stringify({ id: rec.id })}'>查看解析</button>
  <div style="height:8px"></div>
  <button class="btn btn-soft btn-block" data-go="home">返回首页</button>
  `
}

function renderExamReview() {
  const rec = state.history.find((h) => h.id === state.params.id) || state.history[0]
  let detail = rec.detail || []
  if (state.params.onlyWrong) detail = detail.filter((d) => !d.correct)
  if (!detail.length) return `<div class="card"><div class="empty">暂无题目数据</div></div>`
  const i = state.params.i || 0
  const d = detail[Math.min(i, detail.length - 1)]
  const q = QUESTIONS.find((x) => x.id === d.id) || QUESTIONS[0]
  return `
  <div class="quiz-head">
    <div class="quiz-meta"><span>第 ${Math.min(i, detail.length - 1) + 1} / ${detail.length} 题</span>
    <span class="q-type-tag">${d.correct ? '✓ 正确' : '✕ 错误'}</span></div>
    <div class="progress"><i style="width:${Math.round((Math.min(i, detail.length - 1) / detail.length) * 100)}%"></i></div>
  </div>
  <div class="card stem-card"><div class="stem">${q.stem}</div></div>
  <div class="opts">
    ${q.options.map(([k, t]) => {
      const isAns = d.answer.includes(k)
      const picked = d.user.includes(k)
      let cls = 'dim', mark = '○'
      if (isAns) { cls = 'correct'; mark = '✓' }
      else if (picked) { cls = 'wrong'; mark = '✕' }
      return `<div class="opt ${cls}"><div class="mark">${mark}</div><div class="key">${k}</div><div class="txt">${t}</div></div>`
    }).join('')}
  </div>
  <div class="feedback ${d.correct ? 'ok' : 'bad'}">
    <div class="fb-title">${d.correct ? '✓ 回答正确' : '✕ 回答错误'}</div>
    <div class="line">你的答案：${d.user.join('') || '未答'}</div>
    <div class="line">正确答案：${d.answer.join('')}</div>
    <div class="line"><b>解析</b>：${q.analysis}</div>
    <div class="line"><b>知识点</b>：${q.point}</div>
  </div>
  <div class="quiz-foot">
    <button class="btn btn-soft" data-act="review-prev" ${Math.min(i, detail.length - 1) === 0 ? 'disabled' : ''}>← 上一题</button>
    ${Math.min(i, detail.length - 1) < detail.length - 1
      ? `<button class="btn btn-primary flex1" data-act="review-next">下一题 →</button>`
      : `<button class="btn btn-primary flex1" data-go="mine">返回</button>`}
  </div>
  `
}

function renderMine() {
  const pct = Math.min(100, Math.round((state.todayDone / state.todayTarget) * 100))
  const ongoing = state.history.find((h) => h.status === 1)
  const hist = state.history.filter((h) => h.status === 2).slice(0, 3)
  return `
  <div class="card">
    <div class="row between">
      <div class="row">
        <div class="bank-icon">考</div>
        <div>
          <div class="title">备考用户</div>
          <div class="sub">今日已完成 ${state.todayDone} / ${state.todayTarget} 题</div>
        </div>
      </div>
      <button class="btn btn-soft" data-go="settings">⚙ 设置</button>
    </div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="row between sub"><span>${pct}%</span><span>正确率 ${accuracy(state.totalCorrect, state.totalAnswered)}%</span></div>
  </div>

  <div class="card">
    <div class="title mb12">核心指标</div>
    <div class="metric-grid">
      <div class="metric core"><div class="num">${state.totalAnswered}</div><div class="lab">累计答题</div></div>
      <div class="metric core"><div class="num">${accuracy(state.totalCorrect, state.totalAnswered)}%</div><div class="lab">正确率</div></div>
      <div class="metric core"><div class="num">${wrongCount()}</div><div class="lab">错题</div></div>
    </div>
    <div class="metric-grid secondary">
      <div class="metric"><div class="num">${state.favIds.length}</div><div class="lab">收藏</div></div>
      <div class="metric"><div class="num">${state.examCount}</div><div class="lab">模拟考试</div></div>
    </div>
  </div>

  <div class="card">
    <div class="row between mb8">
      <div class="title">错题复习</div>
      <button class="btn btn-danger" data-act="start-wrong">去复习</button>
    </div>
    <div class="sub">还有 ${wrongCount()} 道题待巩固</div>
  </div>

  <div class="card">
    <div class="title mb8">继续学习</div>
    ${ongoing ? `<div class="sub mb8">上次做到：${ongoing.name}</div>
      <button class="btn btn-primary btn-block" data-act="resume-exam">继续答题 →</button>`
      : `<div class="sub mb8">开始今天的练习 · 随机 20 题</div>
      <button class="btn btn-primary btn-block" data-act="start-random" data-params='{"count":20}'>开始刷题</button>`}
  </div>

  <div class="card">
    <div class="title mb12">历史考试</div>
    ${hist.map((h) => `
      <div class="card tight history-item" style="margin-bottom:8px" data-go="exam-record" data-params='${JSON.stringify({ id: h.id })}'>
        <div class="row between mb8">
          <div class="title">${h.name}</div>
          <div class="score ${h.score < h.total * 0.6 ? 'bad' : ''}">${h.status === 1 ? '进行中' : h.score}</div>
        </div>
        <div class="sub">${h.at}</div>
        <div class="kv">
          <div><div class="n">${h.accuracy}%</div><div class="l">正确率</div></div>
          <div><div class="n">${h.count}</div><div class="l">题数</div></div>
          <div><div class="n">${h.duration}′</div><div class="l">用时</div></div>
          <div class="go" style="align-self:center;color:var(--primary);font-weight:600">查看详情 →</div>
        </div>
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="row between">
      <div class="title">收藏夹</div>
      <button class="btn btn-ghost" data-go="favorite">${state.favIds.length} 道</button>
    </div>
  </div>
  `
}

function renderExamRecord() {
  const h = state.history.find((x) => x.id === state.params.id) || state.history[0]
  if (h.status === 1) {
    return `<div class="card"><div class="title mb8">${h.name}</div><div class="sub mb12">考试进行中</div>
      <button class="btn btn-primary btn-block" data-act="resume-exam">继续考试</button></div>`
  }
  const bad = h.score < h.total * 0.6
  return `
  <div class="card">
    <div class="title mb8">${h.name}</div>
    <div class="sub mb8">${h.at}</div>
    <div class="big-score ${bad ? 'bad' : ''}">${h.score} <span style="font-size:16px;color:var(--muted)">/ ${h.total}</span></div>
    <div class="center sub mb12">正确率 ${h.accuracy}%</div>
    <div class="stat-4">
      <div><div class="num">${h.count}</div><div class="lab">总题数</div></div>
      <div><div class="num" style="color:var(--primary)">${h.right}</div><div class="lab">正确</div></div>
      <div><div class="num" style="color:var(--danger)">${h.wrong}</div><div class="lab">错误</div></div>
      <div><div class="num muted">${h.blank}</div><div class="lab">未答</div></div>
    </div>
  </div>
  <div class="btn-row">
    <button class="btn btn-danger" data-act="go-review-wrong" data-params='${JSON.stringify({ id: h.id })}'>查看错题</button>
    <button class="btn btn-ghost" data-act="retake" data-params='${JSON.stringify({ id: h.examId || 1 })}'>再做一次</button>
  </div>
  <div style="height:8px"></div>
  <button class="btn btn-primary btn-block" data-go="exam-review" data-params='${JSON.stringify({ id: h.id })}'>查看全部解析</button>
  `
}

function renderWrong() {
  const list = state.wrongIds.map((id) => ({ q: QUESTIONS.find((x) => x.id === id), m: state.wrongMeta[id] })).filter((x) => x.q)
  if (!list.length) return `<div class="card"><div class="empty">太棒了，暂时没有错题！</div></div>`
  return `
  <div class="card">
    <div class="row between mb12">
      <div class="title">错题本（${list.length}）</div>
      <button class="btn btn-danger" data-act="start-wrong">错题重练</button>
    </div>
    ${list.map(({ q, m }) => `
      <div class="card tight" style="margin-bottom:8px">
        <div class="title mb8" style="font-size:14px">${q.stem}</div>
        <div class="sub mb8">错 ${m?.n || 1} 次 ${m?.mastered ? '<span class="tag">已掌握</span>' : ''}</div>
        <div class="sub mb8">${q.analysis}</div>
        <div class="btn-row">
          ${!m?.mastered ? `<button class="btn btn-ghost" data-act="master-wrong" data-params='${JSON.stringify({ id: q.id })}'>掌握了</button>` : ''}
          <button class="btn btn-soft" data-act="remove-wrong" data-params='${JSON.stringify({ id: q.id })}'>移除</button>
        </div>
      </div>`).join('')}
  </div>
  `
}

function masterWrong(id) {
  state.wrongMeta[id] = { ...(state.wrongMeta[id] || { n: 1 }), mastered: true }
  render()
}
function removeWrong(id) {
  state.wrongIds = state.wrongIds.filter((x) => x !== id)
  render()
}
function removeFav(id) {
  state.favIds = state.favIds.filter((x) => x !== id)
  render()
}

function renderFavorite() {
  const list = state.favIds.map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean)
  if (!list.length) return `<div class="card"><div class="empty">还没有收藏的题目～</div></div>`
  return `
  <div class="card">
    <div class="row between mb12">
      <div class="title">我的收藏（${list.length}）</div>
      <button class="btn btn-ghost" data-act="start-fav">收藏练习</button>
    </div>
    ${list.map((q) => `
      <div class="card tight" style="margin-bottom:8px">
        <div class="title mb8" style="font-size:14px">${q.stem}</div>
        <div class="sub mb8">${q.analysis}</div>
        <button class="btn btn-soft" data-act="remove-fav" data-params='${JSON.stringify({ id: q.id })}'>取消收藏</button>
      </div>`).join('')}
  </div>
  `
}

function renderSettings() {
  return `
  <div class="card">
    <div class="title mb8">账号</div>
    <div class="setting-row"><span>昵称</span><span class="sub">备考用户</span></div>
    <div class="setting-row"><span>学习数据</span><span class="sub">累计 ${state.totalAnswered} 题 · 考试 ${state.examCount} 次</span></div>
  </div>
  <div class="card">
    <div class="title mb12">外观</div>
    <div class="theme-row">
      <div class="theme-opt ${state.theme === 'a' ? 'on' : ''}" data-act="set-theme" data-params='{"t":"a"}'>
        <div class="swatch"><div class="sw c1"></div><div class="sw c2"></div></div>
        <div class="sub">舒缓绿 ${state.theme === 'a' ? '✓' : ''}</div>
      </div>
      <div class="theme-opt ${state.theme === 'b' ? 'on' : ''}" data-act="set-theme" data-params='{"t":"b"}'>
        <div class="swatch"><div class="sw c3"></div><div class="sw c4"></div></div>
        <div class="sub">暖棕 ${state.theme === 'b' ? '✓' : ''}</div>
      </div>
    </div>
  </div>
  `
}

render()
