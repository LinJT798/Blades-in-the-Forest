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
        this.body.setSize(23, 33);
        this.body.setOffset(16, 22);
        
        // 墙壁检测缓存
        this.wallDetectionCache = {
            lastCheckTime: 0,
            lastX: 0,
            lastY: 0,
            result: false,
            checkInterval: 100  // 每100ms最多检测一次
        };
        
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
        
        // 播放初始idle动画
        this.animationManager.playAnimation(this, 'idle', true);
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
        // 如果被眩晕，限制移动
        if (this.states.isStunned) {
            this.body.setVelocityX(0);
            return;
        }
        
        // 防御状态
        if (this.keys.defense.isDown && this.currentSP > 0) {
            this.defend();
            // 防御状态下被击中时保持击退速度
            if (this.states.isInvincible) {
                return;
            }
            // 防御状态下限制移动
            this.body.setVelocityX(this.body.velocity.x * 0.9); // 逐渐减速
            return;
        } else {
            this.states.isDefending = false;
        }
        
        // 墙壁滑行状态特殊处理
        if (this.states.isOnWall) {
            // 贴墙时只处理跳跃输入
            if (this.keys.jump.isDown && this.keys.jump.getDuration() < 100) {
                this.wallJump();
            }
            // 贴墙时不处理水平移动，保持贴墙
            this.body.setVelocityX(0);
            return;
        }
        
        // 移动输入（只在非贴墙状态下处理）
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
    }
    
    updateAnimation() {
        // 死亡状态
        if (this.states.isDead) {
            this.animationManager.playAnimation(this, 'death');
            return;
        }
        
        // 防御状态（优先级高于受击）
        if (this.states.isDefending) {
            this.animationManager.playAnimation(this, 'shield_defense', true);
            return;
        }
        
        // 受击状态 - 只在非防御状态下播放受击动画
        if (this.states.isStunned && !this.animationManager.isAnimationPlaying(this, 'be_attacked')) {
            this.animationManager.playAnimation(this, 'be_attacked');
            // 不要return，让后续动画可以替换
        }
        
        // 攻击动画
        if (this.states.isAttacking) {
            return; // 攻击动画由攻击函数控制
        }
        
        const isOnGround = this.body.blocked.down || this.body.touching.down;
        
        // 空中动画
        if (!isOnGround) {
            // 如果正在贴墙滑行，动画由 checkWallSlide 控制
            if (this.states.isOnWall) {
                // 贴墙滑行动画已经在 checkWallSlide 中处理
                return;
            } else if (this.body.velocity.y < 0) {
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
            // idle动画应该循环播放
            this.animationManager.playAnimation(this, 'idle', true);
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
            // 检查方向键输入来决定跳跃方向
            let jumpX = 0;
            let jumpY = -Math.sqrt(2 * GameConfig.GRAVITY * GameConfig.JUMP_HEIGHT * 0.8);
            
            if (this.keys.left.isDown || this.keys.right.isDown) {
                // 有方向键：向对应方向跳
                if (this.keys.left.isDown) {
                    jumpX = -200;
                } else if (this.keys.right.isDown) {
                    jumpX = 200;
                }
            } else {
                // 没有方向键：直接向下掉落
                jumpY = 50; // 小的向下速度，让玩家脱离墙壁
                jumpX = this.states.wallSide === 'left' ? 10 : -10; // 轻微推离墙壁
            }
            
            this.body.setVelocityX(jumpX);
            this.body.setVelocityY(jumpY);
            
            // 消耗精力（向下掉落不消耗）
            if (this.keys.left.isDown || this.keys.right.isDown) {
                this.consumeSP(GameConfig.SP_COST_JUMP);
            }
            
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
            // 只在不是被击中状态时减速
            if (!this.states.isInvincible) {
                this.body.setVelocityX(this.body.velocity.x * 0.5); // 减速
            }
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
        const isDefending = this.states.isDefending;
        if (isDefending) {
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
        
        // 受击效果（防御状态特殊处理）
        if (isDefending) {
            this.onDefendHit();
        } else {
            this.onHit();
        }
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
    
    onDefendHit() {
        // 防御状态下被击中，保持防御动画，只有击退和闪烁
        
        // 轻微击退（防御时击退更小）
        const knockbackDirection = this.states.facingRight ? -1 : 1;
        this.body.setVelocityX(knockbackDirection * GameConfig.KNOCKBACK_DISTANCE * 0.3);
        
        // 闪烁效果（防御成功的蓝色闪烁，更明显）
        this.setTint(0x4444ff);
        this.scene.time.delayedCall(150, () => {
            this.clearTint();
        });
        
        // 短暂无敌时间
        this.states.isInvincible = true;
        this.scene.time.delayedCall(500, () => {
            this.states.isInvincible = false;
        });
        
        // 防御状态不设置硬直，玩家可以继续防御
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
        // 前置条件1：必须在空中
        const isInAir = !this.body.blocked.down && !this.body.touching.down;
        if (!isInAir) {
            // 在地面上，直接重置墙壁状态并返回
            this.states.isOnWall = false;
            this.wallDetectionCache.result = false;
            return;
        }
        
        // 前置条件2：必须正在下落
        const isFalling = this.body.velocity.y > 0;
        if (!isFalling) {
            // 还在上升阶段，不激活墙壁滑行
            this.states.isOnWall = false;
            return;
        }
        
        // 到这里说明：在空中 + 正在下落
        // 现在进行墙壁检测
        const touchingWall = this.detectWallAlignment();
        
        if (touchingWall) {
            // 激活墙壁滑行
            if (!this.states.isOnWall) {
                // 刚开始贴墙，播放开始动画
                this.states.isOnWall = true;
                this.animationManager.playAnimation(this, 'wall_slide_start', false);
            }
            
            // 减缓下落速度
            this.body.setVelocityY(Math.min(this.body.velocity.y, 50));
            
            // wall_slide_start 播放完后播放循环动画
            if (!this.animationManager.isAnimationPlaying(this, 'wall_slide_start')) {
                this.animationManager.playAnimation(this, 'wall_slide_loop', true);
            }
        } else {
            this.states.isOnWall = false;
        }
    }
    
    // 检测墙壁对齐（带缓存优化）
    detectWallAlignment() {
        const now = Date.now();
        const positionChanged = Math.abs(this.x - this.wallDetectionCache.lastX) > 5 ||
                               Math.abs(this.y - this.wallDetectionCache.lastY) > 5;
        
        // 如果位置没有显著变化且距离上次检测时间很短，使用缓存结果
        if (!positionChanged && now - this.wallDetectionCache.lastCheckTime < this.wallDetectionCache.checkInterval) {
            return this.wallDetectionCache.result;
        }
        
        // 获取地块层
        const tileLayer = this.scene.mapLoader?.getTileLayer();
        if (!tileLayer) {
            this.wallDetectionCache.result = false;
            return false;
        }
        
        // 计算需要至少90%的高度贴合
        const minTilesRequired = Math.ceil((this.body.height * 0.9) / 24); // 24是tile高度
        
        // 检测左边墙壁（玩家碰撞盒左边外侧1-2像素的位置）
        const leftTiles = tileLayer.getTilesWithinWorldXY(
            this.body.x - 2,      // 左边2像素
            this.body.y,          // 碰撞盒顶部
            2,                    // 检测宽度
            this.body.height,     // 碰撞盒高度
            { isColliding: true } // 只检测有碰撞的瓦片
        );
        
        // 检测右边墙壁
        const rightTiles = tileLayer.getTilesWithinWorldXY(
            this.body.right,      // 碰撞盒右边缘
            this.body.y,          
            2,                    
            this.body.height,
            { isColliding: true }
        );
        
        // 要求至少70%的高度有瓦片贴合
        const result = leftTiles.length >= minTilesRequired || rightTiles.length >= minTilesRequired;
        
        // 更新缓存
        this.wallDetectionCache.lastCheckTime = now;
        this.wallDetectionCache.lastX = this.x;
        this.wallDetectionCache.lastY = this.y;
        this.wallDetectionCache.result = result;
        
        // 如果检测到墙壁，记录是哪一边
        if (result) {
            if (leftTiles.length >= minTilesRequired) {
                this.states.wallSide = 'left';
            } else {
                this.states.wallSide = 'right';
            }
        }
        
        return result;
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