module.exports = {
  env: {
    NODE_ENV: '"production"',
  },
  defineConstants: {
    // 小程序生产环境后端地址（需 HTTPS，需在微信后台配置白名单）
    API_BASE: JSON.stringify('https://your-production-api.com'),
  },
  mini: {},
  h5: {},
};
