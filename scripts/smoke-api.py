# -*- coding: utf-8 -*-
"""
业务闭环冒烟测试（M2 验收）
覆盖链路：管理员建题 -> 用户微信登录 -> 刷题 -> 判题 -> 错题 -> 收藏 -> 考试 -> 交卷判分 -> 统计
用法: python scripts/smoke-api.py [base_url]
"""
import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3000'
PASS = 0
FAIL = 0
FAILED = []


def req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {'raw': e.read().decode()[:200]}


def check(name, ok, extra=''):
    global PASS, FAIL
    if ok:
        PASS += 1
        print('  PASS  ' + name + (' | ' + extra if extra else ''))
    else:
        FAIL += 1
        FAILED.append(name)
        print('  FAIL  ' + name + (' | ' + extra if extra else ''))


print('== 1. 管理员登录 ==')
st, r = req('POST', '/api/admin/login', {'username': 'admin', 'password': 'admin123'})
check('admin login 200', st == 200)
ATOK = r.get('token', '')
check('admin token issued', bool(ATOK))

print('== 2. 管理端题库/分类 ==')
st, r = req('GET', '/api/admin/question-banks', token=ATOK)
check('admin banks list', st == 200 and len(r) >= 1, f'banks={len(r)}')
BANK = r[0]['id'] if r else None

st, r = req('GET', '/api/admin/question-categories', token=ATOK)
check('admin categories list', st == 200 and len(r) >= 1, f'cats={len(r)}')
CAT = r[0]['id'] if r else None

print('== 3. 管理端题目 ==')
st, r = req('GET', f'/api/admin/questions?bankId={BANK}&size=5', token=ATOK)
check('admin questions list', st == 200 and r.get('total', 0) >= 5, f"total={r.get('total')}")
QID = r['items'][0]['id'] if r.get('items') else None

# 新建一道题（验证写入链路）
st, r = req('POST', '/api/admin/questions', {
    'bankId': BANK, 'categoryId': CAT, 'type': 'SINGLE',
    'content': '[冒烟] 新增测试题：1+1=?', 'analysis': '1+1=2',
    'options': [{'key': 'A', 'content': '1'}, {'key': 'B', 'content': '2'}, {'key': 'C', 'content': '3'}],
    'answerKeys': ['B'], 'difficulty': 1,
}, token=ATOK)
check('create question', st == 200 and r.get('id'), f"id={r.get('id')}")
NEW_QID = r.get('id')
if NEW_QID:
    st, r = req('PUT', f'/api/admin/questions/{NEW_QID}', {'difficulty': 3}, token=ATOK)
    check('update question', st == 200)

print('== 4. 微信用户登录(dev) ==')
st, r = req('POST', '/api/auth/login', {'code': 'smoke_test_code_001', 'nickname': '冒烟用户'})
check('user login 200', st == 200, f"uid={r.get('user', {}).get('id')}")
UTOK = r.get('token', '')
check('user token issued', bool(UTOK))

print('== 5. 用户题库浏览 ==')
st, r = req('GET', '/api/question-banks', token=UTOK)
check('user banks', st == 200 and len(r) >= 1)
st, r = req('GET', f'/api/question-banks/{BANK}', token=UTOK)
check('bank detail w/ tree', st == 200 and 'categories' in r)

print('== 6. 刷题闭环 ==')
st, r = req('POST', '/api/practice/start', {'bankId': BANK, 'mode': 'RANDOM', 'count': 5}, token=UTOK)
check('practice start', st == 200 and r.get('practiceId'), f"total={r.get('totalCount')}")
PID = r.get('practiceId')
st, r = req('GET', f'/api/practice/{PID}/questions', token=UTOK)
check('practice questions (no answer leak)', st == 200 and len(r.get('questions', [])) == 5 and 'answerKeys' not in str(r))
q1 = r['questions'][0]['id'] if r.get('questions') else None

