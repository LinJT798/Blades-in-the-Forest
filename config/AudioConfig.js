// 音频配置文件
const AudioConfig = {
    // 背景音乐配置
    BGM: {
        // 菜单音乐
        MENU: {
            key: 'bg',
            volume: 0.5,
            loop: true,
            fadeIn: true,
            fadeInDuration: 1000
        },
        // 游戏主音乐
        GAME: {
            key: 'bg',
            volume: 0.5,
            loop: true,
            fadeIn: true,
            fadeInDuration: 1000
        },
        // Boss战斗音乐
        BOSS: {
            key: 'bg_boss',
            volume: 0.6,
            loop: true,
            fadeIn: true,
            fadeInDuration: 500
        },
        // 游戏结束音乐（可选）
        GAME_OVER: {
            key: 'bg',  // 使用默认背景音乐
            volume: 0.3,
            loop: true,
            fadeIn: false
        }
    },
    
    // 音效配置
    SFX: {
        // 攻击音效
        ATTACK: {
            NORMAL: {
                key: 'attack_1',
                volume: 0.7,
                variations: null  // 可以配置多个变体
            },
            COMBO: {
                key: 'attack_2',
                volume: 0.8,
                variations: null
            }
        },
        
        // 受击音效
        HIT: {
            PLAYER: {
                key: 'attacked',
                volume: 0.6
            },
            ENEMY: {
                key: 'attacked',
                volume: 0.5
            },
            BOSS: {
                key: 'attacked',
                volume: 0.4
            }
        },
        
        // 收集音效（预留）
        COLLECT: {
            COIN: {
                key: null,  // 暂无资源
                volume: 0.5
            },
            HEART: {
                key: null,  // 暂无资源
                volume: 0.5
            }
        },
        
        // 交互音效
        INTERACT: {
            CHEST_OPEN: {
                key: 'open',  // 宝箱打开音效
                volume: 0.6
            },
            SAVE_POINT: {
                key: 'save',  // 存档音效
                volume: 0.5
            },
            SHOP: {
                key: null,  // 暂无资源
                volume: 0.4
            }
        },
        
        // 环境音效（预留）
        ENVIRONMENT: {
            JUMP: {
                key: null,  // 暂无资源
                volume: 0.3
            },
            LAND: {
                key: null,  // 暂无资源
                volume: 0.2
            },
            FOOTSTEP: {
                key: null,  // 暂无资源
                volume: 0.2
            }
        }
    },
    
    // 全局音量设置
    GLOBAL: {
        MASTER_VOLUME: 1.0,     // 主音量
        BGM_VOLUME: 0.5,        // 背景音乐总音量
        SFX_VOLUME: 0.7,        // 音效总音量
        MUTE_ON_FOCUS_LOSS: true  // 失去焦点时静音
    },
    
    // 淡入淡出配置
    FADE: {
        DEFAULT_FADE_IN: 1000,   // 默认淡入时间
        DEFAULT_FADE_OUT: 500,   // 默认淡出时间
        SCENE_TRANSITION: 300    // 场景切换淡出时间
    },
    
    // 音频触发时机配置
    TRIGGERS: {
        // 背景音乐触发
        BGM_TRIGGERS: {
            MENU_ENTER: 'MENU',          // 进入菜单
            GAME_START: 'GAME',          // 游戏开始
            BOSS_ENTER: 'BOSS',          // Boss战开始
            BOSS_DEFEAT: 'GAME',         // Boss战结束，恢复普通BGM
            PLAYER_DEATH: null,           // 玩家死亡时不改变音乐
            PLAYER_RESPAWN: 'GAME',      // 玩家复活时播放普通BGM
            GAME_OVER: 'GAME_OVER'       // 游戏结束
        },
        
        // 音效触发
        SFX_TRIGGERS: {
            // 攻击触发
            PLAYER_ATTACK_NORMAL: 'ATTACK.NORMAL',
            PLAYER_ATTACK_COMBO: 'ATTACK.COMBO',
            
            // 受击触发
            PLAYER_HIT: 'HIT.PLAYER',
            ENEMY_HIT: 'HIT.ENEMY',
            BOSS_HIT: 'HIT.BOSS',
            
            // 收集触发（预留）
            COIN_COLLECT: 'COLLECT.COIN',
            HEART_COLLECT: 'COLLECT.HEART',
            
            // 交互触发（预留）
            CHEST_OPEN: 'INTERACT.CHEST_OPEN',
            SAVE_POINT_USE: 'INTERACT.SAVE_POINT',
            SHOP_INTERACT: 'INTERACT.SHOP',
            
            // 环境触发（预留）
            PLAYER_JUMP: 'ENVIRONMENT.JUMP',
            PLAYER_LAND: 'ENVIRONMENT.LAND',
            PLAYER_FOOTSTEP: 'ENVIRONMENT.FOOTSTEP'
        }
    },
    
    // 获取BGM配置
    getBGMConfig(type) {
        return this.BGM[type] || null;
    },
    
    // 获取音效配置
    getSFXConfig(path) {
        const keys = path.split('.');
        let config = this.SFX;
        
        for (const key of keys) {
            config = config[key];
            if (!config) return null;
        }
        
        return config;
    },
    
    // 获取触发器对应的配置
    getTriggerConfig(trigger) {
        const bgmTrigger = this.TRIGGERS.BGM_TRIGGERS[trigger];
        if (bgmTrigger) {
            return this.getBGMConfig(bgmTrigger);
        }
        
        const sfxTrigger = this.TRIGGERS.SFX_TRIGGERS[trigger];
        if (sfxTrigger) {
            return this.getSFXConfig(sfxTrigger);
        }
        
        return null;
    }
};