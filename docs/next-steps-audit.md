# 当前实现盘点与下一步建议

## 1. 当前真实实现

### 1.1 已落地的后端接口

当前 API 已经提供以下能力，见 [apps/api/src/modules/orders/routes.ts](apps/api/src/modules/orders/routes.ts#L43)：

- 服务列表
- 订单列表、订单详情、创建订单
- 报价创建、确认报价
- 标记支付、支付回调模拟
- 接单、履约上传、完结订单
- 退款申请、退款审核
- 代办员列表、代办员创建、代办员审核
- 代办员结算单生成
- 财务总览

公共上传接口也已经存在，见 [apps/api/src/modules/uploads/routes.ts](apps/api/src/modules/uploads/routes.ts#L31)。

### 1.2 已落地的前端页面

用户端当前页面见 [apps/user-miniapp/src/pages.json](apps/user-miniapp/src/pages.json)：

- 首页
- 下单页
- 订单列表页
- 订单详情页

代办员端当前页面见 [apps/worker-miniapp/src/pages.json](apps/worker-miniapp/src/pages.json)：

- 工作台首页
- 接单与履约页

后台当前路由见 [apps/admin-web/src/router.ts](apps/admin-web/src/router.ts#L8)：

- 控制台
- 服务管理
- 订单管理
- 代办员管理
- 财务页

### 1.3 当前实现的演示性质

项目已经能跑通最小交易闭环，但仍带有明显 demo 特征：

- 用户端下单直接写死 demo openId，见 [apps/user-miniapp/src/pages/create-order/index.vue](apps/user-miniapp/src/pages/create-order/index.vue#L36)
- 代办员端直接写死 workerProfileId，见 [apps/worker-miniapp/src/pages/orders/index.vue](apps/worker-miniapp/src/pages/orders/index.vue#L5)
- 两个小程序端 API 地址写死为本地地址，见 [apps/user-miniapp/src/lib/api.ts](apps/user-miniapp/src/lib/api.ts#L1) 和 [apps/worker-miniapp/src/lib/api.ts](apps/worker-miniapp/src/lib/api.ts#L1)
- 数据库初始化脚本直接注入演示服务、订单、报价和履约记录，见 [apps/api/sql/init.sql](apps/api/sql/init.sql#L128)

## 2. 文档与代码差异

### 2.1 订单状态机未收口

PRD 中定义了 12 个主状态，见 [docs/prd.md](docs/prd.md#L78)。

后端代码当前只定义了 9 个状态，见 [apps/api/src/modules/orders/types.ts](apps/api/src/modules/orders/types.ts#L3)。

主要差异：

- PRD 有“待提交”“待用户确认”“待接单”“售后中”“已关闭”等更偏业务表达的状态
- 代码以“pending_quote”“pending_payment”“pending_dispatch”“pending_confirm”等工程化状态为准
- 三端页面筛选、按钮显隐、后台操作权限都会依赖状态机，因此这是当前最核心的契约缺口

### 2.2 数据模型文档比实际实现更宽

[docs/data-api.md](docs/data-api.md#L38) 中声明的接口范围明显大于当前代码：

- 用户端文档包含登录授权、服务详情、纪念馆管理；当前没有登录接口，也没有独立服务详情接口，更没有纪念馆模块
- 代办员端文档包含实名认证、异常上报、收入查询；当前没有独立实名流程接口，也没有异常上报和代办员侧收入查询接口
- 后台文档包含内容审核、运营配置；当前后台只做到订单、代办员、财务和服务只读展示
- 公共接口文档包含短信验证码、地图解析、消息通知、内容安全校验；当前只有上传接口真正实现

### 2.3 文档之间也存在阶段定义冲突

[docs/data-api.md](docs/data-api.md#L61) 把“纪念馆创建与审核”放进首版最小接口集合。

但 [docs/prd.md](docs/prd.md#L102) 明确把纪念馆放在第二阶段。

这说明当前文档本身还没有统一 MVP 范围。继续开发前，必须先定一个版本边界，否则接口优先级会一直摇摆。

## 3. 优先级判断

建议优先做“订单状态机与接口契约收敛”，再做“登录鉴权”。

原因：

- 当前三端都已经能靠 demo 身份把流程走通，登录虽然缺失，但不会阻止你继续完成核心交易闭环
- 状态机没有收口会直接影响订单筛选、按钮逻辑、页面流转、数据库状态和值班后台操作
- 一旦先做登录，后面再改状态机，三端仍然要重改一遍；反过来先把状态机和接口字段定死，登录接入只是在稳定接口外面再包一层身份来源
- 当前 typecheck 已通过，说明仓库主要问题是契约未统一，而不是工程已经不可维护

## 4. 建议开发顺序

### P0

- 统一 MVP 范围，明确首版只做“标准下单 + 询价 + 派单 + 履约 + 售后 + 结算”，纪念馆延期到第二阶段
- 统一订单状态枚举、状态迁移图、三端按钮与页面显示规则
- 按统一后的状态机回写 [docs/prd.md](docs/prd.md) 和 [docs/data-api.md](docs/data-api.md)

### P1

- 补一份正式接口契约文档，逐条列出请求、响应、错误码和状态变化
- 去掉用户端和代办员端的硬编码身份，改成可配置 demo 身份或统一登录态注入
- 去掉小程序端写死的 API 地址，改成环境配置

### P2

- 把服务详情接口从服务列表中拆出来
- 增加代办员异常上报接口
- 增加代办员收入/结算查询接口，和后台财务页形成闭环
- 明确支付回调与前台“支付占位”之间的真实边界，替换当前模拟逻辑

### P3

- 再进入登录授权、实名、纪念馆、内容审核、通知系统等扩展模块

## 5. 当前最短执行清单

1. 先画一版订单状态迁移表，基于当前代码能覆盖的路径做最小收敛。
2. 立即把 PRD 和数据接口文档收口到同一个 MVP 范围。
3. 把三端页面里所有状态判断和按钮文案改成统一枚举。
4. 把 demo openId、workerProfileId、API_BASE_URL 改成配置项。
5. 再开始补登录态注入和真实身份映射。

## 6. 当前结论

这个仓库现在最适合进入“契约收口与联调”阶段，不适合继续发散补大而全的功能文档。

`pnpm typecheck` 当前通过，说明项目基础工程是稳的；真正需要你下一步拍板的是 MVP 边界和订单状态机。