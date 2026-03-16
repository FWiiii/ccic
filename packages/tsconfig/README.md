# Shared TSConfig 预留目录

该目录预留给跨应用共享 TypeScript 配置包，例如 `@ccic/tsconfig`。

当前各应用仍使用各自 `tsconfig.json`，尚未统一抽象到共享配置。

如需接入，建议新增：

- `package.json`
- `base.json` / `react.json` / `node.json` 等组合配置
- 迁移各应用 `extends` 指向共享配置
