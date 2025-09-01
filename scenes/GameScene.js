class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // 游戏对象
        this.player = null;
        this.enemies = [];
        this.chests = [];
        this.shops = [];
        this.savePoints = [];
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
        
        // 设置debug快捷键
        this.setupDebugControls();
        
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
        
        // 创建玩家（Y轴上移20像素，避免初始位置过低）
        this.player = new Player(this, spawnPoint.x, spawnPoint.y - 20);
        
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
            // Y轴上移50像素，避免卡在地面里
            this.boss = new DeathBoss(this, enemySpawns.boss.x, enemySpawns.boss.y - 50);
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
        
        // 创建存档点
        const savePointPositions = this.mapLoader.getSavePointPositions();
        if (savePointPositions) {
            savePointPositions.forEach(pos => {
                const savePoint = new SavePoint(this, pos.x, pos.y);
                this.savePoints.push(savePoint);
            });
        }
        
        // 创建掉落物组
        this.coinsGroup = this.physics.add.group();
        this.heartsGroup = this.physics.add.group();
    }
    
    setupCollisions() {
        // 掉落物与地面碰撞
        this.physics.add.collider(this.coinsGroup, this.tileLayer);
        this.physics.add.collider(this.heartsGroup, this.tileLayer);
        
        // 掉落物与装饰物碰撞（只与有碰撞的装饰物）
        if (this.decorations && this.decorations.length > 0) {
            this.physics.add.collider(this.coinsGroup, this.decorations);
            this.physics.add.collider(this.heartsGroup, this.decorations);
        }
        
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
    
    setupDebugControls() {
        // Debug模式 - 启用快捷传送
        const DEBUG_MODE = true;  // 设置为false可以关闭debug功能
        
        if (!DEBUG_MODE) return;
        
        // 显示debug提示
        console.log('========== Debug模式已启用 ==========');
        console.log('数字键1-9: 传送到对应存档点');
        console.log('0键: 传送到起始点');
        console.log('T键: 触发Boss战');
        console.log('G键: 满血满精力');
        console.log('C键: 增加100金币');
        console.log('B键: 切换Boss攻击范围显示');
        console.log('=====================================');
        
        // 为每个数字键设置传送功能
        for (let i = 1; i <= 9; i++) {
            const key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[`ONE`.replace('ONE', 
                ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][i-1])]);
            
            key.on('down', () => {
                this.debugTeleportToSavePoint(i);
            });
        }
        
        // 按0键传送到起始点
        const key0 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO);
        key0.on('down', () => {
            this.debugTeleportToSpawn();
        });
        
        // 按T键触发Boss战
        const keyT = this.input.keyboard.addKey('T');
        keyT.on('down', () => {
            this.debugTriggerBoss();
        });
        
        // 按G键给玩家满血满精力
        const keyG = this.input.keyboard.addKey('G');
        keyG.on('down', () => {
            this.debugFullRestore();
        });
        
        // 按C键增加100金币
        const keyC = this.input.keyboard.addKey('C');
        keyC.on('down', () => {
            this.debugAddCoins();
        });
        
        // 按B键切换Boss Debug显示
        const keyB = this.input.keyboard.addKey('B');
        keyB.on('down', () => {
            this.debugToggleBossDebug();
        });
    }
    
    debugTeleportToSavePoint(index) {
        if (!this.savePoints || this.savePoints.length === 0) {
            this.uiManager.showGameMessage('没有找到存档点', 1500);
            return;
        }
        
        // 获取第index个存档点（索引从0开始）
        const savePoint = this.savePoints[index - 1];
        if (!savePoint) {
            this.uiManager.showGameMessage(`存档点${index}不存在`, 1500);
            return;
        }
        
        // 传送玩家
        this.player.x = savePoint.x;
        this.player.y = savePoint.y - 30;  // 稍微上移避免卡地面
        
        // 重置速度
        this.player.body.setVelocity(0, 0);
        
        // 显示提示
        this.uiManager.showGameMessage(`已传送到存档点${index}`, 1500);
        console.log(`Debug: 传送到存档点${index} (${savePoint.x}, ${savePoint.y})`);
    }
    
    debugTeleportToSpawn() {
        const spawnPoint = this.mapLoader.getSpawnPoint();
        this.player.x = spawnPoint.x;
        this.player.y = spawnPoint.y - 20;
        this.player.body.setVelocity(0, 0);
        
        this.uiManager.showGameMessage('已传送到起始点', 1500);
        console.log(`Debug: 传送到起始点 (${spawnPoint.x}, ${spawnPoint.y})`);
    }
    
    debugTriggerBoss() {
        if (this.boss) {
            this.triggerBoss();
            this.uiManager.showGameMessage('Debug: 触发Boss战', 1500);
        }
    }
    
    debugFullRestore() {
        this.player.currentHP = this.player.maxHP;
        this.player.currentSP = this.player.maxSP;
        
        this.uiManager.updateHealthBar(this.player.currentHP, this.player.maxHP);
        this.uiManager.showGameMessage('Debug: 满血满精力', 1500);
    }
    
    debugAddCoins() {
        window.gameData.coins += 100;
        this.uiManager.updateCoinDisplay(window.gameData.coins);
        this.uiManager.showGameMessage('Debug: +100金币', 1500);
    }
    
    debugToggleBossDebug() {
        if (this.boss) {
            const currentState = this.boss.debugMode || false;
            this.boss.setDebugMode(!currentState);
            
            const message = !currentState ? 
                'Debug: Boss攻击范围显示[开启]' : 
                'Debug: Boss攻击范围显示[关闭]';
            this.uiManager.showGameMessage(message, 1500);
            console.log(message);
        } else {
            this.uiManager.showGameMessage('Debug: Boss未出现', 1500);
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
        // 移除定时复活功能，敌人死亡后不再重生
        // 只记录击杀信息，用于存档复活时重置
        if (data.enemy) {
            // 记录原始出生点，用于存档复活时重置
            if (!data.enemy.originalSpawnPoint) {
                data.enemy.originalSpawnPoint = {
                    x: data.x,
                    y: data.y
                };
            }
        }
    }
    
    handlePlayerDeath() {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        
        // 暂停物理系统
        this.physics.pause();
        
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
        optionsContainer.setScrollFactor(0);
        
        // 检查是否有存档点
        const lastSavePoint = SavePoint.getLastSavePoint();
        
        if (lastSavePoint) {
            // 有存档点，显示扩展选项
            const bg = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.8);
            bg.setStrokeStyle(2, 0xffffff);
            
            const text = this.add.text(0, -60, '选择重生点', {
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            // 显示存档信息
            const saveInfo = this.add.text(0, -30, 
                `最近存档: HP ${lastSavePoint.playerData.hp}/${GameConfig.PLAYER_MAX_HP} | 金币 ${lastSavePoint.playerData.coins}`, {
                fontSize: '12px',
                color: '#88ff88'
            }).setOrigin(0.5);
            
            // 从存档点重生按钮
            const saveRespawnBtn = this.createOptionButton(
                -120, 20, '从存档点重生',
                () => {
                    this.respawnFromSavePoint(lastSavePoint);
                    optionsContainer.destroy();
                }
            );
            
            // 从起始点重生按钮
            const startRespawnBtn = this.createOptionButton(
                0, 20, '从起始点重生',
                () => {
                    this.respawnPlayer();
                    optionsContainer.destroy();
                }
            );
            
            // 退出按钮
            const exitBtn = this.createOptionButton(
                120, 20, '退出',
                () => {
                    this.scene.start('MenuScene');
                }
            );
            
            optionsContainer.add([bg, text, saveInfo, ...saveRespawnBtn, ...startRespawnBtn, ...exitBtn]);
        } else {
            // 没有存档点，显示原始选项
            const bg = this.add.rectangle(0, 0, 300, 150, 0x000000, 0.8);
            bg.setStrokeStyle(2, 0xffffff);
            
            const text = this.add.text(0, -40, '是否重新开始？', {
                fontSize: '16px',
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
    }
    
    createOptionButton(x, y, text, callback) {
        const btn = this.add.rectangle(x, y, 100, 35, 0x2c3e50);
        btn.setInteractive({ useHandCursor: true });
        btn.setStrokeStyle(2, 0xffffff);
        btn.setScrollFactor(0); // 固定在屏幕上
        
        const btnText = this.add.text(x, y, text, {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        btnText.setScrollFactor(0); // 固定在屏幕上
        
        btn.on('pointerdown', callback);
        btn.on('pointerover', () => {
            btn.setFillStyle(0x34495e);
            btn.setScale(1.1);
        });
        btn.on('pointerout', () => {
            btn.setFillStyle(0x2c3e50);
            btn.setScale(1);
        });
        
        return [btn, btnText];
    }
    
    respawnPlayer() {
        const spawnPoint = this.mapLoader.getSpawnPoint();
        this.player.respawn(spawnPoint.x, spawnPoint.y);
        this.isGameOver = false;
        
        // 重置Boss状态（如果在Boss战中死亡）
        if (this.boss) {
            this.resetBoss();
        }
        
        // 恢复物理系统
        this.physics.resume();
    }
    
    respawnFromSavePoint(savePointData) {
        // 重生到存档点位置（稍微上移一点，避免卡在地面）
        this.player.respawn(savePointData.position.x, savePointData.position.y - 10);
        
        // 恢复存档时的状态
        this.player.currentHP = savePointData.playerData.hp;
        this.player.currentSP = savePointData.playerData.sp || GameConfig.PLAYER_MAX_SP;
        window.gameData.coins = savePointData.playerData.coins;
        
        // 重置Boss状态（如果在Boss战中死亡）
        if (this.boss) {
            this.resetBoss();
            
            // 重置摄像机边界，确保摄像机能正常跟随玩家
            this.cameras.main.setBounds(0, 0, GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT);
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        }
        
        // 恢复buff状态（卡片效果）
        if (savePointData.playerData.buffs) {
            window.gameData.buffs = { ...savePointData.playerData.buffs };
            
            // 重新应用buff效果到玩家
            this.applyBuffsToPlayer();
        }
        
        // 重置区域内的敌人
        this.resetEnemiesInRange(savePointData.position.x);
        
        // 如果Boss已经触发，重置Boss状态
        if (this.boss && this.boss.active) {
            this.resetBoss();
        }
        
        // 重置摄像机边界，恢复跟随玩家
        this.cameras.main.setBounds(0, 0, GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        // 更新UI
        this.uiManager.updateHealthBar(this.player.currentHP, this.player.maxHP);
        this.uiManager.updateCoinDisplay(window.gameData.coins);
        // 注意：UIManager中没有updateEnergyBar方法，精力条会在update中自动更新
        
        // 显示提示
        this.uiManager.showGameMessage('从存档点重生', 2000);
        
        this.isGameOver = false;
        
        // 恢复物理系统
        this.physics.resume();
    }
    
    resetEnemiesInRange(currentX) {
        // 找到下一个存档点的位置
        let nextSavePointX = GameConfig.MAP_WIDTH; // 默认为地图末尾
        
        // 获取所有存档点位置并排序
        const savePointPositions = this.savePoints.map(sp => sp.x).sort((a, b) => a - b);
        
        // 找到当前位置之后的下一个存档点
        for (let x of savePointPositions) {
            if (x > currentX) {
                nextSavePointX = x;
                break;
            }
        }
        
        // 获取原始敌人出生点
        const enemySpawns = this.mapLoader.getEnemySpawnPoints();
        
        // 清理当前区域内的所有敌人（但不包括Boss）
        this.enemies = this.enemies.filter(enemy => {
            // Boss不应该被重置，它有自己的重置逻辑
            if (enemy === this.boss) {
                return true;
            }
            
            if (enemy.x >= currentX && enemy.x < nextSavePointX) {
                // 销毁区域内的敌人
                if (enemy.active) {
                    enemy.destroy();
                }
                return false;
            }
            return true;
        });
        
        // 重新创建区域内的敌人
        if (enemySpawns.slimes) {
            enemySpawns.slimes.forEach(spawn => {
                if (spawn.x >= currentX && spawn.x < nextSavePointX) {
                    const slime = new Slime(this, spawn.x, spawn.y);
                    this.enemies.push(slime);
                    this.physicsSystem.setupEnemyCollisions(
                        [slime],
                        this.tileLayer,
                        this.decorations
                    );
                }
            });
        }
        
        if (enemySpawns.skeletons) {
            enemySpawns.skeletons.forEach(spawn => {
                if (spawn.x >= currentX && spawn.x < nextSavePointX) {
                    const skeleton = new Skeleton(this, spawn.x, spawn.y);
                    this.enemies.push(skeleton);
                    this.physicsSystem.setupEnemyCollisions(
                        [skeleton],
                        this.tileLayer,
                        this.decorations
                    );
                }
            });
        }
        
        console.log(`重置了区域内的敌人 (${currentX} - ${nextSavePointX})`);
    }
    
    applyBuffsToPlayer() {
        // 重新应用所有buff效果
        if (window.gameData.buffs) {
            // 防御提升
            if (window.gameData.buffs.defense_up) {
                // 防御buff会在玩家的takeDamage方法中自动生效
                console.log('防御buff已恢复');
            }
            
            // 吸血效果
            if (window.gameData.buffs.lifesteal) {
                // 吸血效果会在战斗系统中自动生效
                console.log('吸血buff已恢复');
            }
            
            // 自动回复（如果有的话，需要重新启动定时器）
            if (window.gameData.buffs.idle_regen) {
                console.log('自动回复buff已恢复');
            }
        }
    }
    
    spawnCoins(x, y, count) {
        // 生成多个金币，带有物理抛物线效果
        for (let i = 0; i < count; i++) {
            // 为每个金币添加随机偏移，避免重叠
            const offsetX = Phaser.Math.Between(-20, 20);
            const spawnY = y - 30; // 从敌人上方生成，确保有下落过程
            
            const coin = new Coin(this, x + offsetX, spawnY);
            
            // 设置随机初速度，向外扩散
            const vx = Phaser.Math.Between(
                GameConfig.DROP_INITIAL_VX[0], 
                GameConfig.DROP_INITIAL_VX[1]
            ) * (i % 2 === 0 ? 1 : -1); // 交替向左右飞
            const vy = Phaser.Math.Between(
                GameConfig.DROP_INITIAL_VY[0],
                GameConfig.DROP_INITIAL_VY[1]
            );
            
            coin.body.setVelocity(vx, vy);
            this.coinsGroup.add(coin);
        }
    }
    
    spawnHearts(x, y, count) {
        // 生成多个心心，带有物理抛物线效果
        for (let i = 0; i < count; i++) {
            // 为每个心心添加随机偏移，避免重叠
            const offsetX = Phaser.Math.Between(-20, 20);
            const spawnY = y - 30; // 从敌人上方生成，确保有下落过程
            
            const heart = new Heart(this, x + offsetX, spawnY);
            
            // 设置随机初速度，向外扩散
            const vx = Phaser.Math.Between(
                GameConfig.DROP_INITIAL_VX[0],
                GameConfig.DROP_INITIAL_VX[1]
            ) * (i % 2 === 0 ? 1 : -1); // 交替向左右飞
            const vy = Phaser.Math.Between(
                GameConfig.DROP_INITIAL_VY[0],
                GameConfig.DROP_INITIAL_VY[1]
            );
            
            heart.body.setVelocity(vx, vy);
            this.heartsGroup.add(heart);
        }
    }
    
    triggerBoss() {
        if (this.boss && !this.boss.active) {
            this.boss.spawn();
            
            // 确保Boss在enemies数组中（防止被resetEnemiesInRange误删后未恢复）
            if (!this.enemies.includes(this.boss)) {
                this.enemies.push(this.boss);
                // 同时确保在战斗系统中
                if (this.combatSystem) {
                    this.combatSystem.addEnemy(this.boss);
                }
            }
            
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
    
    resetBoss() {
        if (!this.boss) return;
        
        // 隐藏Boss
        this.boss.setVisible(false);
        this.boss.setActive(false);
        if (this.boss.body) {
            this.boss.body.enable = false;
        }
        
        // 重置Boss位置到初始生成点
        const enemySpawns = this.mapLoader.getEnemySpawnPoints();
        if (enemySpawns.boss) {
            this.boss.x = enemySpawns.boss.x;
            this.boss.y = enemySpawns.boss.y - 50;
            // 重置速度和物理属性
            if (this.boss.body) {
                this.boss.body.setVelocity(0, 0);
                this.boss.body.setAllowGravity(false); // Boss不受重力影响
            }
        }
        
        // 重置Boss状态
        this.boss.currentHP = this.boss.maxHP;
        this.boss.isDead = false;
        this.boss.isAttacking = false;
        this.boss.isTeleporting = false;
        this.boss.phase = 1;
        this.boss.attackSpeedBonus = 0;
        this.boss.lastAttackTime = Date.now();
        this.boss.teleportCooldown = 0;
        this.boss.isStunned = false;
        
        // 重置Enemy基类的属性
        this.boss.isChasing = false;
        this.boss.patrolDirection = 1;
        this.boss.patrolCenter = this.boss.x;
        this.boss.attackInterval = this.boss.baseAttackInterval;
        
        // 清除Boss动画和效果
        if (this.boss.anims) {
            this.boss.anims.stop();
        }
        this.boss.clearTint();
        this.boss.alpha = 1;
        
        // 关闭Debug显示
        if (this.boss.debugGraphics) {
            this.boss.debugGraphics.clear();
        }
        if (this.boss.debugText) {
            this.boss.debugText.setVisible(false);
        }
        
        // 重置Boss战状态
        this.isBossBattle = false;
        this.uiManager.hideBossHealthBar();
        
        // 重置Boss触发的宝箱（如果有的话）
        // 找到Boss区域的大宝箱并重置（Boss区域在x > 3200的位置）
        this.chests.forEach(chest => {
            if (chest.type === 'large' && chest.x > 3200) {
                chest.resetChest();
            }
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
            
            // 检查玩家是否掉落到地图底部（地图高度288 + 100 = 388）
            if (this.player.y > GameConfig.MAP_HEIGHT + 100) {
                console.log('Player fell off the map! Y:', this.player.y);
                // 玩家掉出地图，触发死亡
                if (!this.player.states.isDead) {
                    this.player.takeDamage(this.player.currentHP);
                }
            }
        }
        
        // 更新敌人
        this.enemies.forEach(enemy => {
            if (enemy.active) {
                enemy.update(time, delta);
                
                // 检查敌人是否掉落到地图底部
                if (enemy.y > GameConfig.MAP_HEIGHT + 100) {
                    // 敌人掉出地图，直接死亡
                    if (!enemy.isDead) {
                        enemy.die();
                    }
                }
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
        
        // 更新存档点
        this.savePoints.forEach(savePoint => {
            savePoint.update();
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