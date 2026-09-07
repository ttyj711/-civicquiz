// 设计 token 与品牌视觉常量（ConfigProvider 与硬编码样式的唯一来源）

/** 品牌渐变（Logo 标等） */
export const BRAND_GRADIENT = 'linear-gradient(135deg,#1677ff,#69b1ff)'
export const BRAND_SHADOW = '0 2px 8px rgba(22,119,255,.45)'
export const PRIMARY = '#1677ff'

/** antd 全局主题 */
export const antdTheme = {
  token: {
    colorPrimary: PRIMARY,
    colorInfo: PRIMARY,
    colorSuccess: '#16a34a',
    colorWarning: '#f59e0b',
    colorError: '#dc2626',
    colorText: '#1f2329',
    colorTextSecondary: '#6b7280',
    colorBgLayout: '#f5f7fa',
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Layout: { siderBg: '#0e1c33', headerBg: '#ffffff', headerHeight: 56 },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: PRIMARY,
      darkItemHoverBg: 'rgba(255,255,255,0.08)',
      darkGroupTitleColor: 'rgba(255,255,255,0.45)',
      itemMarginInline: 10,
      itemBorderRadius: 8,
      itemHeight: 42,
    },
    Card: { borderRadiusLG: 14 },
    Table: { headerBg: '#fafbfc', headerColor: '#6b7280' },
  },
}
