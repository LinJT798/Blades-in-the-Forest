class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
        this.animationConfigs = {};
    }

    preload() {
        // 创建加载进度条
        this.createLoadingBar();
        
        // 加载地图和瓦片集
        this.load.tilemapTiledJSON('map', 'map/map_full.tmj');
        this.load.image('tileset', 'Asset/oak_woods_tileset.png');
        
        // 加载背景图层
        this.load.image('bg_layer_1', 'Asset/background/background_layer_1.png');
        this.load.image('bg_layer_2', 'Asset/background/background_layer_2.png');
        this.load.image('bg_layer_3', 'Asset/background/background_layer_3.png');
        
        // 加载装饰物
        this.load.image('fence_1', 'Asset/decorations/fence_1.png');
        this.load.image('fence_2', 'Asset/decorations/fence_2.png');
        this.load.image('grass_1', 'Asset/decorations/grass_1.png');
        this.load.image('grass_2', 'Asset/decorations/grass_2.png');
        this.load.image('grass_3', 'Asset/decorations/grass_3.png');
        this.load.image('lamp', 'Asset/decorations/lamp.png');
        this.load.image('rock_1', 'Asset/decorations/rock_1.png');
        this.load.image('rock_2', 'Asset/decorations/rock_2.png');
        this.load.image('rock_3', 'Asset/decorations/rock_3.png');
        this.load.image('shop', 'Asset/decorations/shop.png');
        this.load.image('shop_anim', 'Asset/decorations/shop_anim.png');
        this.load.image('sign', 'Asset/decorations/sign.png');
        
        // 加载主角精灵图（考虑padding）
        this.load.spritesheet('player_1', 'Asset/animation/主角动画1/player_1.png', {
            frameWidth: 56,
            frameHeight: 56,
            spacing: 2,  // 帧之间的间隔
            margin: 0    // 边缘间隔
        });
        this.load.spritesheet('player_2', 'Asset/animation/主角动画2/player_2.png', {
            frameWidth: 56,
            frameHeight: 56,
            spacing: 2,
            margin: 0
        });
        
        // 加载敌人精灵图（考虑padding）
        this.load.spritesheet('slime', 'Asset/animation/史莱姆/slime.png', {
            frameWidth: 103,
            frameHeight: 56,
            spacing: 2,
            margin: 0
        });
        this.load.spritesheet('skeleton', 'Asset/animation/骷髅兵/skull.png', {
            frameWidth: 80,
            frameHeight: 65,
            spacing: 2,
            margin: 0
        });
        this.load.spritesheet('death', 'Asset/animation/死神/death.png', {
            frameWidth: 80,
            frameHeight: 80,
            spacing: 2,
            margin: 0
        });
        
        // 加载宝箱精灵图（考虑padding）
        this.load.spritesheet('chest_small', 'Asset/animation/小宝箱/box_1.png', {
            frameWidth: 16,  // 修正为实际尺寸
            frameHeight: 20,
            spacing: 2,
            margin: 0
        });
        this.load.spritesheet('chest_large', 'Asset/animation/大宝箱/box_2.png', {
            frameWidth: 16,  // 修正为实际尺寸
            frameHeight: 20,
            spacing: 2,
            margin: 0
        });
        
        // 加载金币和心心精灵图（考虑padding）
        this.load.spritesheet('coin', 'Asset/animation/金币/coin.png', {
            frameWidth: 16,
            frameHeight: 16,
            spacing: 2,
            margin: 0
        });
        this.load.spritesheet('heart', 'Asset/animation/心心/heart.png', {
            frameWidth: 16,
            frameHeight: 16,
            spacing: 2,
            margin: 0
        });
        
        // 加载商店精灵图（考虑padding）
        this.load.spritesheet('shop_sprite', 'Asset/animation/商店/shop.png', {
            frameWidth: 118,
            frameHeight: 128,
            spacing: 2,
            margin: 0
        });
        
        // 加载UI图标
        this.load.image('coin_icon', 'Asset/animation/金币图标/coin000.png');
        this.load.image('heart_icon', 'Asset/animation/心心图标/heart_pic000.png');
        
        // 加载动画配置文件
        this.loadAnimationConfigs();
    }
    
    loadAnimationConfigs() {
        // 加载所有动画配置JSON文件
        this.load.json('config_player_1', 'Asset/animation/主角动画1/animation_config.json');
        this.load.json('config_player_2', 'Asset/animation/主角动画2/animation_config.json');
        this.load.json('config_slime', 'Asset/animation/史莱姆/animation_config.json');
        this.load.json('config_skeleton', 'Asset/animation/骷髅兵/animation_config.json');
        this.load.json('config_death', 'Asset/animation/死神/animation_config.json');
        this.load.json('config_shop', 'Asset/animation/商店/animation_config.json');
        this.load.json('config_chest_small', 'Asset/animation/小宝箱/animation_config_20250822_143046.json');
        this.load.json('config_chest_large', 'Asset/animation/大宝箱/animation_config_20250822_143009.json');
        this.load.json('config_coin', 'Asset/animation/金币/animation_config_20250821_193147.json');
        this.load.json('config_heart', 'Asset/animation/心心/animation_config_20250822_143114.json');
    }
    
    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // 加载背景
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a1a);
        
        // 加载文字
        const loadingText = this.add.text(width / 2, height / 2 - 50, '加载中...', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 进度条背景
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect((width - 320) / 2, height / 2 - 5, 320, 30);
        
        // 进度条
        const progressBar = this.add.graphics();
        
        // 进度文字
        const percentText = this.add.text(width / 2, height / 2 + 10, '0%', {
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 资源文字
        const assetText = this.add.text(width / 2, height / 2 + 40, '', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 监听加载进度
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0x4CAF50, 1);
            progressBar.fillRect((width - 320) / 2, height / 2 - 5, 320 * value, 30);
        });
        
        this.load.on('fileprogress', (file) => {
            assetText.setText('正在加载: ' + file.key);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            assetText.destroy();
        });
    }
    
    create() {
        // 处理加载的动画配置
        this.processAnimationConfigs();
        
        // 创建全局动画
        this.createAnimations();
        
        // 跳转到主菜单
        this.scene.start('MenuScene');
    }
    
    processAnimationConfigs() {
        // 将加载的配置存储到全局
        this.animationConfigs = {
            player_1: this.cache.json.get('config_player_1'),
            player_2: this.cache.json.get('config_player_2'),
            slime: this.cache.json.get('config_slime'),
            skeleton: this.cache.json.get('config_skeleton'),
            death: this.cache.json.get('config_death'),
            shop: this.cache.json.get('config_shop'),
            chest_small: this.cache.json.get('config_chest_small'),
            chest_large: this.cache.json.get('config_chest_large'),
            coin: this.cache.json.get('config_coin'),
            heart: this.cache.json.get('config_heart')
        };
        
        // 存储到全局以供其他场景使用
        this.game.animationConfigs = this.animationConfigs;
    }
    
    createAnimations() {
        // 创建玩家动画
        this.createPlayerAnimations();
        
        // 创建敌人动画
        this.createEnemyAnimations();
        
        // 创建物品动画
        this.createItemAnimations();
    }
    
    createPlayerAnimations() {
        const config = this.animationConfigs.player_1;
        if (!config) return;
        
        const actions = config.actions;
        
        // 遍历所有动作创建动画
        for (let actionName in actions) {
            const action = actions[actionName];
            const frames = [];
            
            // 将动作名标准化（空格替换为下划线）
            const animKey = 'player_' + actionName.replace(/ /g, '_');
            
            // 生成帧序列
            for (let frame of action.frames) {
                const frameIndex = frame[0] * config.layout.columns + frame[1];
                frames.push({ key: 'player_1', frame: frameIndex });
            }
            
            // 创建动画
            this.anims.create({
                key: animKey,
                frames: frames,
                frameRate: config.frame_rate || 10,
                repeat: ['idle', 'run'].includes(actionName) ? -1 : 0
            });
        }
    }
    
    createEnemyAnimations() {
        // 史莱姆动画
        this.createEnemyAnimation('slime', this.animationConfigs.slime);
        
        // 骷髅兵动画
        this.createEnemyAnimation('skeleton', this.animationConfigs.skeleton);
        
        // 死神动画
        this.createEnemyAnimation('death', this.animationConfigs.death);
    }
    
    createEnemyAnimation(enemyType, config) {
        if (!config) return;
        
        const actions = config.actions;
        
        for (let actionName in actions) {
            const action = actions[actionName];
            const frames = [];
            
            const animKey = enemyType + '_' + actionName.replace(/ /g, '_');
            
            for (let frame of action.frames) {
                const frameIndex = frame[0] * config.layout.columns + frame[1];
                frames.push({ key: enemyType, frame: frameIndex });
            }
            
            this.anims.create({
                key: animKey,
                frames: frames,
                frameRate: config.frame_rate || 10,
                repeat: actionName === 'idle' ? -1 : 0
            });
        }
    }
    
    createItemAnimations() {
        // 金币动画
        if (this.animationConfigs.coin) {
            const coinConfig = this.animationConfigs.coin;
            const coinFrames = [];
            const action = coinConfig.actions.idle;
            
            for (let frame of action.frames) {
                const frameIndex = frame[0] * coinConfig.layout.columns + frame[1];
                coinFrames.push({ key: 'coin', frame: frameIndex });
            }
            
            this.anims.create({
                key: 'coin_idle',
                frames: coinFrames,
                frameRate: coinConfig.frame_rate || 10,
                repeat: -1
            });
        }
        
        // 心心动画
        if (this.animationConfigs.heart) {
            const heartConfig = this.animationConfigs.heart;
            const heartFrames = [];
            const action = heartConfig.actions.idle;
            
            for (let frame of action.frames) {
                const frameIndex = frame[0] * heartConfig.layout.columns + frame[1];
                heartFrames.push({ key: 'heart', frame: frameIndex });
            }
            
            this.anims.create({
                key: 'heart_idle',
                frames: heartFrames,
                frameRate: heartConfig.frame_rate || 10,
                repeat: -1
            });
        }
        
        // 宝箱动画
        this.createChestAnimations();
        
        // 商店动画
        this.createShopAnimations();
    }
    
    createChestAnimations() {
        // 小宝箱
        if (this.animationConfigs.chest_small) {
            const config = this.animationConfigs.chest_small;
            const frames = [];
            const action = config.actions.open;
            
            for (let frame of action.frames) {
                const frameIndex = frame[0] * config.layout.columns + frame[1];
                frames.push({ key: 'chest_small', frame: frameIndex });
            }
            
            this.anims.create({
                key: 'chest_small_open',
                frames: frames,
                frameRate: config.frame_rate || 10,
                repeat: 0
            });
        }
        
        // 大宝箱
        if (this.animationConfigs.chest_large) {
            const config = this.animationConfigs.chest_large;
            const frames = [];
            const action = config.actions.open;
            
            for (let frame of action.frames) {
                const frameIndex = frame[0] * config.layout.columns + frame[1];
                frames.push({ key: 'chest_large', frame: frameIndex });
            }
            
            this.anims.create({
                key: 'chest_large_open',
                frames: frames,
                frameRate: config.frame_rate || 10,
                repeat: 0
            });
        }
    }
    
    createShopAnimations() {
        if (this.animationConfigs.shop) {
            const config = this.animationConfigs.shop;
            const frames = [];
            const action = config.actions.idle;
            
            for (let frame of action.frames) {
                const frameIndex = frame[0] * config.layout.columns + frame[1];
                frames.push({ key: 'shop_sprite', frame: frameIndex });
            }
            
            this.anims.create({
                key: 'shop_idle',
                frames: frames,
                frameRate: config.frame_rate || 10,
                repeat: -1
            });
        }
    }
}