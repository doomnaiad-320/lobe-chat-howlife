# Phase 2: 消费扣减系统设计方案

> 版本: v1.1
> 更新时间: 2024-12-25
> 状态：待审查

## 一、核心目标

建立一个**管理员控制的模型计费系统**：

1. **管理员提供统一服务**：管理员配置 API Key，用户使用管理员的服务
2. **用户无法自定义**：隐藏用户自己配置服务商 / 模型的功能
3. **统一计费扣减**：用户使用模型时自动按配置价格扣费
4. **API Key 安全**：Key 加密存储在后端，永不暴露给前端

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        系统架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin 后台                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • 配置服务商凭证 (API Key + Base URL) - 加密存储            ││
│  │ • 配置模型列表、价格、能力                                   ││
│  │ • 管理用户余额                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     后端代理模式                             ││
│  │                                                              ││
│  │  用户前端          自己的后端              AI 服务商          ││
│  │  ┌──────┐         ┌──────────┐           ┌──────────┐       ││
│  │  │      │ 请求    │          │  用Key请求 │          │       ││
│  │  │ 消息 │ ──────→ │  代理    │ ────────→ │  OpenAI  │       ││
│  │  │      │         │  服务    │           │  Claude  │       ││
│  │  │      │ ←────── │          │ ←──────── │  ...     │       ││
│  │  └──────┘ 响应    └────┬─────┘  AI响应    └──────────┘       ││
│  │                        │                                     ││
│  │                        ↓                                     ││
│  │              计算费用 + 扣减余额                              ││
│  │                                                              ││
│  │  ✅ API Key 加密存储在后端，永不暴露给前端                    ││
│  │  ✅ 用户无法绕过计费                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 三、数据库设计

### 3.1 已有表（Phase 1 完成）

```sql
-- 用户余额表
user_balances (
  user_id,          -- 用户ID
  balance,          -- 当前余额
  created_at,
  updated_at
)

-- 余额变动日志表
balance_logs (
  id,
  user_id,          -- 用户ID
  type,             -- 类型: recharge/consume/adjust
  amount,           -- 变动金额
  balance_before,   -- 变动前余额
  balance_after,    -- 变动后余额
  description,      -- 描述
  operator_id,      -- 操作人
  created_at
)
```

### 3.2 新增表

```sql
-- 管理员服务商凭证表（API Key 加密存储）
CREATE TABLE admin_provider_config (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(100) NOT NULL UNIQUE,  -- openai/anthropic/custom 等
  display_name VARCHAR(200),              -- 显示名称

  -- 凭证信息（加密存储，使用与原项目相同的加密方式）
  base_url TEXT NOT NULL,                 -- https://api.openai.com/v1
  api_key_encrypted TEXT NOT NULL,        -- 加密后的 API Key

  -- 状态
  enabled BOOLEAN DEFAULT TRUE,
  sort INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 管理员模型配置表（全局生效，所有用户共享）
CREATE TABLE admin_model_config (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(100) NOT NULL,           -- 关联的服务商ID
  model_id VARCHAR(200) NOT NULL,           -- 模型ID (gpt-4o/claude-3.5-sonnet)
  display_name VARCHAR(200),                -- 显示名称
  description TEXT,                         -- 模型描述

  -- 模型类型
  type VARCHAR(20) DEFAULT 'chat',          -- chat/image/embedding/tts/stt/realtime

  -- 模型能力 (abilities)
  ability_function_call BOOLEAN DEFAULT FALSE,  -- 函数调用/工具使用
  ability_vision BOOLEAN DEFAULT FALSE,         -- 视觉理解（识别图片）
  ability_reasoning BOOLEAN DEFAULT FALSE,      -- 深度思考/推理
  ability_search BOOLEAN DEFAULT FALSE,         -- 联网搜索
  ability_image_output BOOLEAN DEFAULT FALSE,   -- 图片生成
  ability_video BOOLEAN DEFAULT FALSE,          -- 视频理解

  -- 上下文配置
  context_window_tokens INTEGER,            -- 上下文长度
  max_output_tokens INTEGER,                -- 最大输出长度

  -- 价格配置（USD）
  input_price DECIMAL(20, 10),              -- 输入价格/百万token (NULL=使用默认×倍率)
  output_price DECIMAL(20, 10),             -- 输出价格/百万token
  multiplier DECIMAL(5, 2) DEFAULT 1.0,     -- 价格倍率（基于model-bank默认价格）

  -- 来源标识
  is_custom BOOLEAN DEFAULT FALSE,          -- 是否为完全自定义模型（不在model-bank中）

  -- 状态控制
  enabled BOOLEAN DEFAULT TRUE,             -- 是否启用（用户可见/可用）
  sort INTEGER DEFAULT 0,                   -- 排序权重

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(provider, model_id)
);

-- 管理员全局设置表
CREATE TABLE admin_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 预置设置项:
-- global_price_multiplier: {"value": 1.5}  -- 全局价格倍率
-- min_balance_threshold: {"value": 0.01}   -- 最低余额阈值（元）
-- currency: {"code": "CNY", "symbol": "¥"} -- 货币设置
-- usd_to_cny_rate: {"value": 7.3}          -- 汇率
```

