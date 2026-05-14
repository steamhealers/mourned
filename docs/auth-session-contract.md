# 登录态与会话注入契约

## 1. 目标

当前仓库先使用会话占位层隔离页面和真实登录实现。

后续接入真实登录时，只替换各端 session 模块的数据来源，不直接修改页面业务逻辑。

## 2. 三端会话模型

### 2.1 用户端

文件：apps/user-miniapp/src/lib/session.ts

```ts
interface UserSession {
  authMode: 'demo' | 'wechat'
  openId: string
}
```

页面只通过 `getCurrentUserSession()` 或 `useUserSession()` 读取当前身份。

### 2.2 代办员端

文件：apps/worker-miniapp/src/lib/session.ts

```ts
interface WorkerSession {
  authMode: 'demo' | 'wechat'
  workerProfileId: number
}
```

页面只通过 `getCurrentWorkerSession()` 或 `useWorkerSession()` 读取当前身份。

### 2.3 后台管理端

文件：apps/admin-web/src/lib/session.ts

```ts
interface AdminSession {
  authMode: 'demo' | 'password' | 'wechat-work'
  adminId: string
  displayName: string
  roleCode: string
}
```

页面只通过 `getCurrentAdminSession()` 或 `useAdminSession()` 读取当前身份。

## 3. 注入原则

1. 登录接口成功后，不直接在页面里保存原始响应。
2. 登录响应先映射成三端各自的 Session 对象。
3. 再调用 `setCurrentUserSession`、`setCurrentWorkerSession` 或 `setCurrentAdminSession` 写入会话层。
4. 页面和 API 调用始终只消费会话层，不直接读取登录接口返回。

## 4. 建议的登录响应映射

### 4.1 用户端

```json
{
  "item": {
    "openId": "user-001",
    "token": "...",
    "profile": {
      "realName": "张家属"
    }
  }
}
```

映射：

```ts
setCurrentUserSession({
  authMode: 'wechat',
  openId: response.item.openId,
})
```

### 4.2 代办员端

```json
{
  "item": {
    "workerProfileId": 12,
    "token": "...",
    "profile": {
      "realName": "李代办"
    }
  }
}
```

映射：

```ts
setCurrentWorkerSession({
  authMode: 'wechat',
  workerProfileId: response.item.workerProfileId,
})
```

### 4.3 后台管理端

```json
{
  "item": {
    "adminId": "admin-001",
    "token": "...",
    "displayName": "运营主管",
    "roleCode": "ops-manager"
  }
}
```

映射：

```ts
setCurrentAdminSession({
  authMode: 'password',
  adminId: response.item.adminId,
  displayName: response.item.displayName,
  roleCode: response.item.roleCode,
})
```

## 5. 当前状态

1. 用户端和代办员端已经完成会话占位层接入。
2. 后台管理端已补充会话占位层。
3. 真实登录接口仍未实现，后续只需补接口与映射，不需要重写现有页面业务。 
