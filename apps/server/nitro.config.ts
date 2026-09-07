import { defineConfig } from "nitro"

export default defineConfig({
  serverDir: './server',
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