### 3.3 API Key 加密方案

使用与原项目相同的加密方式（KeyVaultsGateKeeper）：

```typescript
// 存储时加密
const encryptedKey = await KeyVaultsGateKeeper.encrypt(apiKey);

// 使用时解密（仅在后端）
const decryptedKey = await KeyVaultsGateKeeper.decrypt(encryptedKey);
```

## 四、Admin 后台设计

### 4.1 侧边菜单结构

```
┌──────────────────┐
│  HowLife Admin   │
├──────────────────┤
│ 📊 仪表盘        │  /admin
│ 👥 用户管理      │  /admin/users
│ 💰 余额日志      │  /admin/logs
│ 🔌 服务商管理    │  /admin/providers   ← 新增
│ 🤖 模型管理      │  /admin/models
│ ⚙️ 系统设置      │  /admin/settings
├──────────────────┤
│ 🚪 退出登录      │
└──────────────────┘
```

### 4.2 服务商管理页面（新增）

```
┌─────────────────────────────────────────────────────────────────┐
│ 服务商管理                                           [添加服务商]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 服务商      │ Base URL                      │ API Key  │ 状态  │
├─────────────┼───────────────────────────────┼──────────┼───────┤
│ OpenAI      │ https://api.openai.com/v1    │ sk-***   │ [启用]│
│ Anthropic   │ https://api.anthropic.com/v1 │ sk-***   │ [启用]│
│ 自定义中转   │ https://my-proxy.com/v1      │ sk-***   │ [启用]│
└─────────────┴───────────────────────────────┴──────────┴───────┘

注：API Key 显示为 sk-*** 形式，完整 Key 加密存储
```

### 4.3 添加 / 编辑服务商弹窗

```
┌────────────────────────────────────────────────────┐
│ 添加服务商                                  [×]    │
├────────────────────────────────────────────────────┤
│                                                    │
│ 服务商ID:     [openai         ]  (必填，唯一)     │
│ 显示名称:     [OpenAI         ]                   │
│                                                    │
│ Base URL:     [https://api.openai.com/v1  ]       │
│ API Key:      [sk-xxxxxxxxxxxxxxxx        ] 🔒    │
│               (加密存储，不会暴露给前端)           │
│                                                    │
│                    [取消]  [保存]                  │
└────────────────────────────────────────────────────┘
```

### 4.4 模型管理页面

```
┌─────────────────────────────────────────────────────────────────┐
│ 模型管理                                                        │
├─────────────────────────────────────────────────────────────────┤
│ [同步默认模型]  [添加自定义模型]           搜索: [________]     │
├─────────────────────────────────────────────────────────────────┤
│ 全局价格倍率: [1.5]  (所有模型默认价格 × 此倍率)      [保存]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 服务商     │ 模型           │ 类型  │ 能力      │ 倍率 │ 状态  │
├────────────┼────────────────┼───────┼───────────┼──────┼───────┤
│ openai     │ gpt-4o         │ chat  │ 🔧🖼️🔍   │ ×1.0 │ [启用]│
│ openai     │ gpt-4o-mini    │ chat  │ 🔧🖼️     │ ×1.0 │ [启用]│
│ anthropic  │ claude-3.5     │ chat  │ 🔧🖼️🧠   │ ×1.2 │ [启用]│
│ openai     │ dall-e-3       │ image │ 🎨       │ ×1.5 │ [禁用]│
│ 🆕 custom  │ my-llama       │ chat  │ 🔧       │ -    │ [启用]│
└────────────┴────────────────┴───────┴───────────┴──────┴───────┘

能力图标: 🔧函数调用 🖼️视觉 🧠推理 🔍搜索 🎨图片生成 📹视频
```

