/* 种子数据（幂等可重复执行）
 * 用法：node scripts/seed.cjs
 * 内容：管理员账号、时政热点题库 + 分类树 + 20 道单选题（含选项/答案/解析）
 */
const path = require('path')
const bcrypt = require('bcryptjs')
const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://civicquiz:civicquiz@127.0.0.1:55432/civicquiz'

// 20 道时政/常识单选题：[题干, [A,B,C,D], 正确key, 解析, 分类]
const QUESTIONS = [
  ['2026年我国全年经济社会发展的主要预期目标中，国内生产总值增长预期为多少左右？', ['4%', '5%', '6%', '7%'], 'B', '2026年政府工作报告将GDP增长预期目标设定为5%左右，兼顾就业与风险防控。', '2026时政'],
  ['2026年是"十四五"规划的收官之年还是开局之年？', ['开局之年', '收官之年', '中期评估年', '过渡之年'], 'B', '十四五为2021-2025，2026年进入"十五五"规划开局之年。', '2026时政'],
  ['我国的根本政治制度是什么？', ['中国共产党领导的多党合作制度', '人民代表大会制度', '民族区域自治制度', '基层群众自治制度'], 'B', '人民代表大会制度是我国的根本政治制度。', '政治理论'],
  ['中国共产党的最高理想和最终目标是？', ['实现共同富裕', '实现共产主义', '建成小康社会', '实现现代化'], 'B', '党章明确：党的最高理想和最终目标是实现共产主义。', '政治理论'],
  ['"四个全面"战略布局中居于引领地位的是？', ['全面建成小康社会', '全面深化改革', '全面依法治国', '全面从严治党'], 'D', '全面从严治党是"四个全面"之魂，为各项事业提供政治保证。', '政治理论'],
  ['我国现行宪法是哪一年颁布的？', ['1949', '1954', '1982', '1999'], 'C', '现行宪法为1982年宪法，历经五次修正。', '常识判断'],
  ['全国人民代表大会每届任期几年？', ['3年', '4年', '5年', '6年'], 'C', '全国人大每届任期五年。', '常识判断'],
  ['下列哪个属于行政法规的制定主体？', ['全国人大', '国务院', '省级人大', '最高人民法院'], 'B', '国务院根据宪法和法律制定行政法规。', '常识判断'],
  ['我国第一部社会主义类型的宪法是？', ['《共同纲领》', '1954年宪法', '1975年宪法', '1982年宪法'], 'B', '1954年第一届全国人大通过了新中国第一部社会主义类型宪法。', '常识判断'],
  ['新发展理念的内容是？', ['创新、协调、绿色、开放、共享', '创新、改革、绿色、开放、共享', '创新、协调、环保、开放、共享', '发展、协调、绿色、开放、共享'], 'A', '五大新发展理念：创新、协调、绿色、开放、共享。', '政治理论'],
  ['我国的国体是？', ['人民代表大会制度', '人民民主专政', '多党合作制', '联邦制'], 'B', '国体即国家性质：工人阶级领导的、以工农联盟为基础的人民民主专政。', '常识判断'],
  ['2026年巴黎奥运会之后，下一届夏季奥运会将在哪座城市举办？', ['洛杉矶', '布里斯班', '东京', '马德里'], 'A', '2028年夏季奥运会主办城市为美国洛杉矶。', '2026时政'],
  ['"两个维护"是指坚决维护习近平总书记党中央的核心、全党的核心地位，坚决维护什么？', ['党的团结统一', '党中央权威和集中统一领导', '人民主体地位', '社会主义制度'], 'B', '"两个维护"：维护核心地位、维护党中央权威和集中统一领导。', '政治理论'],
  ['我国最大的经济特区是？', ['深圳', '浦东新区', '海南', '厦门'], 'C', '海南全省为我国最大的经济特区。', '常识判断'],
  ['党的二十大提出，到2035年我国要基本实现什么？', ['共同富裕', '社会主义现代化', '共产主义', '全面小康'], 'B', '2035年基本实现社会主义现代化，本世纪中叶建成社会主义现代化强国。', '政治理论'],
  ['2026年中央一号文件聚焦的主题是？', ['乡村振兴', '科技创新', '碳达峰', '数字经济'], 'A', '近年来中央一号文件持续聚焦"三农"，全面推进乡村振兴。', '2026时政'],
  ['我国宪法规定的公民基本权利不包括？', ['选举权', '受教育权', '宗教信仰自由', '罢工自由'], 'D', '现行宪法未规定罢工自由；前三项均为公民基本权利。', '常识判断'],
  ['全党开展党史学习教育的目标要求是？', ['学史明理、学史增信、学史崇德、学史力行', '学懂、弄通、做实', '不忘初心、牢记使命', '自我净化、自我完善'], 'A', '党史学习教育十二字总要求：明理、增信、崇德、力行。', '政治理论'],
  ['我国的土地所有制形式是？', ['土地私有制', '国家所有制和劳动群众集体所有制', '全部国有', '全部集体所有'], 'B', '宪法规定：城市土地国有，农村和城市郊区土地除法律规定外属集体所有。', '常识判断'],
  ['新时代我国社会主要矛盾是什么？', ['人民日益增长的物质文化需要同落后的社会生产之间的矛盾', '人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾', '发展与安全的矛盾', '效率与公平的矛盾'], 'B', '十九大以来社会主要矛盾表述为后者。', '政治理论'],
]

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  // 1. 管理员
  const hash = bcrypt.hashSync('admin123', 10)
  await client.query(
    `INSERT INTO sys_admin (username, password_hash, nickname)
     VALUES ('admin', $1, '管理员')
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [hash]
  )

  // 2. 题库
  let bank = (await client.query(`SELECT id FROM question_bank WHERE name = $1`, ['时政热点题库'])).rows[0]
  if (!bank) {
    bank = (await client.query(
      `INSERT INTO question_bank (name, description) VALUES ($1, $2) RETURNING id`,
      ['时政热点题库', '时政热点与政治理论常识刷题']
    )).rows[0]
  }
  const bankId = bank.id

  // 3. 分类（顶级三个）
  const catNames = ['2026时政', '政治理论', '常识判断']
  const catIds = {}
  for (const name of catNames) {
    let c = (await client.query(`SELECT id FROM question_category WHERE bank_id = $1 AND name = $2`, [bankId, name])).rows[0]
    if (!c) {
      c = (await client.query(
        `INSERT INTO question_category (bank_id, parent_id, name) VALUES ($1, 0, $2) RETURNING id`,
        [bankId, name]
      )).rows[0]
    }
    catIds[name] = c.id
  }

  // 4. 题目（幂等：按题干判重）
  let inserted = 0
  for (const [content, opts, answerKey, analysis, cat] of QUESTIONS) {
    const exists = (await client.query(`SELECT id FROM question WHERE content = $1`, [content])).rows[0]
    if (exists) continue
    const q = (await client.query(
      `INSERT INTO question (bank_id, category_id, type, content, analysis, difficulty)
       VALUES ($1, $2, 'SINGLE', $3, $4, 2) RETURNING id`,
      [bankId, catIds[cat], content, analysis]
    )).rows[0]
    const keys = ['A', 'B', 'C', 'D']
    const optIds = {}
    for (let i = 0; i < opts.length; i++) {
      const o = (await client.query(
        `INSERT INTO question_option (question_id, option_key, content, sort) VALUES ($1, $2, $3, $4) RETURNING id`,
        [q.id, keys[i], opts[i], i]
      )).rows[0]
      optIds[keys[i]] = o.id
    }
    await client.query(`INSERT INTO question_answer (question_id, option_id) VALUES ($1, $2)`, [q.id, optIds[answerKey]])
    inserted++
  }

  // 5. 冗余统计同步
  await client.query(
    `UPDATE question_bank SET question_count = (SELECT COUNT(*) FROM question WHERE bank_id = $1) WHERE id = $1`,
    [bankId]
  )

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM sys_admin) AS admins,
      (SELECT COUNT(*) FROM question_bank) AS banks,
      (SELECT COUNT(*) FROM question_category) AS categories,
      (SELECT COUNT(*) FROM question) AS questions,
      (SELECT COUNT(*) FROM question_option) AS options,
      (SELECT COUNT(*) FROM question_answer) AS answers`)
  console.log('SEED OK', counts.rows[0], `inserted=${inserted}`)
  await client.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
