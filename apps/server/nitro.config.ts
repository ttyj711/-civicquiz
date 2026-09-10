import { defineConfig } from "nitro"
import errorHandler from './server/error'

export default defineConfig({
  serverDir: './server',
  // workspace 包为 TS 源码（无构建产物），内联进产物一起转译（不 externalize）
  noExternals: ['@civicquiz/shared'],
  // 统一错误响应格式（生产隐藏 5xx 细节）；开发环境同样使用，便于前端拿到 message
  errorHandler: './server/error.ts',
  devErrorHandler: errorHandler,
  routeRules: {
    // 开发/联调期放开跨域（微信真机请求需在微信公众平台配置合法域名；生产建议收紧来源）
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    },
  },
});
