class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.parallaxLayers = [];
    }
    
    create() {
        const { width, height } = this.cameras.main;
        
        // 创建全局音频管理器（如果不存在）
        if (!this.game.audioManager) {
            this.game.audioManager = new AudioManager(this);
            this.game.audioManager.playBGM('bg');
        }
        
        // 创建视差背景
        this.createParallaxBackground();
        
        // 添加游戏标题
        const title = this.add.text(width / 2, height / 2 - 60, '神秘森林', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // 添加副标题
        const subtitle = this.add.text(width / 2, height / 2 - 20, 'Mysterious Forest', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#cccccc'
        }).setOrigin(0.5);
        
        // 创建开始按钮
        const startButton = this.createButton(
            width / 2, 
            height / 2 + 40, 
            '开始游戏',
            () => this.startGame()
        );
        
        // 创建退出按钮
        const exitButton = this.createButton(
            width / 2, 
            height / 2 + 80, 
            '退出游戏',
            () => this.exitGame()
        );
        
        // 添加操作说明
        this.add.text(width / 2, height - 30, '使用 A/D 移动，空格跳跃，J 攻击，K 防御', {
            fontSize: '12px',
            color: '#888888'
        }).setOrigin(0.5);
        
        // 启动视差滚动
        this.startParallaxScroll();
    }
    
    createParallaxBackground() {
        // 添加远景层
        this.bgLayer1 = this.add.tileSprite(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            'bg_layer_1'
        ).setOrigin(0, 0).setScrollFactor(0).setDepth(-3);
        
        // 添加中景层
        this.bgLayer2 = this.add.tileSprite(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            'bg_layer_2'
        ).setOrigin(0, 0).setScrollFactor(0).setDepth(-2);
        
        // 添加近景层 - 不设置透明度
        this.bgLayer3 = this.add.tileSprite(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            'bg_layer_3'
        ).setOrigin(0, 0).setScrollFactor(0).setDepth(-1);
        
        this.parallaxLayers = [
            { layer: this.bgLayer1, speed: GameConfig.PARALLAX.FAR * 0.2 },
            { layer: this.bgLayer2, speed: GameConfig.PARALLAX.MID * 0.2 },
            { layer: this.bgLayer3, speed: GameConfig.PARALLAX.NEAR * 0.2 }
        ];
    }
    
    startParallaxScroll() {
        // 初始化滚动速度（像素/秒）
        this.scrollSpeeds = [
            10,  // 远景层速度
            20,  // 中景层速度  
            30   // 近景层速度
        ];
    }
    
    createButton(x, y, text, callback) {
        // 创建按钮背景
        const buttonBg = this.add.rectangle(x, y, 180, 40, 0x2c3e50)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xecf0f1);
        
        // 创建按钮文字
        const buttonText = this.add.text(x, y, text, {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 按钮容器
        const button = this.add.container(0, 0, [buttonBg, buttonText]);
        
        // 鼠标悬停效果
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x34495e);
            buttonBg.setScale(1.05);
            buttonText.setScale(1.05);
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x2c3e50);
            buttonBg.setScale(1);
            buttonText.setScale(1);
        });
        
        // 点击事件
        buttonBg.on('pointerdown', () => {
            buttonBg.setScale(0.95);
            buttonText.setScale(0.95);
        });
        
        buttonBg.on('pointerup', () => {
            buttonBg.setScale(1);
            buttonText.setScale(1);
            if (callback) callback();
        });
        
        return button;
    }
    
    startGame() {
        // 重置游戏数据
        if (window.mysteriousForest) {
            window.mysteriousForest.resetGameData();
        }
        
        // 淡出过渡效果
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // 切换到游戏场景
            this.scene.start('GameScene');
        });
    }
    
    exitGame() {
        // 在网页环境中，显示退出确认
        const confirmExit = confirm('确定要退出游戏吗？');
        if (confirmExit) {
            // 显示感谢信息
            this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                '感谢游玩！',
                {
                    fontSize: '32px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            ).setOrigin(0.5).setDepth(100);
            
            // 停止游戏
            this.time.delayedCall(2000, () => {
                this.game.destroy(true);
            });
        }
    }
    
    update(time, delta) {
        // 使用delta时间实现平滑的背景滚动
        if (this.parallaxLayers && this.scrollSpeeds) {
            // delta是上一帧到这一帧的时间（毫秒）
            const deltaSeconds = delta / 1000;
            
            this.parallaxLayers.forEach((item, index) => {
                // 根据时间增量更新位置，确保平滑滚动
                item.layer.tilePositionX += this.scrollSpeeds[index] * deltaSeconds;
            });
        }
    }
}