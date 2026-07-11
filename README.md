# cyh · 入世 (adolfheir.github.io)

一个水墨山水的无尽漫游世界。进入后有「入世」开场运镜，随后你化身斗笠长袍的**行者**，在程序化生成、永无尽头的山水里自由漫游。

- **引擎**：[Babylon.js](https://www.babylonjs.com/) — `src/inkWorld.engine.js`（`initInkWorld(canvas, root)`，返回 `dispose`）
- **框架**：React + Vite（纯静态 SPA）
- **美术**：松 / 石 / 竹 / 草 / 亭 + 远山环幕 + 飞鸟 + 墨点雾气，全部 `DynamicTexture` 程序化水墨绘制，零外部素材
- **无尽世界**：网格分块 + 对象池回收，走到哪生成到哪

## 操控

| 操作 | 效果 |
| --- | --- |
| `← →` / `A` `D`，或拖拽屏幕 | 转向 |
| `W` / `S` | 疾行 / 缓步（永不停步） |
| 右上「跳過」 | 跳过入世开场 |
| 左上「關於」 | 打开个人资料与链接 |

## 开发

```bash
npm install
npm run dev      # 本地开发
npm run build    # 产出 dist/（纯静态）
npm run preview  # 预览构建产物
```

## 部署

推送到 `master` 分支即由 `.github/workflows/deploy.yml` 自动构建并发布到 GitHub Pages。
需在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
