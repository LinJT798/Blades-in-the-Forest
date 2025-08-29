class SavePoint extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'sign');
        
        this.scene = scene;
        this.name = 'savepoint';
        this.interactionRadius = 40;
        
        // 存档点ID（用位置生成）
        this.savePointId = `savepoint_${Math.round(x)}_${Math.round(y)}`;
        
        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // 静态物体
        
        // 根据需求设置尺寸
        const targetWidth = GameConfig.DECORATION_SIZES[327].width;
        const targetHeight = GameConfig.DECORATION_SIZES[327].height;
        const scaleX = targetWidth / this.width;
        const scaleY = targetHeight / this.height;
        this.setScale(scaleX, scaleY);
        
        // 设置原点为底部中心
        this.setOrigin(0.5, 1);
        
        // 设置碰撞盒（作为触发器，不阻挡移动）
        this.body.setSize(targetWidth * 2, targetHeight * 2);
        this.body.setOffset(-targetWidth, -targetHeight * 2);
        
        // 设置深度
        this.setDepth(4);
        
        // 是否已激活过
        this.isActivated = false;
        
        // 保存提示
        this.saveHint = null;
        
        // 光效
        this.glowEffect = null;
        
        // 创建光效
        this.createGlowEffect();
    }
    
    createGlowEffect() {
        // 创建一个发光的圆形效果
        this.glowEffect = this.scene.add.graphics();
        this.glowEffect.setDepth(this.depth - 1);
        
        // 创建脉冲动画
        this.scene.tweens.add({
            targets: this,
            scaleX: this.scaleX * 1.1,
            scaleY: this.scaleY * 1.1,
            duration: 1500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        
        this.updateGlowEffect();
    }
    
    updateGlowEffect() {
        if (!this.glowEffect) return;
        
        this.glowEffect.clear();
        
        // 如果已激活，显示绿色光晕
        if (this.isActivated) {
            this.glowEffect.fillStyle(0x00ff00, 0.3);
            this.glowEffect.fillCircle(this.x, this.y - 15, 25);
        } else {
            // 未激活显示白色光晕
            this.glowEffect.fillStyle(0xffffff, 0.2);
            this.glowEffect.fillCircle(this.x, this.y - 15, 20);
        }
    }
    
    update() {
        // 检查玩家距离
        const player = this.scene.player;
        if (!player || player.states.isDead) {
            return;
        }
        
        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            player.x, player.y
        );
        
        if (distance <= this.interactionRadius) {
            this.onPlayerNearby(player);
        } else {
            this.hideInteractionHint();
        }
    }
    
    onPlayerNearby(player) {
        // 如果还没激活过这个存档点
        if (!this.isActivated) {
            this.activateSavePoint(player);
        } else {
            // 显示已存档提示
            this.showInteractionHint('已存档');
        }
    }
    
    activateSavePoint(player) {
        this.isActivated = true;
        
        // 保存游戏状态
        this.saveGameState(player);
        
        // 播放存档动画
        this.playSaveAnimation();
        
        // 更新光效
        this.updateGlowEffect();
        
        // 显示存档成功消息
        this.scene.uiManager.showGameMessage('存档成功！', 2000);
        
        // 播放音效（如果有）
        // this.scene.sound.play('save_sound');
    }
    
    saveGameState(player) {
        // 保存到全局游戏数据
        if (!window.gameData.savePoints) {
            window.gameData.savePoints = {};
        }
        
        // 保存当前存档点数据
        window.gameData.savePoints[this.savePointId] = {
            id: this.savePointId,
            position: { x: this.x, y: this.y },
            playerData: {
                hp: player.currentHP,
                sp: player.currentSP,
                coins: window.gameData.coins,
                buffs: { ...window.gameData.buffs }  // 保存buff状态的副本
            },
            timestamp: Date.now()
        };
        
        // 设置为当前激活的存档点
        window.gameData.currentSavePoint = this.savePointId;
        
        console.log('Game saved at:', this.savePointId, 'with buffs:', window.gameData.buffs);
    }
    
    playSaveAnimation() {
        // 创建保存特效
        const saveEffect = this.scene.add.sprite(this.x, this.y - 30, 'sign');
        saveEffect.setScale(this.scaleX * 1.5, this.scaleY * 1.5);
        saveEffect.setTint(0x00ff00);
        saveEffect.setAlpha(0.8);
        saveEffect.setDepth(100);
        
        // 上升并淡出
        this.scene.tweens.add({
            targets: saveEffect,
            y: this.y - 60,
            alpha: 0,
            scale: this.scaleX * 2,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                saveEffect.destroy();
            }
        });
        
        // 创建粒子效果
        for (let i = 0; i < 8; i++) {
            const particle = this.scene.add.circle(
                this.x + Phaser.Math.Between(-20, 20),
                this.y - 15,
                3,
                0x00ff00
            );
            particle.setDepth(99);
            
            const angle = (Math.PI * 2 / 8) * i;
            const speed = 50;
            
            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * 40,
                y: this.y - 15 + Math.sin(angle) * 40,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    showInteractionHint(text = '存档点') {
        if (!this.saveHint) {
            // 创建交互提示
            this.saveHint = this.scene.add.container(this.x, this.y - 50);
            
            // 背景
            const bg = this.scene.add.rectangle(0, 0, 60, 20, 0x000000, 0.7);
            bg.setStrokeStyle(1, this.isActivated ? 0x00ff00 : 0xffffff);
            
            // 文字
            const hintText = this.scene.add.text(0, 0, text, {
                fontSize: '12px',
                color: this.isActivated ? '#00ff00' : '#ffffff'
            }).setOrigin(0.5);
            
            this.saveHint.add([bg, hintText]);
            this.saveHint.setDepth(100);
            
            // 淡入动画
            this.saveHint.setAlpha(0);
            this.scene.tweens.add({
                targets: this.saveHint,
                alpha: 1,
                duration: 200
            });
        }
    }
    
    hideInteractionHint() {
        if (this.saveHint) {
            this.scene.tweens.add({
                targets: this.saveHint,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    if (this.saveHint) {
                        this.saveHint.destroy();
                        this.saveHint = null;
                    }
                }
            });
        }
    }
    
    // 静态方法：获取最近的存档点数据
    static getLastSavePoint() {
        if (window.gameData && window.gameData.currentSavePoint) {
            return window.gameData.savePoints[window.gameData.currentSavePoint];
        }
        return null;
    }
    
    destroy() {
        if (this.glowEffect) {
            this.glowEffect.destroy();
        }
        if (this.saveHint) {
            this.saveHint.destroy();
        }
        super.destroy();
    }
}