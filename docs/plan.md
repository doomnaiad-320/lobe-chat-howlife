# 用户管理后台开发计划

## ✅ 已完成

### 1. 数据库表

- **user_balances** 表：存储用户余额信息
  - `packages/database/src/schemas/userBalance.ts`
  - 迁移文件：`packages/database/migrations/0063_stormy_rage.sql`

### 2. 管理员认证 API

- **登录 API**: `POST /api/admin/auth` (admin/admin123)
- **验证 API**: `GET /api/admin/auth`
- **登出 API**: `DELETE /api/admin/auth`
- 文件：`src/app/(backend)/api/admin/auth/route.ts`
- 辅助库：`src/libs/admin-auth/index.ts`

### 3. 用户管理 API

- **用户列表**: `GET /api/admin/users?page=1&pageSize=20&search=xxx`
- **用户详情**: `GET /api/admin/users/[id]`
- **更新用户**: `PATCH /api/admin/users/[id]` (封禁 / 解封 / 角色)
- **余额操作**: `POST /api/admin/users/[id]/balance` (充值 / 扣减 / 设置)

### 4. 管理后台页面

- **登录页**: `/admin/login`
- **用户管理**: `/admin/users`
- 布局：`src/app/[variants]/(admin)/layout.tsx`

---

## 文件清单

```
新增文件:
├── packages/database/
│   ├── src/schemas/userBalance.ts          # 余额表 Schema
│   ├── src/models/userBalance.ts           # 余额 Model
│   └── migrations/0063_stormy_rage.sql     # 迁移文件
├── src/app/(backend)/api/admin/
│   ├── auth/route.ts                       # 管理员认证
│   └── users/
│       ├── route.ts                        # 用户列表
│       └── [id]/
│           ├── route.ts                    # 用户详情/更新
│           └── balance/route.ts            # 余额操作
├── src/app/[variants]/(admin)/
│   ├── layout.tsx                          # 管理后台布局
│   └── admin/
│       ├── page.tsx                        # 首页重定向
│       ├── login/page.tsx                  # 登录页
│       └── users/page.tsx                  # 用户管理页
└── src/libs/admin-auth/index.ts            # 管理员验证辅助
```

---

## 使用说明

### 1. 执行数据库迁移

```bash
DATABASE_URL="your_database_url" pnpm db:migrate
```

### 2. 配置管理员账号（可选）

在环境变量中设置：

```env
ADMIN_USERNAME=admin    # 默认: admin
ADMIN_PASSWORD=admin123 # 默认: admin123
```

### 3. 访问管理后台

- 登录页：`http://localhost:3010/admin/login`
- 用户管理：`http://localhost:3010/admin/users`

### 4. API 使用示例

**登录**

```bash
curl -X POST http://localhost:3010/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**获取用户列表**

```bash
curl http://localhost:3010/api/admin/users \
  --cookie "admin_token=xxx"
```

**充值余额**

```bash
curl -X POST http://localhost:3010/api/admin/users/{userId}/balance \
  -H "Content-Type: application/json" \
  --cookie "admin_token=xxx" \
  -d '{"action":"recharge","amount":100}'
```

---

## 后续可扩展

1. **前端用户余额展示**：修改 `getUserState` 返回用户余额
2. **消费扣减**：在消息发送时自动扣减余额
3. **充值记录**：新增充值 / 消费记录表
4. **更多管理功能**：系统配置、数据统计等