### 4.5 添加 / 编辑模型弹窗

```
┌────────────────────────────────────────────────────┐
│ 添加模型                                    [×]    │
├────────────────────────────────────────────────────┤
│                                                    │
│ ─── 基本信息 ───                                   │
│ 服务商:       [openai          ▼]  (必须先配置)   │
│ 模型ID:       [gpt-4o-new        ]  (必填)        │
│ 显示名称:     [GPT-4o New        ]                │
│ 描述:         [_________________ ]                │
│ 模型类型:     [chat             ▼]                │
│               (chat/image/embedding/tts/stt)      │
│                                                    │
│ ─── 模型能力 ───                                   │
│ ☑ 函数调用    ☑ 视觉理解    ☐ 深度思考            │
│ ☐ 联网搜索    ☐ 图片生成    ☐ 视频理解            │
│                                                    │
│ ─── 上下文配置 ───                                 │
│ 上下文长度:   [128000    ] tokens                 │
│ 最大输出:     [4096      ] tokens                 │
│                                                    │
│ ─── 价格配置 ───                                   │
│ ○ 使用默认价格 × 倍率                              │
│   价格倍率:   [1.5       ]                        │
│                                                    │
│ ○ 自定义价格                                       │
│   输入价格:   [$2.50     ] /百万token             │
│   输出价格:   [$10.00    ] /百万token             │
│                                                    │
│                    [取消]  [保存]                  │
└────────────────────────────────────────────────────┘
```

### 4.6 系统设置页面

```
┌─────────────────────────────────────────────────────────────────┐
│ 系统设置                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ─── 价格设置 ───                                                │
│ 全局价格倍率:     [1.5    ]  (model-bank默认价格 × 此倍率)      │
│ 最低余额阈值:     [0.01   ]  元 (低于此值禁止请求)              │
│                                                                 │
│ ─── 货币设置 ───                                                │
│ 显示货币:         [CNY (¥)     ▼]                              │
│ USD兑CNY汇率:     [7.3    ]                                    │
│                                                                 │
│                                              [保存设置]         │
└─────────────────────────────────────────────────────────────────┘
```

## 五、前端改造

### 5.1 改造概览

| 改动点               | 原逻辑          | 新逻辑              | 优先级 |
| -------------------- | --------------- | ------------------- | ------ |
| 设置 - AI 服务商页面 | 用户自己配置    | **隐藏整个功能**    | P0     |
| 发现 - 模型列表      | 读取 model-bank | **从后端 API 获取** | P0     |
| 模型详情             | 跳转页面        | **弹窗展示**        | P1     |
| 模型选择器           | 读取用户配置    | **从后端 API 获取** | P0     |
| AI 请求              | 前端直接请求    | **后端代理请求**    | P0     |

### 5.2 隐藏 "设置 - AI 服务商" 页面

**原因**：用户无需自己配置服务商和模型，全部由管理员在后台配置

**涉及文件**：

```
src/app/[variants]/(main)/settings/provider/
├── (list)/                    # 服务商列表页
├── ProviderMenu/              # 服务商侧边菜单
├── detail/                    # 服务商详情页
├── features/                  # 功能组件
└── _layout/                   # 布局组件
```

**实施方案**：

1. 在设置页面的 Tab / 菜单中隐藏 "AI 服务商" 入口
2. 相关路由返回 404 或重定向

**需要修改的文件**：

- `src/store/global/initialState.ts` - 移除 SettingsTabs.Provider
- `src/app/[variants]/(main)/settings/hooks/useCategory.tsx` - 移除 provider 菜单项
- `desktopRouter.config.tsx` / `mobileRouter.config.tsx` - 移除或注释 provider 路由

### 5.3 模型列表改为弹窗展示

**原逻辑**：

```
用户点击模型卡片 → navigate('/discover/model/{id}') → 跳转详情页
```

**新逻辑**：

```
用户点击模型卡片 → 打开 Modal → 显示详情（含价格）
```

**涉及文件**：

