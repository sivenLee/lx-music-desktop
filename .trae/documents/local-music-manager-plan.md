# 本地音乐管理功能实现计划

## 1. 功能概述

为 lx-music-desktop 项目新增一个本地音乐文件和播放列表管理页面，实现本地音乐的管理功能。

## 2. 功能需求

### 2.1 页面结构
- 路由：`/local`
- 页面布局：
  - **顶部区域**：目录选择下拉框 + 新增目录按钮 + 搜索过滤输入框
  - **左侧区域**：播放列表管理（固定显示"所有文件"，下方显示当前目录下的.m3u8文件）
  - **右侧区域**：文件列表（显示当前目录所有文件或选中播放列表的文件）

### 2.2 功能细节
- 目录选择下拉框可切换和管理已保存的目录
- 新增目录按钮可添加新目录
- 搜索框只过滤当前目录的文件
- 左侧固定显示"所有文件"
- 遍历目录最多两层
- 使用扁平化展示文件列表
- 仅读取音乐文件和播放列表文件

## 3. 实现方案

### 3.1 文件结构

```
src/renderer/
├── views/
│   └── Local/
│       ├── index.vue           # 主页面
│       ├── components/
│       │   ├── DirectorySelector.vue  # 目录选择组件
│       │   ├── PlaylistSidebar.vue  # 播放列表面板
│       │   └── FileList.vue         # 文件列表组件
│       ├── useLocalMusic.ts            # 本地音乐管理 hook
│       └── utils.ts                   # 工具函数
└── ...
src/common/
└── types/
│   └── local_music.d.ts       # 类型定义
└── utils/
    └── localMusic.ts           # 本地音乐工具函数
```

### 3.2 主要改动文件

1. **新增文件**
   - `src/renderer/views/Local/index.vue
   - `src/renderer/views/Local/components/DirectorySelector.vue`
   - `src/renderer/views/Local/components/PlaylistSidebar.vue`
   - `src/renderer/views/Local/components/FileList.vue`
   - `src/renderer/views/Local/useLocalMusic.ts`
   - `src/common/types/local_music.d.ts`
   - `src/common/utils/localMusic.ts`

2. **修改文件**
   - `src/renderer/router.ts` - 添加路由配置
   - `src/renderer/components/layout/Aside/NavBar.vue` - 导航项
   - `src/lang/zh-cn.json` - 文本
   - `src/lang/en-us.json` - 文本
   - `src/main/modules/winMain/rendererEvent/music.ts` - 可能的 IPC
   - `src/common/ipcNames.ts` - 新增 IPC 命名

### 3.3 类型定义 (local_music.d.ts)

```typescript
// local_music.d.ts
interface LocalMusicDirectory {
  id: string
  path: string
  name: string
}

interface LocalMusicFile {
  id: string
  name: string
  path: string
  ext: string
  artist?: string
  album?: string
  duration?: number
}

interface LocalPlaylist {
  id: string
  name: string
  path: string
  musicFiles: LocalMusicFile[]
}
```

### 3.4 本地音乐工具 (localMusic.ts)

```typescript
// 主要功能
- 遍历目录（最多两层）
- 识别音乐文件和播放列表文件
- 读取.m3u8 播放列表
- 保存和读取本地目录配置

支持的格式
```

### 3.5 主要 IPC 事件 (ipcNames.ts)

```typescript
// 本地音乐相关事件
```

### 3.6 主进程 IPC 处理

```typescript
// 增加本地音乐管理的 IPC 处理
```

## 4. 页面组件

### 4.1 主页面 (index.vue)

```vue
// 主页面
- 顶部区域
- 左侧侧边栏
- 右侧内容区域
```

### 4.2 目录选择组件 (DirectorySelector.vue)

```vue
// 目录选择组件
- 目录下拉框
- 新增按钮
- 删除按钮
```

### 4.3 播放列表面板 (PlaylistSidebar.vue)

```vue
// 播放列表面板
- 所有文件
- 播放列表
```

### 4.4 文件列表 (FileList.vue)

```vue
// 文件列表
- 使用现有 MusicList 组件
- 支持播放
```

## 5. 集成播放器

```typescript
// 与现有播放器集成
- 使用现有的音乐信息对象
```

## 6. 实现计划和开发

- 第 1 步：新增类型和工具
- 第 2 步：新增 IPC 事件和主进程处理
- 第 3 步：新增页面组件
- 第 4 步：集成到路由和导航栏
- 第 5 步：测试功能

## 7. 风险与注意事项

- 复用现有的组件和工具
- 保持项目代码风格
- 仅修改最小编译
- 仅必要的功能
- 支持的格式
- 性能优化
- 避免破坏性变更

