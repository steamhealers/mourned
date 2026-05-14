# 数据模型与接口草案

## 1. 核心数据对象

数据库选型：MySQL 8。

首版只覆盖交易闭环相关对象。

1. 用户：openId、手机号、姓名、实名标记。
2. 代办员：关联用户、服务区域、服务标签、评分、完单量、状态。
3. 服务：服务编码、名称、交易模式、履约方式、说明。
4. 订单：订单编号、用户、服务、预约时间、地点、金额、状态、退款状态、备注。
5. 报价单：订单、报价人、报价金额、报价明细、有效期、状态。
6. 履约凭证：订单、节点类型、图片、说明、时间、经纬度。
7. 支付流水：订单、支付渠道、流水号、金额、状态、回调载荷。
8. 售后单：订单、申请原因、证据、审核说明、处理状态。
9. 结算单：代办员、结算周期、应结金额、佣金率、实发金额、状态。

纪念馆、留言、祭拜记录、内容审核对象不进入首版接口范围。

## 2. 关键字段建议

### 2.1 订单表重点字段

订单类型、服务类型、城市、区域、联系人、联系电话、预约上门时间、当前状态、支付方式、退款状态、分账状态。

### 2.2 代办员表重点字段

接单范围、服务标签、评分、完成单量、投诉次数、冻结状态。

### 2.3 履约凭证表重点字段

节点类型、文件地址、经纬度、拍摄时间、备注、审核状态。

### 2.4 纪念馆表重点字段

公开范围、家属协作成员、纪念日提醒设置、审核结果。

该对象延期到第二阶段，不进入首版实现。

## 3. 首版订单状态契约

首版订单状态与当前后端实现保持一致。

| 状态值 | 中文说明 | 允许进入方式 | 允许流出方式 |
| --- | --- | --- | --- |
| pending_quote | 待报价 | 创建询价单 | 提交报价后待用户确认，确认报价后进入 pending_payment |
| pending_payment | 待支付 | 用户确认报价 | 支付成功后进入 pending_dispatch |
| pending_dispatch | 待派单 | 直接下单或支付完成 | 后台派单并被代办员接单后进入 in_service |
| in_service | 服务中 | 代办员接单 | 提交完结后进入 pending_confirm；申请退款后进入 refund_in_progress |
| pending_confirm | 待用户确认完成 | 代办员提交完结 | 用户确认后进入 completed；申请退款后进入 refund_in_progress |
| completed | 已完成 | 用户或后台确认完结 | 发起售后后进入 refund_in_progress |
| refund_in_progress | 售后中 | 用户提交退款申请 | 审核通过进入 refunded；审核驳回或人工关闭进入 closed |
| refunded | 已退款 | 退款完成 | 终态 |
| closed | 已关闭 | 后台关闭或退款驳回后关闭 | 终态 |

## 4. 接口分组建议

### 4.1 用户端接口

首版已纳入：服务列表、提交订单、提交询价、支付、订单查询、售后申请。

延期能力：登录授权、独立服务详情、纪念馆管理。

### 4.2 代办员端接口

首版已纳入：接单列表、接单确认、到场打卡、上传履约凭证、完成任务。

延期能力：实名认证、异常上报、收入查询。

### 4.3 后台接口

首版已纳入：服务管理、订单派单、报价审核、代办员审核、售后仲裁、财务结算。

延期能力：内容审核、运营配置。

### 4.4 公共接口

首版已纳入：上传文件。

延期能力：短信验证码、地图解析、消息通知、内容安全校验。

## 5. 接口边界原则

1. 订单和履约必须分离，避免订单对象过度膨胀。
2. 报价单单独建模，便于支持多轮报价。
3. 纪念馆与订单体系分离，避免内容产品和交易产品互相污染。
4. 所有敏感操作都要记操作日志，包括改价、退款、派单、冻结代办员。

## 6. 首版最小接口契约草案

### 6.1 公共约定

1. 所有响应统一使用 `{ item }` 或 `{ items }` 包装。
2. 订单详情返回可带 `quotes`、`fulfillmentRecords` 两个聚合字段。
3. 首版默认使用 demo 身份，真实登录态后续补入，不改变当前业务字段结构。

### 6.2 服务接口

1. `GET /services`
	返回：服务列表。
	用途：用户端首页、下单页，后台服务管理只读展示。

### 6.3 订单接口

1. `GET /orders?openId=:openId`
	返回：用户订单列表。
2. `GET /orders?workerProfileId=:workerProfileId`
	返回：代办员任务列表。
3. `GET /orders?status=pending_dispatch`
	返回：待接单列表。
4. `GET /orders/:orderId`
	返回：订单详情，附带报价单和履约记录。
5. `POST /orders`
	请求字段：`openId`、`serviceCode`、`city`、`district`、`contactName`、`contactPhone`、`scheduledAt`、`notes`。
	状态变化：
	- 直接下单服务创建后进入 `pending_dispatch`
	- 询价服务创建后进入 `pending_quote`

### 6.4 报价与支付接口

1. `POST /orders/:orderId/quotes`
	请求字段：`quotedBy`、`amount`、`detail[]`、`expiresAt`。
	状态变化：订单保持 `pending_quote`，新增一条 `submitted` 报价。
2. `POST /orders/:orderId/quote-acceptance`
	请求字段：`quoteId`。
	状态变化：订单进入 `pending_payment`。
3. `POST /orders/:orderId/payment`
	请求字段：`paidAmount`、`channel`、`transactionNo`。
	状态变化：订单进入 `pending_dispatch`。
4. `POST /orders/:orderId/payment-callback`
	请求字段：与支付回调载荷兼容的 `paidAmount`、`channel`、`transactionNo`、`callbackPayload`。
	状态变化：订单进入 `pending_dispatch`。
	说明：首版用于后台模拟回调，后续再替换为真实支付通知入口。

### 6.5 派单与履约接口

1. `POST /orders/:orderId/accept`
	请求字段：`workerProfileId`。
	状态变化：订单进入 `in_service`。
2. `POST /orders/:orderId/fulfillment`
	请求字段：`stageCode`、`mediaUrl`、`latitude`、`longitude`、`description`。
	状态变化：订单状态不变，新增履约节点。
3. `POST /orders/:orderId/complete`
	请求字段：无。
	状态变化：
	- 代办员或后台提交完结后进入 `pending_confirm`
	- 用户确认完成后进入 `completed`
	首版由同一接口承载，后续可按角色拆分。

### 6.6 售后接口

1. `POST /orders/:orderId/refund-request`
	请求字段：`reason`、`evidenceUrls[]`。
	状态变化：订单进入 `refund_in_progress`，退款状态进入 `requested`。
2. `POST /orders/:orderId/refund-review`
	请求字段：`approved`、`note`。
	状态变化：
	- 审核通过：订单进入 `refunded`
	- 审核驳回：订单进入 `closed`

### 6.7 代办员与财务接口

1. `GET /workers`
	返回：代办员列表。
2. `POST /workers`
	请求字段：`openId`、`phone`、`realName`、`serviceArea`、`serviceTags[]`。
3. `POST /workers/:workerProfileId/review`
	请求字段：`status`。
4. `POST /workers/:workerProfileId/settlements`
	请求字段：`periodLabel`、`commissionRate`、`note`。
5. `GET /finance/overview`
	返回：支付流水、退款流水、结算单和聚合指标。

### 6.8 上传接口

1. `POST /uploads`
	请求方式：multipart/form-data。
	限制：仅图片，首版支持 jpeg、png、webp。
	返回：文件名与可访问 URL。