```
src/app/[variants]/(main)/discover/(list)/model/
├── features/List/Item.tsx     # 修改点击行为
├── features/List/index.tsx    # 添加 Modal 状态管理
└── features/ModelDetailModal/ # 新增弹窗组件
    ├── index.tsx
    ├── PricingInfo.tsx        # 价格信息展示
    └── AbilityTags.tsx        # 能力标签
```

**当前代码**（Item.tsx）：

```typescript
// 第60-68行
const link = urlJoin('/discover/model', identifier);
onClick={() => {
  navigate(link);  // ← 跳转
}}
```

**修改为**：

```typescript
onClick={() => {
  onSelect?.(identifier);  // ← 触发弹窗
}}
```

### 5.4 模型详情弹窗设计

```
┌────────────────────────────────────────────────────┐
│  GPT-4o                                    [×]     │
│  OpenAI                                            │
│                                                    │
│  最新的多模态旗舰模型，支持图像理解和函数调用。      │
│                                                    │
├────────────────────────────────────────────────────┤
│  模型能力                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐                 │
│  │🔧函数  │ │🖼️视觉 │ │🔍搜索  │                 │
│  └────────┘ └────────┘ └────────┘                 │
│                                                    │
├────────────────────────────────────────────────────┤
│  💰 价格信息                                       │
│  ┌──────────────────────────────────────────────┐ │
│  │ 输入:  ¥0.018 / 千字                         │ │
│  │ 输出:  ¥0.073 / 千字                         │ │
│  │ ─────────────────────────────────────────── │ │
│  │ 预估: 1000字对话约 ¥0.09                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
├────────────────────────────────────────────────────┤
│  📊 技术参数                                       │
│  • 上下文长度: 128,000 tokens                     │
│  • 最大输出: 4,096 tokens                         │
│                                                    │
│                         [使用此模型]               │
└────────────────────────────────────────────────────┘
```

### 5.5 模型选择器改造

**原逻辑**：从用户配置的 `ai_models` 表获取模型列表

**新逻辑**：从 `admin_model_config` 表获取 `enabled=true` 的模型列表

**涉及文件**：

```
src/components/ModelSelect/
src/store/aiInfra/
src/services/aiModel/
```

**新增 API**：

```typescript
// tRPC: model.getAvailableModels
// 返回 admin_model_config 中 enabled=true 的模型
```

### 5.6 AI 请求改为后端代理（核心安全措施）

**原逻辑**：前端直接请求 AI 服务商

**新逻辑**：前端请求自己的后端，后端代理请求 AI 服务商

```
原来:  前端 ──(带Key)──→ OpenAI/Claude
现在:  前端 ──(无Key)──→ 自己后端 ──(带Key)──→ OpenAI/Claude
```

**好处**：

- API Key 加密存储在后端，永不暴露给前端
- 用户无法绕过计费
- 可以在后端统一做余额检查和扣费

**涉及文件**：

```
src/app/(backend)/webapi/chat/route.ts       # 已有的代理入口
src/server/services/chat/                    # 聊天服务
```

**原项目已有后端代理模式**，只需确保：

1. 使用 `admin_provider_config` 中的凭证
2. 强制所有请求走后端代理（禁用 fetchOnClient）

## 六、扣费流程

### 6.1 完整请求流程（简化版）

```
用户发送消息
      ↓
┌────────────────────┐
│ 1. 检查用户余额     │ ← balance > min_threshold
└─────────┬──────────┘
          ↓ 余额充足
┌────────────────────┐
│ 2. 获取服务商凭证   │ ← 从 admin_provider_config 解密 API Key
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ 3. 获取模型价格配置 │ ← 从 admin_model_config 读取
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ 4. 后端代理请求AI   │ ← 使用解密的 Key 请求服务商
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ 5. 计算实际费用     │
│ = (input_tokens × input_price    │
│  + output_tokens × output_price) │
│  / 1,000,000                     │
│  × multiplier                    │
│  × usd_to_cny_rate               │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ 6. 扣减余额        │ ← 事务操作
│  - UPDATE user_balances          │
│  - INSERT balance_logs           │
└─────────┬──────────┘
          ↓
      返回响应给前端
```

**注意**：不需要验证模型可用性，管理员手动保证模型可用。

### 6.2 错误处理