# 提交答案（用真实答案；从管理接口查该题答案）
if q1:
    st, r = req('GET', f'/api/admin/questions?keyword=1%2B1&size=1', token=ATOK)
    # 对新题作答：B
    st, r = req('POST', f'/api/practice/{PID}/answer', {'questionId': NEW_QID, 'answer': 'B'}, token=UTOK)
    check('answer judge (correct)', st == 200 and r.get('correct') is True, f"correct={r.get('correct')}")
    st, r = req('POST', f'/api/practice/{PID}/answer', {'questionId': q1, 'answer': 'Z'}, token=UTOK)
    # Z 不在该题选项中也应返回判定（correct false 或 400），不应当 500
    check('answer weird key handled', st in (200, 400), f"status={st}")
st, r = req('POST', f'/api/practice/{PID}/finish', token=UTOK)
check('practice finish', st == 200 and r.get('totalCount') == 5, f"acc={r.get('accuracy')}")

print('== 7. 错题/收藏 ==')
st, r = req('GET', '/api/wrong-questions', token=UTOK)
check('wrong list', st == 200)
st, r = req('POST', f'/api/favorites/{q1}/', token=UTOK)
check('favorite add', st == 200)
st, r = req('GET', '/api/favorites', token=UTOK)
check('favorites list', st == 200 and len(r) >= 1)

print('== 8. 考试闭环 ==')
# 管理员创建固定组卷考试（取题库前 5 题）
st, r = req('GET', f'/api/admin/questions?bankId={BANK}&size=5', token=ATOK)
qids = [it['id'] for it in r.get('items', [])]
st, r = req('POST', '/api/admin/exams', {
    'bankId': BANK, 'name': '[冒烟] 模拟考试', 'description': 'smoke', 'duration': 30,
    'questions': [{'questionId': i, 'score': 2} for i in qids],
}, token=ATOK)
check('admin create exam (fixed)', st == 200 and r.get('id'), f"id={r.get('id')}")
EID = r.get('id')

st, r = req('GET', '/api/exams', token=UTOK)
check('user exam list', st == 200 and any(e['id'] == EID for e in r))
st, r = req('POST', f'/api/exams/{EID}/start', token=UTOK)
check('exam start', st == 200 and r.get('userExamId'), f"ueid={r.get('userExamId')}, remaining={r.get('remainingSeconds')}")
UEID = r.get('userExamId')
exam_q1 = r['questions'][0]['id'] if r.get('questions') else None

# 考试中保存答案（不应泄漏判分）
st, r = req('POST', f'/api/exams/{EID}/answer', {'userExamId': UEID, 'questionId': exam_q1, 'answer': 'A'}, token=UTOK)
check('exam save answer', st == 200 and r.get('ok') is True)

# 考试未交卷详情不暴露答案
st, r = req('GET', f'/api/user-exams/{UEID}', token=UTOK)
check('ongoing exam no answer leak', st == 200 and r.get('questions', [{}])[0].get('answerKeys') is None)

# 交卷
st, r = req('POST', f'/api/exams/{EID}/submit', {'userExamId': UEID}, token=UTOK)
check('exam submit scored', st == 200 and 'score' in r, f"score={r.get('score')}, correct={r.get('correctCount')}")

# 交卷后详情可看答案/解析
st, r = req('GET', f'/api/user-exams/{UEID}', token=UTOK)
q0 = r.get('questions', [{}])[0] if r.get('questions') else {}
check('submitted detail has keys', st == 200 and 'answerKeys' in q0)

print('== 9. 用户统计 ==')
st, r = req('GET', '/api/user/statistics', token=UTOK)
check('statistics', st == 200 and 'totalAnswered' in r, f"total={r.get('totalAnswered')}, examCount={r.get('examCount')}")
st, r = req('GET', '/api/user-exams', token=UTOK)
check('user exams history', st == 200 and len(r) >= 1)

print('== 10. 管理端统计 ==')
st, r = req('GET', '/api/admin/stats', token=ATOK)
check('admin stats', st == 200 and 'users' in r)

print(f'\n===== RESULT: PASS={PASS} FAIL={FAIL} =====')
if FAILED:
    print('FAILED:', FAILED)
    sys.exit(1)
