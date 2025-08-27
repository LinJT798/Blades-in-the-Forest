class Slime extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'slime', GameConfig.SLIME);
        
        this.name = 'slime';
        
        // 设置碰撞盒
        this.body.setSize(80, 40);
        this.body.setOffset(12, 12);
        
        // 初始动画
        this.animationManager.playAnimation(this, 'idle', true);
    }
    
    getAttackFrame() {
        // 史莱姆在第3-4帧触发攻击
        return 3;
    }
    
    getDropConfig() {
        return {
            coin: { 
                min: GameConfig.DROP_RATES.SLIME.COIN.min,
                max: GameConfig.DROP_RATES.SLIME.COIN.max,
                rate: GameConfig.DROP_RATES.SLIME.COIN.rate
            },
            heart: { 
                min: GameConfig.DROP_RATES.SLIME.HEART.min,
                max: GameConfig.DROP_RATES.SLIME.HEART.max,
                rate: GameConfig.DROP_RATES.SLIME.HEART.rate
            }
        };
    }
    
    updateAnimation() {
        if (this.isDead) {
            return;
        }
        
        if (this.isAttacking) {
            // 攻击动画由attack方法控制
            return;
        }
        
        if (this.isChasing) {
            // 史莱姆追击时播放fight动画
            this.animationManager.playAnimation(this, 'fight', true);
        } else {
            // 巡逻时播放idle动画
            this.animationManager.playAnimation(this, 'idle', true);
        }
    }
}