import io
p = r'E:\student_work\-civicquiz-main\apps\admin\src\components\ImportModal.tsx'
s = io.open(p, encoding='utf-8').read()
old = "const csv = '﻿'"
new = "const csv = '\\uFEFF'"
assert old in s, 'old not found'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
