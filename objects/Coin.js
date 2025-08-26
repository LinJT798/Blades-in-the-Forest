class Coin extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'coin');
        
        this.scene = scene;
        this.name = 'coin';
        
        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // 设置物理属性
        this.body.setSize(14, 14);
        this.body.setBounce(GameConfig.DROP_BOUNCE);
        this.body.setFriction(GameConfig.DROP_FRICTION);
        
        // 播放动画
        this.play('coin_idle');
        
        // 设置生命周期
        this.lifeTime = GameConfig.COIN_LIFETIME;
        this.createTime = scene.time.now;
        
        // 设置深度
        this.setDepth(6);
        
        // 是否已被拾取
        this.isCollected = false;
        
        // 闪烁警告计时器
        this.warningTimer = null;
    }
    
    update(time, delta) {
        if (this.isCollected) {
            return;
        }
        
        // 检查生命周期
        const elapsedTime = time - this.createTime;
        
        // 最后5秒闪烁警告
        if (elapsedTime > this.lifeTime - 5000 && !this.warningTimer) {
            this.startWarning();
        }
        
        // 超时销毁
        if (elapsedTime > this.lifeTime) {
            this.expire();
        }
        
        // 落地后停止弹跳
        if (this.body.velocity.y < 1 && this.body.touching.down) {
            this.body.setVelocityY(0);
            this.body.setBounce(0);
        }
    }
    
    startWarning() {
        this.warningTimer = this.scene.time.addEvent({
            delay: 200,
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
        
        this.isCollected = true;
        
        // 增加金币数
        if (window.gameData) {
            window.gameData.coins++;
        }
        
        // 拾取动画
        this.scene.tweens.add({
            targets: this,
            y: this.y - 30,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
            }
        });
        
        // 触发拾取事件
        this.scene.events.emit('coinCollected', 1);
        
        // 播放拾取音效（如果有）
        // this.scene.sound.play('coin_pickup');
    }
    
    destroy() {
        if (this.warningTimer) {
            this.warningTimer.destroy();
        }
        super.destroy();
    }
}