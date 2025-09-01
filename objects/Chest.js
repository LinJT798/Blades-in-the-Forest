class Chest extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 'small') {
        const texture = type === 'small' ? 'chest_small' : 'chest_large';
        super(scene, x, y, texture);
        
        this.scene = scene;
        this.type = type;
        this.name = texture;
        this.isOpened = false;
        this.interactionRadius = type === 'small' ? 30 : 40;
        
        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // 静态物体
        
        // 设置碰撞盒
        this.body.setSize(40, 28);
        
        // 交互提示
        this.interactionHint = null;
        
        // 设置深度
        this.setDepth(5);
        
        // 检查是否已经打开过
        if (window.gameData && window.gameData.chestsOpened) {
            const chestId = `${type}_${x}_${y}`;
            if (window.gameData.chestsOpened.includes(chestId)) {
                this.isOpened = true;
                // 显示打开状态的最后一帧
                this.setFrame(this.texture.frameTotal - 1);
            }
        }
    }
    
    update() {
        if (this.isOpened) {
            return;
        }
        
        // 检查玩家距离
        const player = this.scene.player;
        if (player) {
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                player.x, player.y
            );
            
            if (distance <= this.interactionRadius) {
                this.showInteractionHint();
                
                // 检查交互输入
                if (player.keys && player.keys.attack.isDown && 
                    player.keys.attack.getDuration() < 100) {
                    this.open();
                }
            } else {
                this.hideInteractionHint();
            }
        }
    }
    
    showInteractionHint() {
        if (!this.interactionHint) {
            // 创建交互提示
            this.interactionHint = this.scene.add.container(this.x, this.y - 40);
            
            // 背景
            const bg = this.scene.add.rectangle(0, 0, 60, 20, 0x000000, 0.7);
            
            // 文字
            const text = this.scene.add.text(0, 0, '按J打开', {
                fontSize: '12px',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            this.interactionHint.add([bg, text]);
            this.interactionHint.setDepth(100);
            
            // 淡入动画
            this.interactionHint.setAlpha(0);
            this.scene.tweens.add({
                targets: this.interactionHint,
                alpha: 1,
                duration: 200
            });
        }
    }
    
    hideInteractionHint() {
        if (this.interactionHint) {
            this.scene.tweens.add({
                targets: this.interactionHint,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    if (this.interactionHint) {
                        this.interactionHint.destroy();
                        this.interactionHint = null;
                    }
                }
            });
        }
    }
    
    open() {
        if (this.isOpened) {
            return;
        }
        
        this.isOpened = true;
        this.hideInteractionHint();
        
        // 记录已打开
        const chestId = `${this.type}_${this.x}_${this.y}`;
        if (window.gameData) {
            if (!window.gameData.chestsOpened) {
                window.gameData.chestsOpened = [];
            }
            window.gameData.chestsOpened.push(chestId);
        }
        
        // 播放打开动画
        const animKey = this.type === 'small' ? 'chest_small_open' : 'chest_large_open';
        this.play(animKey);
        
        // 播放宝箱打开音效
        if (this.scene.audioManager) {
            this.scene.audioManager.playByTrigger('CHEST_OPEN');
        }
        
        // 动画完成后保持最后一帧
        this.once('animationcomplete', () => {
            this.setFrame(this.texture.frameTotal - 1);
        });
        
        // 生成掉落物
        this.dropItems();
        
        // 如果是大宝箱，触发BOSS
        if (this.type === 'large') {
            this.triggerBoss();
        }
    }
    
    dropItems() {
        const dropConfig = this.type === 'small' ? 
            GameConfig.CHEST_DROPS.SMALL : 
            GameConfig.CHEST_DROPS.LARGE;
        
        // 生成金币
        const coinCount = Phaser.Math.Between(dropConfig.COIN.min, dropConfig.COIN.max);
        this.scene.events.emit('spawnCoins', {
            x: this.x,
            y: this.y - 20,
            count: coinCount
        });
        
        // 生成心心
        if (Math.random() <= dropConfig.HEART.chance) {
            let heartCount;
            if (typeof dropConfig.HEART.amount === 'object') {
                heartCount = Phaser.Math.Between(
                    dropConfig.HEART.amount.min,
                    dropConfig.HEART.amount.max
                );
            } else {
                heartCount = dropConfig.HEART.amount;
            }
            
            this.scene.time.delayedCall(200, () => {
                this.scene.events.emit('spawnHearts', {
                    x: this.x,
                    y: this.y - 20,
                    count: heartCount
                });
            });
        }
    }
    
    triggerBoss() {
        // 延迟触发BOSS出现
        this.scene.time.delayedCall(1000, () => {
            this.scene.events.emit('triggerBoss');
        });
    }
    
    resetChest() {
        // 重置宝箱状态
        this.isOpened = false;
        
        // 恢复到第一帧（关闭状态）
        this.setFrame(0);
        
        // 从已打开列表中移除
        const chestId = `${this.type}_${this.x}_${this.y}`;
        if (window.gameData && window.gameData.chestsOpened) {
            const index = window.gameData.chestsOpened.indexOf(chestId);
            if (index > -1) {
                window.gameData.chestsOpened.splice(index, 1);
            }
        }
        
        // 确保交互提示已清除
        this.hideInteractionHint();
    }
}