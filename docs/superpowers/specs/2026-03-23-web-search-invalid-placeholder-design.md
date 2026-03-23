# CCIC Web Search Invalid Placeholder Design

## Goal

将 `apps/web` 的 `/search` 页面临时调整为“占位查询模式”：用户点击查询时，只要输入非空内容，就统一显示“此次查询无效 请仔细核对4位防伪编码输入是否正确”；同时保留空输入时现有的“防伪码必填”提示，并为未来接入真实查询接口预留清晰边界。

## Background

当前 `/search` 页面由 [apps/web/app/search/page.tsx](/home/fw/project/ccic/apps/web/app/search/page.tsx) 渲染，并使用 [apps/web/src/views/SearchPage.tsx](/home/fw/project/ccic/apps/web/src/views/SearchPage.tsx) 承担实际交互。

现有 `SearchPage` 的行为是：

- 空输入：弹出 `window.alert("防伪码必填")`
- 非空输入：
  - 若存在 `expectedCode` 且输入不匹配，显示失败提示
  - 其它情况显示成功提示和静态商品信息

这套逻辑仍带有“本地成功校验”语义，不符合当前阶段需求。用户当前要求是：

- `/search` 暂时不要接真实查询结果
- 不论输入什么非空内容，都统一显示无效提示
- 空输入时继续保留“防伪码必填”
- 代码层面要为以后接真实查询接口留出位置，而不是把临时逻辑硬编码死在页面里

## Scope

本次设计覆盖：

- 调整 `/search` 页查询后的结果判定逻辑
- 保留空输入的必填提示
- 去掉当前“查询有效，验证成功”的成功分支
- 新增一个独立的查询适配层占位模块，供未来接真实接口时替换
- 补最小必要测试，覆盖空输入与非空输入行为

本次设计不覆盖：

- 接入真实后端查询接口
- 修改 `/`、`/?sn=...`、`/trace` 的鉴定结果查询链路
- 重构搜索页视觉结构或文案布局
- 修改客服信息、图片资源、样式文件

## Architecture Decision

采用“页面保留 + 查询适配层占位模块”的方案。

推荐原因：

- 当前需求只是暂时统一返回失败态，不值得为此重做页面结构。
- 若直接在 `SearchPage` 中把所有非空输入写死为失败，短期最快，但后续接真实接口时还要再次拆逻辑，容易造成二次返工。
- 把“查询结果判定”收口到一个很小的 helper / adapter 后，当前可以返回固定 `invalid`，未来只需要替换该模块内部实现为真实请求，不必重写页面状态切换和文案展示。

拒绝的替代方案：

- 在路由层 `app/search/page.tsx` 直接处理查询结果
  - 不合适。当前查询由用户点击按钮触发，判定逻辑应跟随交互组件，而不是提前耦合在路由入口。
- 在现有页面里继续保留 `expectedCode` 成功匹配逻辑
  - 与当前产品要求冲突，且会让占位查询与真实查询边界不清楚。

## UI Behavior Design

页面视觉结构保持不变，仅调整查询后的状态语义。

### Empty Input

- 用户点击“查询”时，如果输入为空：
  - 继续弹出 `防伪码必填`
  - 不显示成功或失败结果区域

### Non-Empty Input

- 用户点击“查询”时，只要输入非空：
  - 统一进入失败态
  - 显示背景警示图和失败文案：
    - `此次查询无效 请仔细核对4位防伪编码输入是否正确`
- 不再显示成功态文案
- 不再显示静态商品信息区域

## Query Adapter Design

新增一个小型查询适配层，例如放在 `apps/web/src/lib/` 或 `apps/web/src/views/` 附近的独立模块，职责是：

- 接收用户输入的查询码
- 返回一个统一的查询结果枚举
- 当前实现固定返回 `invalid`

建议接口形态：

```ts
export type SearchValidationResult = "invalid";

export function resolveSearchValidationResult(input: string): SearchValidationResult {
  return "invalid";
}
```

第一版设计刻意保持最小：

- 不发请求
- 不读环境变量
- 不依赖路由 query
- 不引入异步 loading 状态

未来接真实接口时，仅替换这个模块为：

- 调用后端搜索接口
- 根据接口结果返回 `ok` / `invalid` / 其他状态
- 由 `SearchPage` 消费结果并决定展示分支

## Component Boundary Design

页面层 [SearchPage.tsx](/home/fw/project/ccic/apps/web/src/views/SearchPage.tsx) 只负责：

- 持有输入框状态
- 处理按钮点击
- 保留空输入提示
- 根据查询适配层返回值切换展示状态

查询适配层只负责：

- 根据输入内容给出查询结果类型

边界要求：

- `SearchPage` 不再自己判断“输入值是否等于 `expectedCode`”
- `expectedCode` 可在本次改动中降级为兼容参数，避免影响路由调用，但不再决定结果是否成功
- 成功态的静态商品信息块暂时保留在组件中也可以，但必须确保在当前占位模式下不会被展示

## Route Compatibility Design

[apps/web/app/search/page.tsx](/home/fw/project/ccic/apps/web/app/search/page.tsx) 可以继续向 `SearchPage` 传递现有 `expectedCode` 参数，以减少本次改动范围。

但是本次设计要求：

- `expectedCode` 不再参与查询成功判定
- `/search?code=xxxx` 与直接访问 `/search` 的行为一致
- 不论 query 中带什么 `code`，非空输入都统一落到失败态

## Testing Strategy

至少补以下前端测试：

- 空输入点击查询时，调用 `window.alert("防伪码必填")`
- 非空输入点击查询时，显示失败文案
- 非空输入点击查询时，不显示成功文案
- 即使传入 `expectedCode` 且输入与其相同，也仍然显示失败文案

测试文件可继续使用现有 [SearchPage.test.tsx](/home/fw/project/ccic/apps/web/src/views/__tests__/SearchPage.test.tsx) 并扩展。

## Rollout Notes

这是一个明确的临时占位改动：

- 用户体验上统一告知“此次查询无效”
- 代码结构上提前为未来真实查询接口留出独立接入点
- 当前不承诺任何搜索成功结果

发布风险较低，主要在于：

- 空输入提示不能被误删
- 页面不应意外继续展示成功态静态信息
- 未来如果有人误以为 `expectedCode` 仍有效，可能产生误判，因此实现中需要彻底移除它的成功判定职责

## Open Questions Resolved

以下需求已确认：

- 空输入时保留 `防伪码必填`
- 非空输入时统一显示失败提示
- 当前阶段不接真实查询接口
- 要为未来查询接口预留独立适配层
