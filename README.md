# CCIC React 工程

该项目已经完成 React 组件化重构，不再依赖 `public` 下整站镜像。

## 运行方式

```bash
npm install
npm run dev
```

## 主要结构

- `src/App.tsx`：页面总装配
- `src/components`：拆分后的页面组件
- `src/components/tabs`：三个 Tab 的独立内容组件
- `src/assets`：页面实际用到的 CSS / 字体 / 图片资源
- `source`：原始抓站源码（仅作对照）

## 构建

```bash
npm run build
npm run preview
```
