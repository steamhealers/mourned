# Mourned

白事服务平台 monorepo，包含用户端小程序、代办员端小程序、后台管理端和 API 服务。

## 应用结构

- `apps/user-miniapp`：用户端微信小程序，使用 uni-app 组织页面与业务层。
- `apps/worker-miniapp`：代办员端微信小程序，使用 uni-app 组织页面与业务层。
- `apps/admin-web`：后台管理端 Web。
- `apps/api`：后端 API 服务。
- `packages/domain`：共享业务类型、枚举和演示数据。
- `docs`：产品方案与技术文档。

## 开发命令

- `pnpm install`
- `pnpm build`
- `pnpm typecheck`

## 数据库

- API 使用 MySQL 8。
- 本地可通过根目录 `docker-compose.yml` 启动开发数据库。
- 初始化 SQL 位于 `apps/api/sql/init.sql`。
- API 环境变量示例位于 `apps/api/.env.example`。

## 说明

小程序端当前以微信小程序首发为目标，同时保留 uni-app 能力，后续可扩展到其他端。