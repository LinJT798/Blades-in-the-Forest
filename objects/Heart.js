class Heart extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'heart');
        
        this.scene = scene;
        this.name = 'heart';
        
        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // 设置物理属性
        this.body.setSize(14, 14);
        this.body.setBounce(GameConfig.DROP_BOUNCE * 0.5); // 心心弹跳较小
        this.body.setFriction(GameConfig.DROP_FRICTION);
        
        // 播放动画
        this.play('heart_idle');
        
        // 设置生命周期
        this.lifeTime = GameConfig.HEART_LIFETIME;
        this.createTime = scene.time.now;
        
        // 设置深度
        this.setDepth(6);
        
        // 是否已被拾取
        this.isCollected = false;
        
        // 闪烁警告计时器
        this.warningTimer = null;
        
        // 治疗量
        this.healAmount = 10;
    }
    
    update(time, delta) {
        if (this.isCollected) {
            return;
        }
        
        // 检查生命周期
        const elapsedTime = time - this.createTime;
        
        // 最后3秒闪烁警告
        if (elapsedTime > this.lifeTime - 3000 && !this.warningTimer) {
            this.startWarning();
        }
        
        // 超时销毁
        if (elapsedTime > this.lifeTime) {
            this.expire();
        }
        
        // 落地后轻微弹跳
        if (this.body.touching.down) {
            // 保持轻微的上下跳动
            if (Math.abs(this.body.velocity.y) < 10) {
                this.body.setVelocityY(-50);
            }
        }
    }
    
    startWarning() {
        this.warningTimer = this.scene.time.addEvent({
            delay: 150,
            callback: () => {
                this.setVisible(!this.visible);
            },
            loop: true
        });
    }
    
    expire() {
        // 淡出效果
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.destroy();
            }
        });
    }
    
    collect(player) {
        if (this.isCollected) {
            return;
        }
        
        // 检查是否满血
        if (player.currentHP >= player.maxHP) {
            return; // 满血不能拾取
        }
        
        this.isCollected = true;
        
        // 治疗玩家
        player.heal(this.healAmount);
        
        // 拾取动画
        this.scene.tweens.add({
            targets: this,
            y: this.y - 40,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
            }
        });
        
        // 显示治疗数字
        this.showHealNumber();
        
        // 触发拾取事件
        this.scene.events.emit('heartCollected', this.healAmount);
        
        // 播放拾取音效（如果有）
        // this.scene.sound.play('heart_pickup');
    }
    
    showHealNumber() {
        // 创建治疗数字
        const healText = this.scene.add.text(this.x, this.y - 20, `+${this.healAmount}`, {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        healText.setDepth(100);
        
        // 上升动画
        this.scene.tweens.add({
            targets: healText,
            y: this.y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                healText.destroy();
            }
        });
    }
    
    destroy() {
        if (this.warningTimer) {
            this.warningTimer.destroy();
        }
        super.destroy();
    }
}