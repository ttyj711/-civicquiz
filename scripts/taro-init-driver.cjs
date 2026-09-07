/* 驱动 taro init 交互：真 pty + 按提示词应答 */
const path = require('path')
const pty = require('node-pty')

const cwd = process.cwd()
const p = pty.spawn(
  process.execPath,
  [
    path.join(cwd, 'node_modules', '@tarojs', 'cli', 'bin', 'taro'),
    'init', 'miniapp',
    '--name', 'civicquiz-miniapp',
    '--description', '在线考试刷题小程序',
    '--typescript',
    '--css', 'Sass',
    '--npm', 'Npm',
    '--template', 'default',
  ],
  { name: 'xterm-color', cols: 100, rows: 30, cwd, env: process.env }
)

let buf = ''
let done = false
const fs = require('fs')
const log = fs.createWriteStream(path.join(cwd, 'scripts', 'taro-init.log'))
p.onData((d) => {
  process.stdout.write(d)
  log.write(d)
  if (done) return
  buf += d
  const flush = () => { buf = '' }
  if (/ES5/i.test(buf)) { p.write('n\r'); flush(); return }
  if (/y\/N/.test(buf)) { p.write('n\r'); flush(); return }                 // 任何布尔确认 → 否
  if (/请选择框架/.test(buf)) { p.write('\r'); flush(); return }            // React（默认第一项）
  if (/请选择编译工具/.test(buf)) { p.write('\r'); flush(); return }        // Webpack5（默认）
  if (/请选择.{0,6}包管理/.test(buf)) { p.write('\r'); flush(); return }    // 默认
  if (/模板源/.test(buf)) { p.write('\r'); flush(); return }                // 默认源
  if (/请选择模板/.test(buf)) { p.write('\r'); flush(); return }            // default
  if (/是否/.test(buf)) { p.write('n\r'); flush(); return }                 // 其余布尔默认否
})

p.onExit(({ exitCode }) => {
  done = true
  console.log('\n[TARO_INIT_EXIT]', exitCode)
  process.exit(exitCode || 0)
})

setTimeout(() => { console.log('\n[TIMEOUT]'); try { p.kill() } catch {} ; process.exit(1) }, 240000)
