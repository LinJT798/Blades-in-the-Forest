// 游戏常量配置
const GameConfig = {
    // 窗口和分辨率
    GAME_WIDTH: 686,
    GAME_HEIGHT: 288,
    TILE_SIZE: 24,
    
    // 地图尺寸
    MAP_WIDTH: 4800,
    MAP_HEIGHT: 288,
    MAP_TILES_WIDTH: 200,
    MAP_TILES_HEIGHT: 12,
    
    // 物理系统
    GRAVITY: 500,
    JUMP_HEIGHT: 50,  // 降低跳跃高度
    WALK_SPEED: 100,
    RUN_SPEED: 200,
    
    // 玩家属性
    PLAYER_MAX_HP: 100,
    PLAYER_MAX_SP: 100,
    PLAYER_ATTACK: 10,
    PLAYER_COMBO_ATTACK: 15,
    DEFENSE_REDUCTION: 0.3, // 防御时减伤70%
    
    // 精力消耗
    SP_COST_RUN: 10, // per second
    SP_COST_JUMP: 5,  // 降低跳跃消耗
    SP_COST_ATTACK: 7,
    SP_COST_COMBO: 15,
    SP_COST_DEFENSE: 10, // per second
    
    // 精力恢复
    SP_RECOVER_IDLE: 10, // per second
    SP_RECOVER_WALK: 6, // per second
    
    // 敌人属性
    SLIME: {
        HP: 20,
        ATTACK: 10,
        PATROL_SPEED: 30,
        DETECT_RADIUS: 80,
        ATTACK_RADIUS: 25,
        ATTACK_INTERVAL: 1500,
        PATROL_RANGE: 50,
        SCALE: 0.5,
        FRAME_RATE: 8
    },
    
    SKELETON: {
        HP: 30,
        ATTACK: 15,
        PATROL_SPEED: 40,
        CHASE_SPEED: 60,
        DETECT_RADIUS: 120,
        ATTACK_RADIUS: 30,
        ATTACK_INTERVAL: 2000,
        PATROL_RANGE: 100,
        SCALE: 0.6,
        FRAME_RATE: 10
    },
    
    DEATH_BOSS: {
        HP: 100,
        ATTACK: 20,
        MOVE_SPEED: 50,
        ATTACK_RADIUS: 50,
        ATTACK_INTERVAL: 2000,
        SCALE: 1.0,
        FRAME_RATE: 10,
        // 传送技能配置
        TELEPORT_COOLDOWN: 2000,      // 传送冷却时间（20秒）
        TELEPORT_DISTANCE: 150,         // 触发传送的距离阈值
        NO_ATTACK_THRESHOLD: 8000,      // 多久没攻击触发传送（8秒）
        TELEPORT_OFFSET_MIN: 60,        // 传送到玩家附近的最小距离
        TELEPORT_OFFSET_MAX: 100,       // 传送到玩家附近的最大距离
        
        // 阶段转换配置
        PHASE_TRANSITION: {
            FADE_DURATION: 500,        // 虚化动画时长
            WAIT_BEFORE_WAVES: 1500,   // 虚化后等待时间再发射光波
            WAVE_INTERVAL: 1600,        // 每波光波间隔
            WAVE_COUNT: 3,             // 光波波数
            WAVES_PER_BURST: 4,        // 每波的光波数量
            WAVE_SPEED: 50,            // 光波速度（原150改为80）
            WAVE_DAMAGE: 15,           // 光波伤害
            WAVE_SCALE: 2.5,           // 光波缩放
            WAVE_LIFETIME: 4000,       // 光波存活时间
            RECOVERY_DELAY: 1500       // 最后一波后恢复延迟
        }
    },
    
    // 掉落物
    DROP_RATES: {
        SLIME: {
            COIN: { min: 2, max: 3, rate: 1.0 },
            HEART: { min: 0, max: 1, rate: 0.5 }
        },
        SKELETON: {
            COIN: { min: 2, max: 5, rate: 1.0 },
            HEART: { min: 0, max: 1, rate: 0.7 }
        },
        DEATH_BOSS: {
            COIN: { min: 15, max: 20, rate: 1.0 },
            HEART: { min: 2, max: 3, rate: 1.0 }
        }
    },
    
    // 宝箱掉落
    CHEST_DROPS: {
        SMALL: {
            COIN: { min: 5, max: 10 },
            HEART: { chance: 0.4, amount: 1 }
        },
        LARGE: {
            COIN: { min: 15, max: 25 },
            HEART: { chance: 0.8, amount: { min: 2, max: 3 } }
        }
    },
    
    // 商店
    SHOP: {
        POTION_PRICE: 10,
        POTION_HEAL: 20
    },
    
    // 摄像机
    CAMERA: {
        DEAD_ZONE: 200,
        LERP: 0.1,
        MIN_X: 343,
        MAX_X: 4457,
        BOSS_LOCK_MIN: 4000,
        BOSS_LOCK_MAX: 4500
    },
    
    // 视差
    PARALLAX: {
        FAR: 0.2,
        MID: 0.6,
        NEAR: 1.0
    },
    
    // 装饰物尺寸
    DECORATION_SIZES: {
        316: { width: 73, height: 19 },  // fence_1
        317: { width: 72, height: 19 },  // fence_2
        318: { width: 8, height: 3 },    // grass_1
        319: { width: 10, height: 5 },   // grass_2
        320: { width: 9, height: 4 },    // grass_3
        321: { width: 23, height: 57 },  // lamp
        322: { width: 20, height: 11 },  // rock_1
        323: { width: 27, height: 12 },  // rock_2
        324: { width: 45, height: 18 },  // rock_3
        325: { width: 708, height: 128 }, // shop_anim
        326: { width: 118, height: 98 },  // shop
        327: { width: 22, height: 31 }    // sign
    },
    
    // 碰撞装饰物ID（已禁用，所有装饰物都不设置碰撞）
    COLLISION_DECORATIONS: [],
    
    // 动画帧率
    DEFAULT_FRAME_RATE: 10,
    
    // 战斗相关
    HIT_STUN_TIME: 500,      // 受击硬直时间 ms
    INVINCIBLE_TIME: 1000,    // 无敌时间 ms
    KNOCKBACK_DISTANCE: 30,   // 玩家击退距离 px
    ENEMY_KNOCKBACK_FORCE: 50,  // 敌人击退力度 px/s（轻微击退）
    
    // 掉落物理
    DROP_GRAVITY: 500,
    DROP_BOUNCE: 0.5,
    DROP_FRICTION: 0.8,
    DROP_INITIAL_VX: [-50, 50],
    DROP_INITIAL_VY: [-150, -100],
    
    // 掉落物存在时间
    COIN_LIFETIME: 30000,     // 30秒
    HEART_LIFETIME: 20000,    // 20秒
    
    // 出生点
    SPAWN_POINT: { x: 58, y: 233 },
    
    // 区域划分
    ZONES: {
        ZONE1: { start: 0, end: 1600 },
        ZONE2: { start: 1600, end: 3200 },
        ZONE3: { start: 3200, end: 4500 }
    }
};

// 输入键位配置
const InputKeys = {
    LEFT: 'A',
    RIGHT: 'D',
    UP: 'W',
    DOWN: 'S',
    JUMP: 'SPACE',
    ATTACK: 'J',
    DEFENSE: 'K',
    INTERACT: 'J',
    RUN: 'SHIFT'
};