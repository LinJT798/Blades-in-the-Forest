class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, config) {
        super(scene, x, y, texture);
        
        this.scene = scene;
        this.config = config;
        this.spawnPoint = { x: x, y: y };
        
        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // 设置物理属性
        this.setCollideWorldBounds(true);
        this.setGravityY(0); // 使用世界重力
        
        // 基础属性
        this.maxHP = config.HP;
        this.currentHP = config.HP;
        this.attackPower = config.ATTACK;
        this.moveSpeed = config.PATROL_SPEED;
        this.detectRadius = config.DETECT_RADIUS;
        this.attackRadius = config.ATTACK_RADIUS;
        this.attackInterval = config.ATTACK_INTERVAL;
        this.patrolRange = config.PATROL_RANGE;
        
        // 状态
        this.isDead = false;
        this.isAttacking = false;
        this.isInvincible = false;
        this.isChasing = false;
        this.isStunned = false;  // 添加眩晕状态初始化
        this.facingRight = true;
        
        // AI相关
        this.lastAttackTime = 0;
        this.patrolDirection = 1;
        this.patrolCenter = x;
        
        // 动画管理器
        this.animationManager = new AnimationManager(scene);
        
        // 设置缩放
        if (config.SCALE) {
            this.setScale(config.SCALE);
        }
        
        // 设置深度
        this.setDepth(8);
        
        // 视野检测
        this.viewDistance = GameConfig.GAME_WIDTH;
    }
    
    update(time, delta) {
        if (this.isDead) {
            return;
        }
        
        // 检查是否在视野内
        if (!this.isInView()) {
            this.body.setVelocityX(0);
            return;
        }
        
        // 执行AI行为
        this.updateAI(time, delta);
        
        // 更新动画
        this.updateAnimation();
        
        // 更新朝向
        this.updateDirection();
    }
    
    updateAI(time, delta) {
        // 如果被眩晕，停止所有AI行为
        if (this.isStunned) {
            // 硬直期间不执行任何动作
            return;
        }
        
        // 获取战斗系统
        const combatSystem = this.scene.combatSystem;
        if (!combatSystem) return;
        
        // 获取玩家距离
        const playerDistance = combatSystem.getPlayerDistance(this);
        
        // 检测范围内
        if (playerDistance <= this.detectRadius) {
            // 进入追击模式
            this.isChasing = true;
            
            // 攻击范围内
            if (playerDistance <= this.attackRadius) {
                this.attack(time);
            } else {
                this.chasePlayer();
            }
        } else {
            // 巡逻模式
            this.isChasing = false;
            this.patrol();
        }
    }
    
    patrol() {
        // 巡逻逻辑
        const leftBound = this.patrolCenter - this.patrolRange;
        const rightBound = this.patrolCenter + this.patrolRange;
        
        // 到达边界时转向
        if (this.x <= leftBound && this.patrolDirection < 0) {
            this.patrolDirection = 1;
        } else if (this.x >= rightBound && this.patrolDirection > 0) {
            this.patrolDirection = -1;
        }
        
        // 检查前方是否有障碍
        if (this.body.blocked.left && this.patrolDirection < 0) {
            this.patrolDirection = 1;
        } else if (this.body.blocked.right && this.patrolDirection > 0) {
            this.patrolDirection = -1;
        }
        
        // 检查前方是否有地面（防止跳下平台）
        if (this.checkPlatformEdge()) {
            this.patrolDirection *= -1; // 转向
        }
        
        // 设置速度
        this.body.setVelocityX(this.moveSpeed * this.patrolDirection);
    }
    
    chasePlayer() {
        const combatSystem = this.scene.combatSystem;
        if (!combatSystem) return;
        
        const direction = combatSystem.getPlayerDirection(this);
        const chaseSpeed = this.config.CHASE_SPEED || this.moveSpeed;
        
        // 检查前方是否有地面（防止跳下平台）
        if (this.checkPlatformEdge()) {
            // 如果前方没有地面，停止追击
            this.body.setVelocityX(0);
            return;
        }
        
        this.body.setVelocityX(direction * chaseSpeed);
    }
    
    attack(time) {
        // 停止移动
        this.body.setVelocityX(0);
        
        // 检查攻击冷却
        if (time - this.lastAttackTime < this.attackInterval) {
            return;
        }
        
        // 设置攻击状态
        this.isAttacking = true;
        this.lastAttackTime = time;
        
        // 强制播放攻击动画
        this.stop(); // 停止当前动画
        this.play(this.animationManager.getFullAnimationKey(this, 'fight'));
        
        // 延迟触发攻击判定
        this.scene.time.delayedCall(this.getAttackFrame() * 100, () => {
            if (!this.isDead) {
                this.triggerAttack();
            }
        });
        
        // 攻击动画持续时间后重置状态
        // fight动画有7帧，帧率8fps，大约875ms
        this.scene.time.delayedCall(875, () => {
            this.isAttacking = false;
        });
    }
    
    triggerAttack() {
        const attackRange = this.facingRight ? this.attackRadius : -this.attackRadius;
        
        this.scene.events.emit('enemyAttack', {
            x: this.x + attackRange / 2,
            y: this.y,
            width: this.attackRadius,
            height: 40,
            damage: this.attackPower
        });
    }
    
    getAttackFrame() {
        // 子类重写此方法返回攻击判定帧
        return 3;
    }
    
    takeDamage(damage) {
        if (this.isDead || this.isInvincible) {
            return;
        }
        
        this.currentHP = Math.max(0, this.currentHP - damage);
        
        if (this.currentHP <= 0) {
            this.die();
        } else {
            this.onHit();
        }
    }
    
    onHit() {
        // 检查场景是否有效
        if (!this.scene || !this.scene.time) {
            return;
        }
        
        // 受击硬直
        this.isStunned = true;
        this.isAttacking = false;  // 中断攻击
        
        // 受击闪烁
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.active) {
                this.clearTint();
            }
        });
        
        // 短暂无敌
        this.isInvincible = true;
        this.scene.time.delayedCall(300, () => {
            if (this.active) {
                this.isInvincible = false;
            }
        });
        
        // 硬直恢复时间（比无敌时间短，让敌人能更快恢复行动）
        this.scene.time.delayedCall(200, () => {
            if (this.active) {
                this.isStunned = false;
            }
        });
        
        // 击退效果由CombatSystem统一处理
    }
    
    die() {
        // 检查是否已经死亡，避免重复调用
        if (this.isDead) {
            return;
        }
        
        // 检查场景是否有效
        if (!this.scene || !this.scene.time) {
            return;
        }
        
        this.isDead = true;
        this.isAttacking = false;
        
        // 检查 body 是否存在再操作
        if (this.body) {
            this.body.setVelocity(0, 0);
            this.body.enable = false;
        }
        
        // 播放死亡动画
        if (this.animationManager) {
            this.animationManager.playAnimation(this, 'death');
        }
        
        // 立即触发掉落
        this.dropItems();
        
        // 延迟销毁敌人精灵
        this.scene.time.delayedCall(2000, () => {
            if (this.active) {
                this.destroy();
            }
        });
    }
    
    dropItems() {
        const dropConfig = this.getDropConfig();
        
        // 金币掉落
        if (dropConfig.coin && Math.random() <= dropConfig.coin.rate) {
            const count = Phaser.Math.Between(dropConfig.coin.min, dropConfig.coin.max);
            this.scene.events.emit('spawnCoins', {
                x: this.x,
                y: this.y,
                count: count
            });
        }
        
        // 心心掉落
        if (dropConfig.heart && Math.random() <= dropConfig.heart.rate) {
            const count = Phaser.Math.Between(dropConfig.heart.min, dropConfig.heart.max);
            this.scene.events.emit('spawnHearts', {
                x: this.x,
                y: this.y,
                count: count
            });
        }
    }
    
    getDropConfig() {
        // 子类重写此方法返回掉落配置
        return {
            coin: { min: 1, max: 3, rate: 1.0 },
            heart: { min: 0, max: 1, rate: 0.2 }
        };
    }
    
    updateAnimation() {
        if (this.isDead) {
            return;
        }
        
        if (this.isAttacking) {
            return; // 攻击动画由攻击函数控制
        }
        
        const speed = Math.abs(this.body.velocity.x);
        
        if (speed > 10) {
            if (this.isChasing) {
                this.animationManager.playAnimation(this, 'run', true);
            } else {
                this.animationManager.playAnimation(this, 'idle', true);
            }
        } else {
            this.animationManager.playAnimation(this, 'idle', true);
        }
    }
    
    updateDirection() {
        if (this.body.velocity.x > 0) {
            this.facingRight = true;
            this.setFlipX(false);
        } else if (this.body.velocity.x < 0) {
            this.facingRight = false;
            this.setFlipX(true);
        }
    }
    
    checkPlatformEdge() {
        // 检查前方是否有地面，防止敌人跳下平台
        const tileLayer = this.scene.mapLoader?.getTileLayer();
        if (!tileLayer) return false;
        
        // 根据移动方向确定检测位置
        const checkDirection = this.body.velocity.x > 0 ? 1 : -1;
        const checkDistance = 20; // 前方检测距离
        
        // 检测点：敌人前方下方位置
        const checkX = this.x + (checkDirection * checkDistance);
        const checkY = this.body.bottom + 10; // 脚下稍微往下一点
        
        // 获取检测点的瓦片
        const tile = tileLayer.getTileAtWorldXY(checkX, checkY);
        
        // 如果前方下方没有实体瓦片，说明是平台边缘
        return !tile || !tile.collides;
    }
    
    isInView() {
        if (!this.scene.cameras.main) {
            return true;
        }
        
        const camera = this.scene.cameras.main;
        const cameraView = {
            left: camera.scrollX - 100,
            right: camera.scrollX + camera.width + 100,
            top: camera.scrollY - 100,
            bottom: camera.scrollY + camera.height + 100
        };
        
        return this.x > cameraView.left && 
               this.x < cameraView.right &&
               this.y > cameraView.top && 
               this.y < cameraView.bottom;
    }
    
    respawn() {
        // 重生逻辑
        this.x = this.spawnPoint.x;
        this.y = this.spawnPoint.y;
        this.currentHP = this.maxHP;
        this.isDead = false;
        this.isAttacking = false;
        this.isInvincible = false;
        this.isChasing = false;
        
        // 确保body存在
        if (this.body) {
            this.body.enable = true;
        }
        
        this.clearTint();
        this.alpha = 1;
        this.setActive(true);
        this.setVisible(true);
        
        // 如果body被销毁了，重新添加物理体
        if (!this.body && this.scene) {
            this.scene.physics.add.existing(this);
            this.setCollideWorldBounds(true);
        }
    }
}