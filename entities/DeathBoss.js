class DeathBoss extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'death', GameConfig.DEATH_BOSS);
        
        this.name = 'death';
        
        // 设置碰撞盒
        this.body.setSize(60, 55);
        this.body.setOffset(10, 10);
        
        // BOSS特有属性
        this.phase = 1; // 当前阶段
        this.baseAttackInterval = GameConfig.DEATH_BOSS.ATTACK_INTERVAL;
        this.attackSpeedBonus = 0;
        
        // 不需要巡逻
        this.patrolRange = 0;
        
        // 初始隐藏
        this.setVisible(false);
        this.setActive(false);
        this.body.enable = false;
        
        // 初始动画
        this.animationManager.playAnimation(this, 'idle', true);
    }
    
    spawn() {
        // BOSS出现动画
        this.setVisible(true);
        this.setActive(true);
        this.body.enable = true;
        
        // 淡入效果
        this.alpha = 0;
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // 开始战斗
                this.startBattle();
            }
        });
        
        // 锁定摄像机
        if (this.scene.cameras.main) {
            this.scene.cameras.main.setBounds(
                GameConfig.CAMERA.BOSS_LOCK_MIN,
                0,
                GameConfig.CAMERA.BOSS_LOCK_MAX - GameConfig.CAMERA.BOSS_LOCK_MIN,
                GameConfig.MAP_HEIGHT
            );
        }
    }
    
    startBattle() {
        // 触发BOSS战事件
        this.scene.events.emit('bossStarted');
    }
    
    updateAI(time, delta) {
        if (!this.active || !this.visible) {
            return;
        }
        
        // 获取战斗系统
        const combatSystem = this.scene.combatSystem;
        if (!combatSystem) return;
        
        // 获取玩家距离
        const playerDistance = combatSystem.getPlayerDistance(this);
        
        // 攻击范围内
        if (playerDistance <= this.attackRadius) {
            this.attack(time);
        } else {
            // 向玩家移动
            const direction = combatSystem.getPlayerDirection(this);
            this.body.setVelocityX(direction * GameConfig.DEATH_BOSS.MOVE_SPEED);
        }
        
        // 更新阶段
        this.updatePhase();
    }
    
    updatePhase() {
        const hpPercent = this.currentHP / this.maxHP;
        
        // 根据血量切换阶段
        if (hpPercent <= 0.75 && this.phase === 1) {
            this.phase = 2;
            this.attackSpeedBonus = 0.1; // 攻击速度提升10%
            this.onPhaseChange();
        } else if (hpPercent <= 0.5 && this.phase === 2) {
            this.phase = 3;
            this.attackSpeedBonus = 0.2; // 攻击速度提升20%
            this.onPhaseChange();
        } else if (hpPercent <= 0.25 && this.phase === 3) {
            this.phase = 4;
            this.attackSpeedBonus = 0.3; // 攻击速度提升30%
            this.onPhaseChange();
        }
        
        // 更新攻击间隔
        this.attackInterval = this.baseAttackInterval * (1 - this.attackSpeedBonus);
    }
    
    onPhaseChange() {
        // 阶段变化特效
        this.scene.tweens.add({
            targets: this,
            tint: { from: 0xffffff, to: 0xff0000 },
            duration: 500,
            yoyo: true,
            onComplete: () => {
                this.clearTint();
            }
        });
        
        // 触发阶段变化事件
        this.scene.events.emit('bossPhaseChange', this.phase);
    }
    
    getAttackFrame() {
        // 死神在第3-5帧触发攻击
        return 3;
    }
    
    triggerAttack() {
        // BOSS范围攻击
        const attackRange = this.attackRadius;
        
        this.scene.events.emit('enemyAttack', {
            x: this.x,
            y: this.y,
            width: attackRange * 2,
            height: 60,
            damage: this.attackPower
        });
    }
    
    getDropConfig() {
        return {
            coin: { 
                min: GameConfig.DROP_RATES.DEATH_BOSS.COIN.min,
                max: GameConfig.DROP_RATES.DEATH_BOSS.COIN.max,
                rate: GameConfig.DROP_RATES.DEATH_BOSS.COIN.rate
            },
            heart: { 
                min: GameConfig.DROP_RATES.DEATH_BOSS.HEART.min,
                max: GameConfig.DROP_RATES.DEATH_BOSS.HEART.max,
                rate: GameConfig.DROP_RATES.DEATH_BOSS.HEART.rate
            }
        };
    }
    
    die() {
        super.die();
        
        // BOSS死亡特效
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                // 触发胜利事件
                this.scene.events.emit('bossDefeated');
                this.destroy();
            }
        });
        
        // 解锁摄像机
        if (this.scene.cameras.main) {
            this.scene.cameras.main.setBounds(
                0, 0,
                GameConfig.MAP_WIDTH,
                GameConfig.MAP_HEIGHT
            );
        }
    }
    
    updateAnimation() {
        if (this.isDead) {
            return;
        }
        
        if (this.isAttacking) {
            // 攻击动画由attack方法控制
            return;
        }
        
        // 默认播放idle动画
        this.animationManager.playAnimation(this, 'idle', true);
    }
}