class Skeleton extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'skeleton', GameConfig.SKELETON);
        
        this.name = 'skeleton';
        
        // 设置碰撞盒
        this.body.setSize(50, 55);
        this.body.setOffset(15, 5);
        
        // 初始动画
        this.animationManager.playAnimation(this, 'idle', true);
    }
    
    getAttackFrame() {
        // 骷髅兵在第5-6帧触发攻击
        return 5;
    }
    
    getDropConfig() {
        return {
            coin: { 
                min: GameConfig.DROP_RATES.SKELETON.COIN.min,
                max: GameConfig.DROP_RATES.SKELETON.COIN.max,
                rate: GameConfig.DROP_RATES.SKELETON.COIN.rate
            },
            heart: { 
                min: GameConfig.DROP_RATES.SKELETON.HEART.min,
                max: GameConfig.DROP_RATES.SKELETON.HEART.max,
                rate: GameConfig.DROP_RATES.SKELETON.HEART.rate
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
        
        const speed = Math.abs(this.body.velocity.x);
        
        if (speed > 10) {
            if (this.isChasing) {
                // 追击时播放run动画
                this.animationManager.playAnimation(this, 'run', true);
            } else {
                // 巡逻时播放idle动画
                this.animationManager.playAnimation(this, 'idle', true);
            }
        } else {
            this.animationManager.playAnimation(this, 'idle', true);
        }
    }
}