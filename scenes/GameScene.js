class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // 游戏对象
        this.player = null;
        this.enemies = [];
        this.chests = [];
        this.shops = [];
        this.coins = [];
        this.hearts = [];
        this.boss = null;
        
        // 系统
        this.mapLoader = null;
        this.combatSystem = null;
        this.physicsSystem = null;
        this.uiManager = null;
        
        // 游戏状态
        this.isGameOver = false;
        this.isBossBattle = false;
        this.isPaused = false;
    }
    
    create() {
        // 淡入效果
        this.cameras.main.fadeIn(500, 0, 0, 0);
        
        // 初始化系统
        this.initializeSystems();
        
        // 加载地图
        this.loadMap();
        
        // 创建玩家
        this.createPlayer();
        
        // 创建敌人
        this.createEnemies();
        
        // 创建交互对象
        this.createInteractables();
        
        // 设置物理碰撞
        this.setupCollisions();
        
        // 创建UI
        this.createUI();
        
        // 设置摄像机
        this.setupCamera();
        
        // 注册事件监听
        this.setupEventListeners();
        
        // 显示初始教程
        this.showInitialTutorial();
        
        // 记录开始时间
        if (window.gameData) {
            window.gameData.startTime = Date.now();
        }
    }
    
    initializeSystems() {
        this.mapLoader = new MapLoader(this);
        this.combatSystem = new CombatSystem(this);
        this.physicsSystem = new PhysicsSystem(this);
        this.uiManager = new UIManager(this);
        
        // 设置世界物理
        this.physicsSystem.setupWorldPhysics();
    }
    
    loadMap() {
        // 加载地图
        this.mapLoader.loadMap();
        
        // 获取地块层和装饰物
        this.tileLayer = this.mapLoader.getTileLayer();
        this.decorations = this.mapLoader.getCollisionDecorations();
    }
    
    createPlayer() {
        // 获取出生点
        const spawnPoint = this.mapLoader.getSpawnPoint();
        
        // 创建玩家
        this.player = new Player(this, spawnPoint.x, spawnPoint.y);
        
        // 设置玩家碰撞
        this.physicsSystem.setupPlayerCollisions(
            this.player,
            this.tileLayer,
            this.decorations
        );
    }
    
    createEnemies() {
        const enemySpawns = this.mapLoader.getEnemySpawnPoints();
        
        // 创建史莱姆
        if (enemySpawns.slimes) {
            enemySpawns.slimes.forEach(spawn => {
                const slime = new Slime(this, spawn.x, spawn.y);
                this.enemies.push(slime);
            });
        }
        
        // 创建骷髅兵
        if (enemySpawns.skeletons) {
            enemySpawns.skeletons.forEach(spawn => {
                const skeleton = new Skeleton(this, spawn.x, spawn.y);
                this.enemies.push(skeleton);
            });
        }
        
        // 创建BOSS（初始隐藏）
        if (enemySpawns.boss) {
            this.boss = new DeathBoss(this, enemySpawns.boss.x, enemySpawns.boss.y);
            this.enemies.push(this.boss);
        }
        
        // 设置敌人碰撞
        this.physicsSystem.setupEnemyCollisions(
            this.enemies,
            this.tileLayer,
            this.decorations
        );
        
        // 初始化战斗系统
        this.combatSystem.initialize(this.player, this.enemies);
    }
    
    createInteractables() {
        // 创建宝箱
        const chestPositions = this.mapLoader.getChestPositions();
        
        if (chestPositions.small) {
            chestPositions.small.forEach(pos => {
                const chest = new Chest(this, pos.x, pos.y, 'small');
                this.chests.push(chest);
            });
        }
        
        if (chestPositions.large) {
            chestPositions.large.forEach(pos => {
                const chest = new Chest(this, pos.x, pos.y, 'large');
                this.chests.push(chest);
            });
        }
        
        // 创建商店
        const shopPositions = this.mapLoader.getShopPositions();
        if (shopPositions) {
            shopPositions.forEach(pos => {
                const shop = new Shop(this, pos.x, pos.y);
                this.shops.push(shop);
            });
        }
        
        // 创建掉落物组
        this.coinsGroup = this.physics.add.group();
        this.heartsGroup = this.physics.add.group();
    }
    
    setupCollisions() {
        // 玩家与金币碰撞
        this.physicsSystem.setupPickupOverlap(
            this.player,
            this.coinsGroup,
            (player, coin) => {
                coin.collect(player);
            }
        );
        
        // 玩家与心心碰撞
        this.physicsSystem.setupPickupOverlap(
            this.player,
            this.heartsGroup,
            (player, heart) => {
                heart.collect(player);
            }
        );
    }
    
    createUI() {
        this.uiManager.create();
    }
    
    setupCamera() {
        // 设置摄像机跟随玩家
        this.cameras.main.startFollow(this.player, true, 
            GameConfig.CAMERA.LERP, 
            GameConfig.CAMERA.LERP
        );
        
        // 设置摄像机边界
        this.cameras.main.setBounds(0, 0, GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT);
        
        // 设置死区
        this.cameras.main.setDeadzone(GameConfig.CAMERA.DEAD_ZONE, this.cameras.main.height);
    }
    
    setupEventListeners() {
        // 玩家死亡
        this.events.on('playerDeath', () => {
            this.handlePlayerDeath();
        });
        
        // 敌人被击杀
        this.events.on('enemyKilled', (data) => {
            this.handleEnemyKilled(data);
        });
        
        // 生成金币
        this.events.on('spawnCoins', (data) => {
            this.spawnCoins(data.x, data.y, data.count);
        });
        
        // 生成心心
        this.events.on('spawnHearts', (data) => {
            this.spawnHearts(data.x, data.y, data.count);
        });
        
        // 触发BOSS
        this.events.on('triggerBoss', () => {
            this.triggerBoss();
        });
        
        // BOSS开始
        this.events.on('bossStarted', () => {
            this.startBossBattle();
        });
        
        // BOSS被击败
        this.events.on('bossDefeated', () => {
            this.handleBossDefeat();
        });
        
        // BOSS阶段变化
        this.events.on('bossPhaseChange', (phase) => {
            this.uiManager.showGameMessage(`第 ${phase} 阶段！`, 1500);
        });
        
        // 金币收集
        this.events.on('coinCollected', (amount) => {
            this.uiManager.updateCoinDisplay(window.gameData.coins);
        });
        
        // 心心收集
        this.events.on('heartCollected', (amount) => {
            // UI自动更新
        });
        
        // 商店购买
        this.events.on('shopPurchase', (data) => {
            this.uiManager.updateCoinDisplay(window.gameData.coins);
        });
    }
    
    showInitialTutorial() {
        // 显示基础操作提示
        this.time.delayedCall(1000, () => {
            this.uiManager.showTutorial('使用 A/D 移动，空格跳跃', 3000);
        });
        
        this.time.delayedCall(5000, () => {
            this.uiManager.showTutorial('J 键攻击，K 键防御', 3000);
        });
        
        // 检查教学区域
        const tutorials = this.mapLoader.getTutorialZones();
        if (tutorials) {
            tutorials.forEach(zone => {
                // 创建触发区域
                const trigger = this.add.zone(zone.x, zone.y, zone.width, zone.height);
                this.physics.add.existing(trigger, true);
                
                // 设置重叠检测
                this.physics.add.overlap(this.player, trigger, () => {
                    this.showTutorial(zone.properties);
                    trigger.destroy(); // 只触发一次
                });
            });
        }
    }
    
    showTutorial(properties) {
        if (properties) {
            if (properties.type === 'attack') {
                this.uiManager.showTutorial('按 J 键进行攻击！', 3000);
            } else if (properties.type === 'wall_climb') {
                this.uiManager.showTutorial('贴墙时按 W 键可以爬墙，空格键墙跳！', 4000);
            }
        }
    }
    
    spawnCoins(x, y, count) {
        this.physicsSystem.createMultipleDrops(x, y, count, (dropX, dropY) => {
            const coin = new Coin(this, dropX, dropY);
            this.coinsGroup.add(coin);
            this.coins.push(coin);
            
            // 设置掉落物理
            this.physicsSystem.setupDropItemPhysics(
                coin,
                this.tileLayer,
                this.decorations
            );
            
            return coin;
        });
    }
    
    spawnHearts(x, y, count) {
        this.physicsSystem.createMultipleDrops(x, y, count, (dropX, dropY) => {
            const heart = new Heart(this, dropX, dropY);
            this.heartsGroup.add(heart);
            this.hearts.push(heart);
            
            // 设置掉落物理
            this.physicsSystem.setupDropItemPhysics(
                heart,
                this.tileLayer,
                this.decorations
            );
            
            return heart;
        });
    }
    
    handleEnemyKilled(data) {
        // 敌人30秒后重生（非BOSS）
        if (data.enemy && data.enemy.name !== 'death') {
            this.time.delayedCall(30000, () => {
                if (!this.isGameOver && data.enemy && !data.enemy.scene) {
                    // 如果敌人已经被销毁，重新创建
                    const enemyType = data.enemy.name;
                    const spawnPoint = data.enemy.spawnPoint;
                    
                    if (spawnPoint) {
                        let newEnemy;
                        if (enemyType === 'slime') {
                            newEnemy = new Slime(this, spawnPoint.x, spawnPoint.y);
                        } else if (enemyType === 'skeleton') {
                            newEnemy = new Skeleton(this, spawnPoint.x, spawnPoint.y);
                        }
                        
                        if (newEnemy) {
                            this.enemies.push(newEnemy);
                            this.physicsSystem.setupEnemyCollisions(
                                [newEnemy],
                                this.tileLayer,
                                this.decorations
                            );
                        }
                    }
                } else if (data.enemy && data.enemy.scene) {
                    // 如果敌人还存在，直接重生
                    data.enemy.respawn();
                }
            });
        }
    }
    
    handlePlayerDeath() {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        
        // 显示死亡提示
        this.uiManager.showGameMessage('你死了！', 2000);
        
        // 延迟后重生或结束
        this.time.delayedCall(2000, () => {
            // 显示重生选项
            this.showRespawnOptions();
        });
    }
    
    showRespawnOptions() {
        const { width, height } = this.cameras.main;
        
        // 创建选项容器
        const optionsContainer = this.add.container(width / 2, height / 2);
        optionsContainer.setDepth(200);
        
        // 背景
        const bg = this.add.rectangle(0, 0, 300, 150, 0x000000, 0.8);
        bg.setStrokeStyle(2, 0xffffff);
        
        // 提示文字
        const text = this.add.text(0, -40, '是否重新开始？', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 重生按钮
        const respawnBtn = this.createOptionButton(
            -60, 20, '重生',
            () => {
                this.respawnPlayer();
                optionsContainer.destroy();
            }
        );
        
        // 退出按钮
        const exitBtn = this.createOptionButton(
            60, 20, '退出',
            () => {
                this.scene.start('MenuScene');
            }
        );
        
        optionsContainer.add([bg, text, ...respawnBtn, ...exitBtn]);
    }
    
    createOptionButton(x, y, text, callback) {
        const btn = this.add.rectangle(x, y, 80, 30, 0x2c3e50);
        btn.setInteractive({ useHandCursor: true });
        btn.setStrokeStyle(1, 0xffffff);
        
        const btnText = this.add.text(x, y, text, {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        btn.on('pointerdown', callback);
        btn.on('pointerover', () => btn.setFillStyle(0x34495e));
        btn.on('pointerout', () => btn.setFillStyle(0x2c3e50));
        
        return [btn, btnText];
    }
    
    respawnPlayer() {
        const spawnPoint = this.mapLoader.getSpawnPoint();
        this.player.respawn(spawnPoint.x, spawnPoint.y);
        this.isGameOver = false;
    }
    
    triggerBoss() {
        if (this.boss && !this.boss.active) {
            this.boss.spawn();
            this.uiManager.showGameMessage('死神降临！', 2000);
        }
    }
    
    startBossBattle() {
        this.isBossBattle = true;
        this.uiManager.showBossHealthBar();
    }
    
    handleBossDefeat() {
        this.isBossBattle = false;
        this.uiManager.hideBossHealthBar();
        this.uiManager.showGameMessage('胜利！', 3000);
        
        // 延迟后进入结算场景
        this.time.delayedCall(3000, () => {
            this.scene.start('GameOverScene');
        });
    }
    
    checkZoneTransitions() {
        const playerX = this.player.x;
        
        // 检查区域教学触发
        if (playerX > GameConfig.ZONES.ZONE1.end && 
            playerX < GameConfig.ZONES.ZONE2.end) {
            // 区域2教学
        } else if (playerX > GameConfig.ZONES.ZONE2.end && 
                  playerX < GameConfig.ZONES.ZONE3.end) {
            // 区域3教学
        }
    }
    
    update(time, delta) {
        if (this.isGameOver || this.isPaused) {
            return;
        }
        
        // 更新玩家
        if (this.player) {
            this.player.update(time, delta);
        }
        
        // 更新敌人
        this.enemies.forEach(enemy => {
            if (enemy.active) {
                enemy.update(time, delta);
            }
        });
        
        // 更新宝箱
        this.chests.forEach(chest => {
            chest.update();
        });
        
        // 更新商店
        this.shops.forEach(shop => {
            shop.update();
        });
        
        // 更新金币
        this.coins = this.coins.filter(coin => {
            if (coin.active) {
                coin.update(time, delta);
                return true;
            }
            return false;
        });
        
        // 更新心心
        this.hearts = this.hearts.filter(heart => {
            if (heart.active) {
                heart.update(time, delta);
                return true;
            }
            return false;
        });
        
        // 更新战斗系统
        this.combatSystem.update(time, delta);
        
        // 更新UI
        this.uiManager.update();
        
        // 更新视差背景
        this.mapLoader.updateParallax(this.cameras.main);
        
        // 更新BOSS血条
        if (this.isBossBattle && this.boss) {
            this.uiManager.updateBossHealthBar(this.boss.currentHP, this.boss.maxHP);
        }
        
        // 检查区域转换
        this.checkZoneTransitions();
    }
    
    shutdown() {
        // 清理事件监听
        this.events.off('playerDeath');
        this.events.off('enemyKilled');
        this.events.off('spawnCoins');
        this.events.off('spawnHearts');
        this.events.off('triggerBoss');
        this.events.off('bossStarted');
        this.events.off('bossDefeated');
        this.events.off('bossPhaseChange');
        this.events.off('coinCollected');
        this.events.off('heartCollected');
        this.events.off('shopPurchase');
        
        // 清理地图加载器
        if (this.mapLoader) {
            this.mapLoader.destroy();
        }
        
        // 清理系统
        if (this.combatSystem) {
            this.combatSystem.destroy();
        }
        if (this.physicsSystem) {
            this.physicsSystem.destroy();
        }
        if (this.uiManager) {
            this.uiManager.destroy();
        }
    }
}