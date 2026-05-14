import App from './App.vue'

/**
 * 创建 uni-app 用户端应用实例。
 *
 * @returns {{ app: { App: typeof App } }} 应用实例对象。
 */
export function createApp() {
  const app = {
    App,
  }

  return {
    app,
  }
}