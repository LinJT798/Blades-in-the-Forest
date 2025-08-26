# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 2D action-adventure game assets and configuration repository for "神秘森林" (Mysterious Forest). The project contains complete game resources including sprite animations, tilesets, map data, and game design documentation designed primarily for use with Phaser.js game engine and Tiled map editor.

## Project Structure

### Core Directories

- **Asset/** - Game assets organized by type
  - **animation/** - Character and object sprite sheets with animation configurations
    - Characters: 主角动画1-2 (player characters), 死神 (death/boss), 骷髅兵 (skeleton), 史莱姆 (slime)
    - Interactive objects: 商店 (shop), 大宝箱/小宝箱 (large/small chests), 心心 (hearts), 金币 (coins)
    - Each folder contains: sprite PNG, animation_config.json, and metadata.json
  - **background/** - Three-layer parallax background system (layers 1-3)
  - **decorations/** - Environmental decorations (fences, grass, rocks, lamps, signs, shop)
  - **oak_woods_tileset.png** - Main 24×24px tileset (315 tiles)

- **map/** - Tiled map editor files
  - **map_full.tmj** - Main game map (200×12 tiles = 4800×288px, TMJ embedded tileset)

- **需求文档/** - Complete game design documentation
  - **需求文档.md** - Comprehensive game requirements and specifications

## Animation System

### Animation Configuration Format
Each `animation_config.json` defines:
- **sprite_info**: Dimensions and scaling
  - `width`, `height`: Frame dimensions in pixels
  - `scale_ratio`: Display scale multiplier
- **layout**: Grid structure
  - `columns`, `rows`: Sprite sheet grid layout
  - `padding`: Pixel spacing between frames (重要：加载精灵图时必须设置对应的spacing参数)
- **actions**: Animation sequences with frame coordinates [row, column]
- **frame_rate**: Playback speed (typically 10 fps)

### 重要提示：精灵图加载
加载精灵图时，必须注意`animation_config.json`中的`padding`值：
- 该值表示精灵图中帧与帧之间的间隔像素
- 在Phaser中加载时，需要将此值设置为`spacing`参数
- 不设置spacing会导致动画帧错位和显示异常

### Character Animations
Player characters support 14 animation states:
- Movement: idle, run, jump_prepare, flying_up, falling, landing
- Combat: attack_1hit, combo attack, spell cast, shield_defense
- States: be attacked, death, crouch, jump_reload

Enemy animations:
- **史莱姆 (Slime)**: idle, move, attack, be attacked, death
- **骷髅兵 (Skeleton)**: idle, walk, attack, be attacked, death
- **死神 (Death Boss)**: idle, attack, spell, be attacked

## Map Configuration

### Layer Structure (Rendering Order)
1. **Background Layers** (Parallax scrolling)
   - 远景层 (Far): parallax 0.2
   - 中景层 (Mid): parallax 0.6
   - 近景层 (Near): parallax 1.0

2. **Tile Layer** (oak_woods_tileset)
   - Tiles 1-315: Solid terrain with collision
   - Tile 0: Empty (no collision)

3. **Decoration Layer** (IDs 316-327)
   - Only rock_1(322), rock_2(323), rock_3(324) have collision
   - Decorations must be scaled to specified dimensions (see 需求文档.md)

4. **Object Layer**
   - Enemy spawn points: 史莱姆×7, 骷髅兵×5, 死神×1 (boss)
   - Interactive objects: 小宝箱×2, 大宝箱×1, 商店×2
   - System markers: spawn point (58, 233), tutorial triggers

### Map Zones
- **Zone 1 (0-1600px)**: Tutorial area, 2-3 slimes, 1 small chest
- **Zone 2 (1600-3200px)**: 3 slimes, 2 skeletons, 1 shop, wall climb tutorial
- **Zone 3 (3200-4500px)**: 2 slimes, 3 skeletons, boss chest trigger

## Game Mechanics

### Core Values
- **Physics**: Gravity 500px/s², Jump height 200px, Walk 150px/s, Run 250px/s
- **Combat**: Player HP 100, SP 100, Attack 20, Defense reduces damage by 70%
- **Enemies**: Slime (HP 30, ATK 10), Skeleton (HP 50, ATK 15), Death Boss (HP 500, ATK 30)

## Development with Phaser.js

### Loading Assets
```javascript
// Load map (TMJ with embedded tileset)
this.load.tilemapTiledJSON('map', 'map/map_full.tmj');
this.load.image('tileset', 'Asset/oak_woods_tileset.png');

// Load sprite sheets - 注意：需要根据animation_config.json中的padding值设置spacing参数
this.load.spritesheet('player1', 'Asset/animation/主角动画1/player_1.png', {
    frameWidth: 56,
    frameHeight: 56,
    spacing: 2,  // 重要：根据配置文件中的padding值设置
    margin: 0
});

// Load backgrounds
this.load.image('bg_layer1', 'Asset/background/background_layer_1.png');
this.load.image('bg_layer2', 'Asset/background/background_layer_2.png');
this.load.image('bg_layer3', 'Asset/background/background_layer_3.png');
```

### Collision Setup
- Set collision for tile IDs 1-315
- Add collision for decoration rocks (IDs 322-324)
- Interactive objects need trigger zones (not physics collision)

## Working Guidelines

- Maintain consistent sprite dimensions within categories
- Follow existing animation_config.json structure for new animations
- Decoration rendering sizes must match the specifications in 需求文档.md
- Ensure Tiled compatibility when modifying map files
- No save system implemented (session-only variables)
- Assets are designed for 24px tile grid system