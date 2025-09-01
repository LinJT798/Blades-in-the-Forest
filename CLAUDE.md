# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A 2D action-adventure game "神秘森林" (Mysterious Forest) built with Phaser 3. Players control a warrior exploring a cursed forest, fighting monsters (slimes, skeletons) and challenging the Death Boss to save the forest. The project is a complete game implementation with assets, animations, physics, and combat systems.

## Common Commands

### Running the Game
```bash
# Quick start (Mac/Linux)
./start_game.sh

# Python server (cross-platform)
python3 server.py        # Default port 8000
python3 server.py 8888   # Custom port

# Alternative: Node.js
npm install -g http-server
http-server -p 8000
```

### Development Notes
- **No package.json**: Pure JavaScript project without npm dependencies
- **No build process**: Direct browser execution via HTTP server
- **Debug mode**: Currently enabled in game.js:19 (`debug: true`)

## Architecture

### Scene Flow
```
PreloadScene → MenuScene → GameScene → GameOverScene
      ↑                          ↓             ↓
      └──────────────────────────←─────────────┘
```

### Core Systems

#### Entity Hierarchy
```
Enemy (base class)
├── Slime (HP:20, ATK:5)
├── Skeleton (HP:40, ATK:8)
└── DeathBoss (HP:100, ATK:15, 4 phases)

Player
├── Combat: attack chains, defense
├── Movement: walk, run, jump, wall-climb
└── States: 14 animation states
```

#### Manager Systems
- **AnimationManager**: Loads animation configs from JSON, manages sprite sheets with padding/spacing
- **UIManager**: HUD (HP/SP bars), dialogs, shop interface
- **CombatSystem**: Damage calculation, knockback, invincibility frames
- **PhysicsSystem**: Custom physics helpers for platforming
- **MapLoader**: Parses Tiled TMJ maps, sets up collisions (tiles 1-315, rocks 322-324)

### Critical Implementation Details

#### Sprite Loading with Padding
Animation configs specify `padding` between frames. **MUST** set as `spacing` in Phaser:
```javascript
// From animation_config.json: "padding": 2
this.load.spritesheet('player1', 'path/to/sprite.png', {
    frameWidth: 56,
    frameHeight: 56,
    spacing: 2,  // Critical: matches padding in config
    margin: 0
});
```

#### Collision System
- **Tile collisions**: IDs 1-315 (terrain)
- **Decoration collisions**: IDs 322-324 (rocks only)
- **Entity collisions**: Player vs enemies, projectiles
- **Trigger zones**: Chests, shops, boss trigger (not physics bodies)

#### Map Zones & Enemy Spawning
- **Zone 1** (0-1600px): Tutorial, 2-3 slimes
- **Zone 2** (1600-3200px): 3 slimes, 2 skeletons, wall-climb area
- **Zone 3** (3200-4500px): 2 slimes, 3 skeletons, boss chest at x:4300

#### Player Combat System
- **Attack chain**: Normal → Must press J at frames 4-6 → Combo (15 damage)
- **Defense**: Hold K for 70% damage reduction (drains SP)
- **Invincibility**: 1 second after taking damage
- **Knockback**: Based on attack direction and enemy type

#### Boss Battle Phases
1. **Phase 1** (100-75% HP): Basic attacks, slow
2. **Phase 2** (75-50% HP): +Projectiles, faster
3. **Phase 3** (50-25% HP): +Area attacks, aggressive
4. **Phase 4** (<25% HP): Rage mode, all patterns

## Asset Structure

### Animation Files Pattern
Each character/object folder contains:
- `[name].png`: Sprite sheet
- `animation_config.json`: Frame definitions, padding, actions
- `metadata.json`: Additional sprite info

### Map File (TMJ Format)
- **map/map_full.tmj**: 200×12 tiles (4800×288px)
- Embedded tileset reference
- 4 layers: background, tiles, decorations, objects

## Key Constants (utils/Constants.js)

- **Physics**: Gravity 500, Jump 200px, Walk 150px/s, Run 250px/s
- **Player**: HP 100, SP 100, Attack 20
- **Combat**: Invincibility 1000ms, Knockback distance varies by enemy
- **Map**: Total width 4800px, Tile size 24px

## Common Issues & Solutions

### Animation Frame Misalignment
→ Check `spacing` parameter matches `padding` in animation_config.json

### Enemies Not Spawning
→ Verify object layer in map has correct enemy type names

### Boss Not Triggering
→ Boss chest must be at x:4300, player must have key

### Performance Issues
→ Disable debug mode (game.js:19), reduce particle effects

## File Modification Guidelines

When modifying game systems:
1. **Animations**: Follow existing JSON structure, maintain padding values
2. **Combat**: Adjust values in Constants.js, not hardcoded
3. **Maps**: Use Tiled editor, maintain layer order
4. **Entities**: Extend Enemy class for new enemies
5. **UI**: Use UIManager methods, don't create raw Phaser text

## Testing Approach

No automated tests. Manual testing via:
1. Run game with `python3 server.py`
2. Enable debug mode to see collisions
3. Test all player animations and combat chains
4. Verify enemy spawn points and behaviors
5. Complete full playthrough including boss battle