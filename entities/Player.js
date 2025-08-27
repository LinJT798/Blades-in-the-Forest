class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_1');
        
        this.scene = scene;
        this.name = 'player';
        
        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // 设置物理属性
        this.setCollideWorldBounds(true);
        this.setGravityY(0); // 使用世界重力
        this.body.setSize(40, 50);
        this.body.setOffset(8, 6);
        
        // 玩家属性
        this.maxHP = GameConfig.PLAYER_MAX_HP;
        this.maxSP = GameConfig.PLAYER_MAX_SP;
        this.currentHP = window.gameData ? window.gameData.playerHP : this.maxHP;
        this.currentSP = window.gameData ? window.gameData.playerSP : this.maxSP;
        this.attackPower = GameConfig.PLAYER_ATTACK;
        this.comboAttackPower = GameConfig.PLAYER_COMBO_ATTACK;
        
        // 状态标志
        this.states = {
            isRunning: false,
            isJumping: false,
            isAttacking: false,
            isDefending: false,
            isInvincible: false,
            isStunned: false,
            isDead: false,
            isOnWall: false,
            canDoubleJump: false,
            facingRight: true
        };
        
        // 动画管理器
        this.animationManager = new AnimationManager(scene);
        
        // 输入控制
        this.setupInputs();
        
        // 计时器
        this.timers = {
            invincibleTimer: null,
            stunTimer: null,
            attackCooldown: null,
            comboCooldown: null,
            spRecoveryTimer: null
        };
        
        // 连击相关
        this.comboWindow = false;
        this.comboFrameStart = 4;
        this.comboFrameEnd = 6;
        
        // 设置动画事件
        this.setupAnimationEvents();
        
        // 启动精力恢复
        this.startSPRecovery();
        
        // 设置深度
        this.setDepth(10);
    }
    
    setupInputs() {
        // 创建输入键
        this.keys = {
            left: this.scene.input.keyboard.addKey(InputKeys.LEFT),
            right: this.scene.input.keyboard.addKey(InputKeys.RIGHT),
            up: this.scene.input.keyboard.addKey(InputKeys.UP),
            down: this.scene.input.keyboard.addKey(InputKeys.DOWN),
            jump: this.scene.input.keyboard.addKey(InputKeys.JUMP),
            attack: this.scene.input.keyboard.addKey(InputKeys.ATTACK),
            defense: this.scene.input.keyboard.addKey(InputKeys.DEFENSE),
            run: this.scene.input.keyboard.addKey(InputKeys.RUN)
        };
    }
    
    setupAnimationEvents() {
        // 攻击动画事件
        this.animationManager.addAnimationEvent(this, 'attack_1hit', 3, () => {
            this.comboWindow = true;
            this.triggerAttackHitbox();
        });
        
        this.animationManager.addAnimationEvent(this, 'attack_1hit', 6, () => {
            this.comboWindow = false;
        });
        
        // 连击动画事件
        this.animationManager.addAnimationEvent(this, 'combo_attack', 1, () => {
            this.triggerComboHitbox();
        });
        
        // 死亡动画完成
        this.animationManager.onAnimationComplete(this, 'death', () => {
            this.onDeathComplete();
        });
        
        // 着陆动画完成
        this.animationManager.onAnimationComplete(this, 'landing', () => {
            this.states.isJumping = false;
        });
    }
    
    update(time, delta) {
        if (this.states.isDead) {
            return;
        }
        
        // 处理输入
        this.handleInput(delta);
        
        // 更新动画
        this.updateAnimation();
        
        // 更新精力
        this.updateSP(delta);
        
        // 检查墙壁
        this.checkWallSlide();
    }
    
    handleInput(delta) {
        // 如果被眩晕或正在防御，限制移动
        if (this.states.isStunned) {
            this.body.setVelocityX(0);
            return;
        }
        
        // 防御状态
        if (this.keys.defense.isDown && this.currentSP > 0) {
            this.defend();
            return;
        } else {
            this.states.isDefending = false;
        }
        
        // 移动输入
        let velocityX = 0;
        const moveSpeed = this.states.isDefending ? 75 : 
                         (this.states.isRunning ? GameConfig.RUN_SPEED : GameConfig.WALK_SPEED);
        
        if (this.keys.left.isDown) {
            velocityX = -moveSpeed;
            this.states.facingRight = false;
            this.setFlipX(true);
        } else if (this.keys.right.isDown) {
            velocityX = moveSpeed;
            this.states.facingRight = true;
            this.setFlipX(false);
        }
        
        // 奔跑状态
        this.states.isRunning = this.keys.run.isDown && velocityX !== 0 && this.currentSP > 0;
        
        // 设置水平速度
        this.body.setVelocityX(velocityX);
        
        // 跳跃
        if (this.keys.jump.isDown && this.keys.jump.getDuration() < 100) {
            this.jump();
        }
        
        // 攻击
        if (this.keys.attack.isDown && this.keys.attack.getDuration() < 100) {
            this.attack();
        }
        
        // 墙跳
        if (this.states.isOnWall && this.keys.jump.isDown && this.keys.jump.getDuration() < 100) {
            this.wallJump();
        }
    }
    
    updateAnimation() {
        // 死亡状态
        if (this.states.isDead) {
            this.animationManager.playAnimation(this, 'death');
            return;
        }
        
        // 受击状态 - 只在刚受击时播放，不阻止后续动画更新
        if (this.states.isStunned && !this.animationManager.isAnimationPlaying(this, 'be_attacked')) {
            this.animationManager.playAnimation(this, 'be_attacked');
            // 不要return，让后续动画可以替换
        }
        
        // 防御状态
        if (this.states.isDefending) {
            this.animationManager.playAnimation(this, 'shield_defense', true);
            return;
        }
        
        // 攻击动画
        if (this.states.isAttacking) {
            return; // 攻击动画由攻击函数控制
        }
        
        const isOnGround = this.body.blocked.down || this.body.touching.down;
        
        // 空中动画
        if (!isOnGround) {
            if (this.body.velocity.y < 0) {
                this.animationManager.playAnimation(this, 'flying_up', true);
            } else {
                this.animationManager.playAnimation(this, 'falling', true);
            }
            return;
        }
        
        // 地面动画
        // 使用实际的输入状态而不是速度，避免物理惯性导致的延迟
        const isMoving = this.keys.left.isDown || this.keys.right.isDown;
        
        if (isMoving) {
            this.animationManager.playAnimation(this, 'run', true);
        } else {
            // idle动画不应该设置ignoreIfPlaying，否则无法从run切换到idle
            this.animationManager.playAnimation(this, 'idle', false);
        }
    }
    
    jump() {
        const isOnGround = this.body.blocked.down || this.body.touching.down;
        
        if (isOnGround && this.currentSP >= GameConfig.SP_COST_JUMP) {
            // 播放跳跃准备动画
            this.animationManager.playAnimation(this, 'jump_prepare');
            
            // 设置跳跃速度
            this.body.setVelocityY(-Math.sqrt(2 * GameConfig.GRAVITY * GameConfig.JUMP_HEIGHT));
            
            // 消耗精力
            this.consumeSP(GameConfig.SP_COST_JUMP);
            
            this.states.isJumping = true;
        }
    }
    
    wallJump() {
        if (this.currentSP >= GameConfig.SP_COST_JUMP) {
            // 向反方向弹跳
            const jumpDirection = this.states.facingRight ? -1 : 1;
            this.body.setVelocityX(jumpDirection * 200);
            this.body.setVelocityY(-Math.sqrt(2 * GameConfig.GRAVITY * GameConfig.JUMP_HEIGHT * 0.8));
            
            // 消耗精力
            this.consumeSP(GameConfig.SP_COST_JUMP);
            
            this.states.isOnWall = false;
            this.states.isJumping = true;
        }
    }
    
    attack() {
        if (this.states.isAttacking || this.states.isDefending || this.currentSP < GameConfig.SP_COST_ATTACK) {
            return;
        }
        
        // 检查是否在连击窗口
        if (this.comboWindow && this.currentSP >= GameConfig.SP_COST_COMBO) {
            // 执行连击
            this.states.isAttacking = true;
            this.animationManager.playAnimation(this, 'combo_attack');
            this.consumeSP(GameConfig.SP_COST_COMBO);
            
            // 连击完成后重置
            this.scene.time.delayedCall(500, () => {
                this.states.isAttacking = false;
                this.comboWindow = false;
            });
        } else {
            // 执行普通攻击
            this.states.isAttacking = true;
            this.animationManager.playAnimation(this, 'attack_1hit');
            this.consumeSP(GameConfig.SP_COST_ATTACK);
            
            // 攻击完成后重置
            this.scene.time.delayedCall(600, () => {
                this.states.isAttacking = false;
            });
        }
    }
    
    defend() {
        if (this.currentSP > 0 && !this.states.isAttacking) {
            this.states.isDefending = true;
            this.body.setVelocityX(this.body.velocity.x * 0.5); // 减速
        }
    }
    
    triggerAttackHitbox() {
        // 创建攻击判定区域
        const attackRange = this.states.facingRight ? 60 : -60;
        const hitboxX = this.x + attackRange;
        const hitboxY = this.y;
        
        // 触发攻击事件（由游戏场景处理）
        this.scene.events.emit('playerAttack', {
            x: hitboxX,
            y: hitboxY,
            width: 60,
            height: 40,
            damage: this.attackPower
        });
    }
    
    triggerComboHitbox() {
        // 创建连击判定区域
        const attackRange = this.states.facingRight ? 70 : -70;
        const hitboxX = this.x + attackRange;
        const hitboxY = this.y;
        
        // 触发连击事件
        this.scene.events.emit('playerAttack', {
            x: hitboxX,
            y: hitboxY,
            width: 70,
            height: 45,
            damage: this.comboAttackPower
        });
    }
    
    takeDamage(damage) {
        if (this.states.isInvincible || this.states.isDead) {
            return;
        }
        
        // 计算实际伤害
        let actualDamage = damage;
        if (this.states.isDefending) {
            actualDamage = Math.floor(damage * GameConfig.DEFENSE_REDUCTION);
        }
        
        // 扣血
        this.currentHP = Math.max(0, this.currentHP - actualDamage);
        
        // 更新全局数据
        if (window.gameData) {
            window.gameData.playerHP = this.currentHP;
        }
        
        // 检查死亡
        if (this.currentHP <= 0) {
            this.die();
            return;
        }
        
        // 受击效果
        this.onHit();
    }
    
    onHit() {
        // 受击硬直
        this.states.isStunned = true;
        this.states.isAttacking = false;
        
        // 击退
        const knockbackDirection = this.states.facingRight ? -1 : 1;
        this.body.setVelocityX(knockbackDirection * GameConfig.KNOCKBACK_DISTANCE);
        
        // 闪烁效果
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.clearTint();
        });
        
        // 无敌时间
        this.states.isInvincible = true;
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 1, to: 0.3 },
            ease: 'Linear',
            duration: 100,
            repeat: 5,
            yoyo: true,
            onComplete: () => {
                this.alpha = 1;
                this.states.isInvincible = false;
            }
        });
        
        // 硬直恢复
        this.scene.time.delayedCall(GameConfig.HIT_STUN_TIME, () => {
            this.states.isStunned = false;
        });
    }
    
    heal(amount) {
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
        
        // 更新全局数据
        if (window.gameData) {
            window.gameData.playerHP = this.currentHP;
        }
        
        // 治疗特效
        this.scene.tweens.add({
            targets: this,
            tint: { from: 0xffffff, to: 0x00ff00 },
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.clearTint();
            }
        });
    }
    
    consumeSP(amount) {
        this.currentSP = Math.max(0, this.currentSP - amount);
        
        // 更新全局数据
        if (window.gameData) {
            window.gameData.playerSP = this.currentSP;
        }
    }
    
    recoverSP(amount) {
        this.currentSP = Math.min(this.maxSP, this.currentSP + amount);
        
        // 更新全局数据
        if (window.gameData) {
            window.gameData.playerSP = this.currentSP;
        }
    }
    
    updateSP(delta) {
        const deltaSeconds = delta / 1000;
        
        // 奔跑消耗
        if (this.states.isRunning) {
            this.consumeSP(GameConfig.SP_COST_RUN * deltaSeconds);
            if (this.currentSP <= 0) {
                this.states.isRunning = false;
            }
        }
        
        // 防御消耗
        if (this.states.isDefending) {
            this.consumeSP(GameConfig.SP_COST_DEFENSE * deltaSeconds);
            if (this.currentSP <= 0) {
                this.states.isDefending = false;
            }
        }
    }
    
    startSPRecovery() {
        // 每秒恢复精力
        this.timers.spRecoveryTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                if (!this.states.isRunning && !this.states.isDefending && !this.states.isAttacking) {
                    const speed = Math.abs(this.body.velocity.x);
                    const recoveryRate = speed > 10 ? 
                        GameConfig.SP_RECOVER_WALK : GameConfig.SP_RECOVER_IDLE;
                    
                    this.recoverSP(recoveryRate / 10); // 除以10因为每100ms执行一次
                }
            },
            loop: true
        });
    }
    
    checkWallSlide() {
        // 检查是否贴墙
        const touchingWall = (this.body.blocked.left || this.body.blocked.right) && 
                            !this.body.blocked.down;
        
        if (touchingWall && this.keys.up.isDown && this.body.velocity.y > 0) {
            this.states.isOnWall = true;
            this.body.setVelocityY(Math.min(this.body.velocity.y, 50)); // 减缓下落速度
            this.animationManager.playAnimation(this, 'wall_slide_loop', true);
        } else {
            this.states.isOnWall = false;
        }
    }
    
    die() {
        this.states.isDead = true;
        this.states.isAttacking = false;
        this.states.isDefending = false;
        this.body.setVelocity(0, 0);
        this.body.enable = false;
        
        // 更新死亡次数
        if (window.gameData) {
            window.gameData.deathCount++;
        }
        
        // 播放死亡动画
        this.animationManager.playAnimation(this, 'death');
    }
    
    onDeathComplete() {
        // 触发死亡事件
        this.scene.events.emit('playerDeath');
    }
    
    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.currentHP = this.maxHP;
        this.currentSP = this.maxSP;
        this.states.isDead = false;
        this.states.isInvincible = false;
        this.states.isStunned = false;
        this.body.enable = true;
        this.clearTint();
        this.alpha = 1;
        
        // 重置动画
        this.animationManager.playAnimation(this, 'idle');
    }
    
    destroy() {
        // 清理计时器
        if (this.timers.spRecoveryTimer) {
            this.timers.spRecoveryTimer.destroy();
        }
        
        super.destroy();
    }
}