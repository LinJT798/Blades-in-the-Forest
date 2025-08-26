class MapLoader {
    constructor(scene) {
        this.scene = scene;
        this.map = null;
        this.tileset = null;
        this.layers = {};
        this.objectGroups = {};
        this.parallaxLayers = [];
        this.decorations = [];
    }
    
    loadMap() {
        // 创建地图
        this.map = this.scene.make.tilemap({ key: 'map' });
        
        // 添加瓦片集
        this.tileset = this.map.addTilesetImage('oak_woods_tileset', 'tileset');
        
        // 创建背景层
        this.createParallaxBackground();
        
        // 创建地块层
        this.createTileLayer();
        
        // 创建装饰层
        this.createDecorationLayer();
        
        // 解析对象层
        this.parseObjectLayer();
        
        // 设置世界边界
        this.scene.physics.world.setBounds(0, 0, GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT);
        
        return this;
    }
    
    createParallaxBackground() {
        // 远景层
        const bgLayer1 = this.scene.add.tileSprite(
            0, 0,
            GameConfig.MAP_WIDTH,
            GameConfig.MAP_HEIGHT,
            'bg_layer_1'
        ).setOrigin(0, 0).setScrollFactor(GameConfig.PARALLAX.FAR, 1);
        
        // 中景层
        const bgLayer2 = this.scene.add.tileSprite(
            0, 0,
            GameConfig.MAP_WIDTH,
            GameConfig.MAP_HEIGHT,
            'bg_layer_2'
        ).setOrigin(0, 0).setScrollFactor(GameConfig.PARALLAX.MID, 1);
        
        // 近景层
        const bgLayer3 = this.scene.add.tileSprite(
            0, 0,
            GameConfig.MAP_WIDTH,
            GameConfig.MAP_HEIGHT,
            'bg_layer_3'
        ).setOrigin(0, 0).setScrollFactor(GameConfig.PARALLAX.NEAR, 1);
        
        this.parallaxLayers = [bgLayer1, bgLayer2, bgLayer3];
    }
    
    createTileLayer() {
        // 查找地块层
        const tileLayerData = this.map.layers.find(layer => 
            layer.name !== '远景层' && 
            layer.name !== '中景层' && 
            layer.name !== '近景层' &&
            layer.name !== '装饰层' &&
            layer.name !== '对象层'
        );
        
        if (tileLayerData) {
            // 创建地块层
            this.layers.tileLayer = this.map.createLayer(tileLayerData.name, this.tileset, 0, 0);
            
            // 设置碰撞（瓦片ID 1-315）
            this.layers.tileLayer.setCollisionBetween(1, 315);
            
            // 设置地块层深度
            this.layers.tileLayer.setDepth(1);
        }
    }
    
    createDecorationLayer() {
        // 获取装饰层数据
        const decorationLayer = this.map.getLayer('装饰层');
        
        if (decorationLayer) {
            const decorationData = decorationLayer.data;
            
            // 遍历所有装饰物
            for (let y = 0; y < decorationLayer.height; y++) {
                for (let x = 0; x < decorationLayer.width; x++) {
                    const tile = decorationData[y][x];
                    
                    if (tile && tile.index > 0) {
                        const decorationId = tile.index;
                        const worldX = x * GameConfig.TILE_SIZE;
                        const worldY = y * GameConfig.TILE_SIZE;
                        
                        // 创建装饰物精灵
                        this.createDecoration(decorationId, worldX, worldY);
                    }
                }
            }
        }
    }
    
    createDecoration(decorationId, x, y) {
        // 获取装饰物配置
        const decorationConfig = this.getDecorationConfig(decorationId);
        
        if (decorationConfig) {
            // 装饰物放在瓦片底部中心
            // x是瓦片左边界，y是瓦片上边界
            const spriteX = x + GameConfig.TILE_SIZE / 2;
            const spriteY = y + GameConfig.TILE_SIZE; // 瓦片底部
            const sprite = this.scene.add.sprite(spriteX, spriteY, decorationConfig.texture);
            
            // 设置尺寸（根据需求文档）
            const targetSize = GameConfig.DECORATION_SIZES[decorationId];
            if (targetSize) {
                const scaleX = targetSize.width / sprite.width;
                const scaleY = targetSize.height / sprite.height;
                sprite.setScale(scaleX, scaleY);
            }
            
            // 设置原点为底部中心
            sprite.setOrigin(0.5, 1);
            
            // 如果是需要碰撞的装饰物（rock_1, rock_2, rock_3）
            if (GameConfig.COLLISION_DECORATIONS.includes(decorationId)) {
                this.scene.physics.add.existing(sprite, true);
                sprite.body.setSize(targetSize.width * 0.8, targetSize.height * 0.8);
            }
            
            // 设置深度
            sprite.setDepth(2);
            
            // 如果是商店，添加动画
            if (decorationId === 325 || decorationId === 326) {
                if (this.scene.anims.exists('shop_idle')) {
                    sprite.play('shop_idle');
                }
            }
            
            this.decorations.push(sprite);
        }
    }
    
    getDecorationConfig(decorationId) {
        const decorationMap = {
            316: { texture: 'fence_1' },
            317: { texture: 'fence_2' },
            318: { texture: 'grass_1' },
            319: { texture: 'grass_2' },
            320: { texture: 'grass_3' },
            321: { texture: 'lamp' },
            322: { texture: 'rock_1' },
            323: { texture: 'rock_2' },
            324: { texture: 'rock_3' },
            325: { texture: 'shop_anim' },
            326: { texture: 'shop' },
            327: { texture: 'sign' }
        };
        
        return decorationMap[decorationId];
    }
    
    parseObjectLayer() {
        // 获取对象层
        const objectLayer = this.map.getObjectLayer('对象层');
        
        if (objectLayer) {
            this.objectGroups = {
                spawnPoint: null,
                enemies: {
                    slimes: [],
                    skeletons: [],
                    boss: null
                },
                chests: {
                    small: [],
                    large: []
                },
                shops: [],
                tutorials: []
            };
            
            // 遍历所有对象
            objectLayer.objects.forEach(obj => {
                const type = obj.type || obj.name;
                
                switch(type) {
                    case '出生点':
                    case 'spawn':
                        this.objectGroups.spawnPoint = { x: obj.x, y: obj.y };
                        break;
                        
                    case '史莱姆':
                    case 'slime':
                        this.objectGroups.enemies.slimes.push({ x: obj.x, y: obj.y });
                        break;
                        
                    case '骷髅兵':
                    case 'skeleton':
                    case 'skull':
                        this.objectGroups.enemies.skeletons.push({ x: obj.x, y: obj.y });
                        break;
                        
                    case '死神':
                    case 'boss':
                    case 'death':
                        this.objectGroups.enemies.boss = { x: obj.x, y: obj.y };
                        break;
                        
                    case '小宝箱':
                    case 'chest_small':
                        this.objectGroups.chests.small.push({ x: obj.x, y: obj.y });
                        break;
                        
                    case '大宝箱':
                    case 'chest_large':
                        this.objectGroups.chests.large.push({ x: obj.x, y: obj.y });
                        break;
                        
                    case '商店':
                    case 'shop':
                        this.objectGroups.shops.push({ x: obj.x, y: obj.y });
                        break;
                        
                    case '教学':
                    case 'tutorial':
                        this.objectGroups.tutorials.push({ 
                            x: obj.x, 
                            y: obj.y,
                            width: obj.width,
                            height: obj.height,
                            properties: obj.properties
                        });
                        break;
                }
            });
            
            // 如果没有找到出生点，使用默认值
            if (!this.objectGroups.spawnPoint) {
                this.objectGroups.spawnPoint = GameConfig.SPAWN_POINT;
            }
        }
    }
    
    getSpawnPoint() {
        return this.objectGroups.spawnPoint || GameConfig.SPAWN_POINT;
    }
    
    getEnemySpawnPoints() {
        return this.objectGroups.enemies;
    }
    
    getChestPositions() {
        return this.objectGroups.chests;
    }
    
    getShopPositions() {
        return this.objectGroups.shops;
    }
    
    getTutorialZones() {
        return this.objectGroups.tutorials;
    }
    
    getTileLayer() {
        return this.layers.tileLayer;
    }
    
    getCollisionDecorations() {
        return this.decorations.filter(decoration => 
            decoration.body !== undefined
        );
    }
    
    updateParallax(camera) {
        // 更新视差背景的位置
        this.parallaxLayers.forEach((layer, index) => {
            const parallaxFactor = [
                GameConfig.PARALLAX.FAR,
                GameConfig.PARALLAX.MID,
                GameConfig.PARALLAX.NEAR
            ][index];
            
            layer.tilePositionX = camera.scrollX * (1 - parallaxFactor);
        });
    }
    
    destroy() {
        // 清理所有装饰物精灵
        this.decorations.forEach(decoration => {
            if (decoration && decoration.destroy) {
                decoration.destroy();
            }
        });
        this.decorations = [];
        
        // 清理视差层
        this.parallaxLayers.forEach(layer => {
            if (layer && layer.destroy) {
                layer.destroy();
            }
        });
        this.parallaxLayers = [];
        
        // 清理地图
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
        
        // 清理瓦片层
        if (this.tileLayer) {
            this.tileLayer.destroy();
            this.tileLayer = null;
        }
    }
}