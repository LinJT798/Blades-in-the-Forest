# Blades in the Forest - 神秘森林

一个使用 Phaser 3 开发的 2D 横版动作冒险游戏。

## 🎮 在线游玩

访问 [https://linjt798.github.io/Blades-in-the-Forest/](https://linjt798.github.io/Blades-in-the-Forest/) 开始游戏

## 🎯 游戏简介

在这个被诅咒的神秘森林中，你将扮演一名勇敢的战士，与各种怪物战斗，最终挑战死神Boss，拯救森林。

### 主要特性

- **战斗系统**：普通攻击和连击组合，防御和闪避机制
- **敌人类型**：史莱姆、骷髅兵、死神Boss（三阶段变化）
- **探索要素**：宝箱、商店、存档点
- **卡片系统**：通过商店购买增益卡片
- **音效系统**：背景音乐和战斗音效

## 🕹️ 操作说明

### 基础操作
- **A/D** - 左右移动
- **W** - 爬墙（靠近墙壁时）
- **空格** - 跳跃/墙跳
- **Shift** - 奔跑（消耗精力）

### 战斗操作
- **J** - 攻击（连续按击可触发连击）
- **K** - 防御（减少70%伤害，消耗精力）

### 交互
- **J** - 打开宝箱/与商店互动/激活存档点

## 🛠️ 本地运行

### 方式一：Python服务器
```bash
python3 server.py
# 或指定端口
python3 server.py 8080
```

### 方式二：快速启动脚本（Mac/Linux）
```bash
./start_game.sh
```

### 方式三：Node.js服务器
```bash
npm install -g http-server
http-server -p 8000
```

然后访问 `http://localhost:8000`

## 📁 项目结构

```
├── Asset/              # 游戏资源文件
│   ├── animation/      # 角色和物体动画
│   ├── background/     # 背景图层
│   ├── decorations/    # 装饰物
│   └── sound/          # 音效和音乐
├── config/             # 配置文件
│   ├── AudioConfig.js  # 音频配置
│   └── TutorialConfig.js # 教学配置
├── entities/           # 游戏实体
│   ├── Player.js       # 玩家角色
│   ├── Enemy.js        # 敌人基类
│   └── DeathBoss.js    # Boss
├── scenes/             # 游戏场景
│   ├── MenuScene.js    # 主菜单
│   ├── GameScene.js    # 游戏主场景
│   └── GameOverScene.js # 游戏结束
├── systems/            # 游戏系统
│   ├── AudioManager.js # 音频管理
│   ├── CombatSystem.js # 战斗系统
│   └── UIManager.js    # UI管理
└── index.html          # 游戏入口

```

## 🎨 游戏特色

### Boss战斗
- 三个阶段，每个阶段有不同的攻击模式
- 阶段转换时会发射范围光波攻击
- 智能AI追踪和传送能力

### 卡片系统
- **生命偷取**：攻击时回复生命值
- **静息回复**：静止2秒后持续回血
- **精力强化**：提升精力上限和恢复速度

### 存档系统
- 多个存档点分布在地图各处
- 死亡后从最近的存档点复活
- 保存角色状态和游戏进度

## 🔧 技术栈

- **游戏引擎**: Phaser 3.70.0
- **开发语言**: JavaScript (ES6+)
- **地图编辑**: Tiled Map Editor
- **资源管理**: 自定义动画配置系统

## 📝 开发说明

详细的开发文档请查看 [CLAUDE.md](./CLAUDE.md)

## 📄 许可证

本项目仅供学习和娱乐使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ using Phaser 3