| 错误码               | 场景           | 用户提示                     |
| -------------------- | -------------- | ---------------------------- |
| INSUFFICIENT_BALANCE | 余额不足       | "余额不足，请充值"           |
| PROVIDER_ERROR       | 服务商请求失败 | "服务暂时不可用，请稍后重试" |
| BILLING_ERROR        | 扣费失败       | "计费异常，请联系客服"       |

### 6.3 余额不足提示

```
┌────────────────────────────────────────┐
│  ⚠️ 余额不足                           │
│                                        │
│  您的当前余额为 ¥0.00，无法发送消息。   │
│                                        │
│  [查看余额]  [联系充值]                 │
└────────────────────────────────────────┘
```

## 七、API 设计

### 7.1 Admin API（REST）

| 方法           | 路径                         | 说明                       |
| -------------- | ---------------------------- | -------------------------- |
| **服务商管理** |                              |                            |
| GET            | /api/admin/providers         | 获取所有服务商配置         |
| POST           | /api/admin/providers         | 添加服务商配置             |
| PUT            | /api/admin/providers/:id     | 更新服务商配置             |
| DELETE         | /api/admin/providers/:id     | 删除服务商配置             |
| **模型管理**   |                              |                            |
| GET            | /api/admin/models            | 获取所有模型配置           |
| POST           | /api/admin/models            | 添加模型配置               |
| PUT            | /api/admin/models/:id        | 更新模型配置               |
| DELETE         | /api/admin/models/:id        | 删除模型配置               |
| POST           | /api/admin/models/sync       | 从 model-bank 同步默认模型 |
| PUT            | /api/admin/models/:id/toggle | 启用 / 禁用模型            |
| **系统设置**   |                              |                            |
| GET            | /api/admin/settings          | 获取全局设置               |
| PUT            | /api/admin/settings/:key     | 更新全局设置               |

### 7.2 用户端 API（tRPC）

| 方法                     | 说明                             |
| ------------------------ | -------------------------------- |
| model.getAvailableModels | 获取可用模型列表（enabled=true） |
| model.getModelDetail     | 获取模型详情（价格、能力等）     |
| balance.getBalance       | 获取当前余额                     |
| balance.getLogs          | 获取余额变动日志                 |

### 7.3 内部 API

| 方法                   | 说明                                 |
| ---------------------- | ------------------------------------ |
| getProviderCredentials | 获取解密后的服务商凭证（仅后端使用） |
| calculateCost          | 计算请求费用                         |
| deductBalance          | 扣减余额（事务）                     |

## 八、实施计划

### Phase 2.1: Admin 框架升级

- [ ] 创建 Admin 侧边菜单布局组件
- [ ] 重构现有 Admin 页面适配新布局
- [ ] 添加仪表盘页面（基础统计）

### Phase 2.2: 数据库与服务商管理

- [ ] 创建 admin_provider_config 表
- [ ] 创建 admin_model_config 表
- [ ] 创建 admin_settings 表
- [ ] 实现服务商 CRUD API（含 Key 加密）
- [ ] 实现 Admin 服务商管理页面

### Phase 2.3: 模型管理

- [ ] 实现模型 CRUD API
- [ ] 实现 Admin 模型管理页面
- [ ] 实现 "同步默认模型" 功能（从 model-bank 导入）
- [ ] 实现系统设置页面

### Phase 2.4: 前端改造 - 隐藏用户配置

- [ ] 隐藏 "设置 - AI 服务商" 菜单入口
- [ ] 移除 / 注释相关路由配置
- [ ] 测试确保用户无法访问

### Phase 2.5: 前端改造 - 模型列表

- [ ] 改造 "发现 - 模型列表" 数据源（从后端获取）
- [ ] 实现模型详情弹窗组件
- [ ] 添加价格信息展示
- [ ] 修改模型选择器数据源

### Phase 2.6: 后端代理与扣费

- [ ] 确保所有 AI 请求走后端代理
- [ ] 使用 admin_provider_config 中的凭证
- [ ] 实现请求前余额检查
- [ ] 实现请求后费用计算
- [ ] 实现余额扣减（事务保证）
- [ ] 实现余额不足提示

### Phase 2.7: 测试与优化

- [ ] 端到端流程测试
- [ ] 并发扣费测试
- [ ] API Key 安全性测试（确保不暴露）
- [ ] 性能优化

## 九、文件变更清单

