export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/banks/banks',
    'pages/exams/exams',
    'pages/mine/mine',
    'pages/practice/select',
    'pages/practice/quiz',
    'pages/practice/result',
    'pages/exams/detail',
    'pages/exams/quiz',
    'pages/exams/result',
    'pages/exams/review',
    'pages/wrong/wrong',
    'pages/favorite/favorite',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '刷题备考',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F7F8F6',
  },
  tabBar: {
    color: '#A0AAA4',
    selectedColor: '#4A7C59',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index', text: '首页',
        iconPath: 'assets/tab/home.png', selectedIconPath: 'assets/tab/home-active.png',
      },
      {
        pagePath: 'pages/banks/banks', text: '刷题',
        iconPath: 'assets/tab/practice.png', selectedIconPath: 'assets/tab/practice-active.png',
      },
      {
        pagePath: 'pages/exams/exams', text: '考试',
        iconPath: 'assets/tab/exam.png', selectedIconPath: 'assets/tab/exam-active.png',
      },
      {
        pagePath: 'pages/mine/mine', text: '我的',
        iconPath: 'assets/tab/mine.png', selectedIconPath: 'assets/tab/mine-active.png',
      },
    ],
  },
})
