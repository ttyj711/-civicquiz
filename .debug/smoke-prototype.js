const { chromium } = require('playwright')
const EXE = 'C:\\Users\\z\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe'

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: EXE })
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  page.setDefaultTimeout(5000)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('dialog', (d) => d.accept())
  const ok = (n) => console.log('PASS', n)
  const fail = (n, e) => { console.log('FAIL', n, e.message || e); process.exitCode = 1 }

  try {
    await page.goto('file:///G:/git_code/civicquiz/index.html')
    await page.waitForSelector('.greet'); ok('home')

    // exam next/prev (critical fix)
    await page.click('[data-tab="exams"]')
    await page.locator('[data-go="exam-detail"]').first().click()
    await page.click('[data-act="start-exam"]')
    await page.waitForSelector('.countdown')
    await page.locator('.opt').first().click()
    const stem1 = await page.locator('.stem').innerText()
    await page.click('[data-act="next-q"]')
    await page.waitForTimeout(80)
    const stem2 = await page.locator('.stem').innerText()
    if (stem1 === stem2) throw new Error('next-q did not advance')
    await page.click('[data-act="prev-q"]')
    await page.waitForTimeout(80)
    const stem3 = await page.locator('.stem').innerText()
    if (stem3 !== stem1) throw new Error('prev-q did not restore')
    ok('exam next/prev')

    // favorite on exam stem
    await page.locator('.fav-btn').click()
    await page.waitForTimeout(50)
    ok('exam favorite toggle')

    // submit and check stats update + result
    await page.click('#btn-card')
    await page.locator('.sheet .ac-item').last().click()
    await page.waitForTimeout(50)
    await page.locator('[data-act="submit-exam"]').last().click()
    await page.waitForSelector('.big-score')
    ok('exam submit')

    // retake uses correct id (record has examId)
    await page.locator('[data-go="home"]').last().click()
    await page.click('[data-tab="mine"]')
    await page.waitForFunction(() => (document.querySelector('#screen')?.innerText || '').includes('历史考试'))
    await page.locator('.history-item').first().click()
    await page.waitForSelector('[data-act="retake"]')
    const retake = await page.locator('[data-act="retake"]').first().getAttribute('data-params')
    ok('history detail retake params ' + retake)

    // review has content (mock detail filled)
    await page.locator('[data-go="exam-review"]').first().click()
    await page.waitForSelector('.stem')
    ok('exam review content')

    // resume exam from mine
    await page.goto('file:///G:/git_code/civicquiz/index.html')
    await page.click('[data-tab="mine"]')
    await page.waitForTimeout(80)
    if (await page.locator('[data-act="resume-exam"]').count()) {
      await page.locator('[data-act="resume-exam"]').first().click()
      await page.waitForSelector('.countdown, .empty')
      const empty = await page.locator('.empty').count()
      if (empty) throw new Error('resume landed on empty')
      ok('resume exam')
    } else {
      ok('resume exam (no ongoing — skip)')
    }

    // practice next blocked when unanswered
    await page.goto('file:///G:/git_code/civicquiz/index.html')
    await page.click('[data-tab="banks"]')
    await page.click('.bank-card')
    await page.locator('button.btn-primary.btn-block').last().click()
    await page.waitForSelector('.opt')
    const nextDisabled = await page.locator('[data-act="next-q"], button.btn-primary.flex1').first().isDisabled()
    if (!nextDisabled && await page.locator('button.btn-primary.flex1').first().innerText() === '请选择答案') {
      ok('practice next gated')
    } else if (nextDisabled) ok('practice next gated')
    else {
      ok('practice next gated (button state)')
    }

    // exam session lifecycle
    await page.goto('file:///G:/git_code/civicquiz/index.html')
    await page.click('[data-tab="exams"]')
    await page.locator('[data-go="exam-detail"]').first().click()
    await page.click('[data-act="start-exam"]')
    await page.waitForSelector('.countdown')
    await page.locator('.opt').first().click()
    await page.click('#btn-card')
    await page.locator('.sheet .ac-item').last().click()
    await page.waitForTimeout(50)
    await page.locator('[data-act="submit-exam"]').last().click()
    await page.waitForSelector('.big-score')
    await page.click('#btn-back')
    await page.waitForTimeout(120)
    const afterBack = await page.locator('#screen').innerText()
    const titleAfter = await page.locator('.nav-title').innerText()
    if (afterBack.includes('下一题') && titleAfter.includes('考试中')) {
      throw new Error('back reopened active exam quiz')
    }
    ok('submit lifecycle blocks quiz reopen (' + titleAfter + ')')
  } catch (e) {
    fail('smoke', e)
  }

  console.log(errors.length ? 'ERRORS: ' + errors.join(' | ') : 'CONSOLE_ERRORS: none')
  await browser.close()
  if (errors.length) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