### 9.1 新增文件

```
# 数据库
packages/database/src/schemas/adminProviderConfig.ts    ← 新增
packages/database/src/schemas/adminModelConfig.ts
packages/database/src/schemas/adminSettings.ts
packages/database/migrations/xxxx_admin_tables.sql

# Admin API
src/app/(backend)/api/admin/providers/route.ts          ← 新增
src/app/(backend)/api/admin/providers/[id]/route.ts     ← 新增
src/app/(backend)/api/admin/models/route.ts
src/app/(backend)/api/admin/models/[id]/route.ts
src/app/(backend)/api/admin/models/sync/route.ts
src/app/(backend)/api/admin/settings/route.ts
src/app/(backend)/api/admin/settings/[key]/route.ts

# Admin 页面
src/app/(admin-standalone)/admin/_layout/AdminLayout.tsx
src/app/(admin-standalone)/admin/_layout/Sidebar.tsx
src/app/(admin-standalone)/admin/page.tsx               # 仪表盘
src/app/(admin-standalone)/admin/providers/page.tsx     # 服务商管理 ← 新增
src/app/(admin-standalone)/admin/models/page.tsx        # 模型管理
src/app/(admin-standalone)/admin/settings/page.tsx      # 系统设置

# 前端组件
src/app/[variants]/(main)/discover/(list)/model/features/ModelDetailModal/
├── index.tsx
├── PricingInfo.tsx
└── AbilityTags.tsx

# 服务层
src/server/services/adminProvider/index.ts              # 服务商凭证管理（含加密解密）
src/server/services/billing/index.ts                    # 计费服务
```

### 9.2 修改文件

```
# 隐藏 AI 服务商配置
src/store/global/initialState.ts                        # 移除 SettingsTabs.Provider
src/app/[variants]/(main)/settings/hooks/useCategory.tsx
src/app/[variants]/desktopRouter.config.tsx
src/app/[variants]/mobileRouter.config.tsx

# 模型列表改造
src/app/[variants]/(main)/discover/(list)/model/features/List/Item.tsx
src/app/[variants]/(main)/discover/(list)/model/features/List/index.tsx
src/app/[variants]/(main)/discover/(list)/model/index.tsx

# 模型选择器
src/components/ModelSelect/
src/store/aiInfra/slices/aiModel/

# AI 请求（确保使用后端代理）
src/app/(backend)/webapi/chat/route.ts                  # 使用 admin 凭证
src/server/services/chat/                               # 添加扣费逻辑
```

## 十、安全措施

### 10.1 API Key 保护

| 措施     | 说明                                        |
| -------- | ------------------------------------------- |
| 加密存储 | 使用 KeyVaultsGateKeeper 加密，与原项目一致 |
| 后端解密 | 仅在后端代理请求时解密使用                  |
| 不传前端 | API Key 永远不会出现在前端代码或网络请求中  |
| 日志脱敏 | 日志中不记录完整 Key                        |

### 10.2 计费安全

| 措施     | 说明                             |
| -------- | -------------------------------- |
| 后端代理 | 强制所有 AI 请求走后端，无法绕过 |
| 事务扣费 | 使用数据库事务，防止并发问题     |
| 余额检查 | 请求前检查余额，余额不足拒绝请求 |

## 十一、注意事项

1. **API Key 安全**: 加密存储，仅后端使用，永不暴露给前端
2. **并发安全**: 扣费操作使用数据库事务 + `FOR UPDATE` 锁
3. **价格精度**: 使用 `DECIMAL(20, 10)` 存储，避免浮点数精度问题
4. **货币转换**: model-bank 价格为 USD，显示时按汇率转 CNY
5. **向后兼容**: 保留原有代码结构，通过功能开关控制
6. **错误处理**: 所有关键操作需有明确的错误提示
7. **日志记录**: 扣费操作需记录详细日志便于审计

## 十二、验收标准

- [ ] 用户无法访问 "设置 - AI 服务商" 页面
- [ ] 用户只能看到管理员配置的模型
- [ ] API Key 不会暴露给前端（检查网络请求）
- [ ] 所有 AI 请求走后端代理
- [ ] 余额不足时有友好提示
- [ ] 每次请求后正确扣费
- [ ] 扣费记录完整可查
- [ ] Admin 后台可正常管理服务商、模型和价格
