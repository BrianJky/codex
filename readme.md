## 图书馆书籍管理前端

本项目提供图书馆书籍与物理副本的管理界面，基于 **Vue 3 + Element Plus + Vue Router + Vite** 构建，使用 **pnpm** 进行包管理。

### 主要特性

- 书籍管理列表展示名称、作者、出版社、出版/入库时间、数量、借阅次数、状态等字段。
- 根据书籍状态显示「禁止借阅 / 恢复借阅」等不同操作按钮，可进行新增、修改、删除、副本详情导航等操作。
- 副本详情页面包含面包屑导航、书籍概要信息，支持新增、修改、借出、归还、删除、归档等操作。
- 副本状态覆盖「在库、借出、丢失、损坏、未归档」等，并根据状态自动调整可执行操作。
- 借阅记录弹窗表格展示借阅人、借出时间、归还时间。

### 本地开发

```bash
pnpm install

# 启动后端接口服务（默认端口 3000）
pnpm server

# 另开一个终端启动前端
pnpm dev
```

默认会在 http://localhost:5173 启动 Vite 开发服务器，前端通过 `http://localhost:3000/api` 访问后端。

### 项目结构

- `src/views/BookList.vue`：书籍列表与维护操作。
- `src/views/CopyDetails.vue`：书籍副本管理与借阅记录。
- `src/store/libraryStore.js`：与后端接口交互的状态管理封装。
- `server/index.js`：基于 Express 的后端入口，提供图书与副本 REST 接口。
- `server/libraryService.js`：后端数据读写与业务逻辑实现。
- `server/data/library.json`：初始数据及简单的 JSON 数据库。
- `src/router/index.js`：前端路由配置。
