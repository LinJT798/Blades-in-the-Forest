class DeathBoss extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'death', GameConfig.DEATH_BOSS);
        
        this.name = 'death';
        
        // 设置碰撞盒
        this.body.setSize(30, 20);
        this.body.setOffset(25, 50);
        
        // BOSS特有属性
        this.phase = 1; // 当前阶段
        this.baseAttackInterval = GameConfig.DEATH_BOSS.ATTACK_INTERVAL;
        this.attackSpeedBonus = 0;
        
        // 不需要巡逻
        this.patrolRange = 0;
        
        // 传送技能相关
        this.teleportCooldown = 0; // 传送冷却时间
        this.teleportCooldownTime = GameConfig.DEATH_BOSS.TELEPORT_COOLDOWN;
        this.lastAttackTime = Date.now(); // 上次成功攻击的时间
        this.teleportDistance = GameConfig.DEATH_BOSS.TELEPORT_DISTANCE;
        this.noAttackThreshold = GameConfig.DEATH_BOSS.NO_ATTACK_THRESHOLD;
        this.isTeleporting = false; // 是否正在传送
        
        // 设置Boss不受重力影响（飞行状态）
        this.body.setAllowGravity(false);
        
        // Debug模式 - 攻击范围显示
        this.debugMode = false;
        this.debugGraphics = null;
        
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
        
        // 重置传送相关状态
        this.lastAttackTime = Date.now();
        this.teleportCooldown = 0;
        this.isTeleporting = false;
        
        // 淡入效果
        this.alpha = 0;
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // 检查是否还在活动状态
                if (this.active && this.scene) {
                    // 开始战斗
                    this.startBattle();
                }
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
        // 检查scene是否存在
        if (this.scene && this.scene.events) {
            // 触发BOSS战事件
            this.scene.events.emit('bossStarted');
        }
    }
    
    updateAI(time, delta) {
        if (!this.active || !this.visible || this.isTeleporting) {
            return;
        }
        
        // 如果被眩晕，停止AI
        if (this.isStunned) {
            return;
        }
        
        // 获取战斗系统
        const combatSystem = this.scene.combatSystem;
        if (!combatSystem) return;
        
        // 获取玩家
        const player = this.scene.player;
        if (!player || player.states.isDead) {
            // 玩家不存在或死亡时，Boss停止移动
            this.body.setVelocity(0, 0);
            return;
        }
        
        // 获取玩家距离
        const playerDistance = combatSystem.getPlayerDistance(this);
        
        // 如果玩家不在检测范围内，Boss保持静止（不巡逻）
        if (playerDistance > this.detectRadius) {
            this.body.setVelocity(0, 0);
            this.isChasing = false;
            return;
        }
        
        // 玩家在检测范围内，开始追击
        this.isChasing = true;
        
        // 更新传送冷却
        if (this.teleportCooldown > 0) {
            this.teleportCooldown -= delta;
        }
        
        // 使用Date.now()而不是time参数，因为time可能是场景时间
        const currentTime = Date.now();
        
        // 检查是否需要传送
        const shouldTeleport = this.checkTeleportCondition(playerDistance, currentTime);
        if (shouldTeleport && this.teleportCooldown <= 0) {
            this.teleportToPlayer();
            return;
        }
        
        // 攻击范围内
        if (playerDistance <= this.attackRadius) {
            // 停止移动
            this.body.setVelocity(0, 0);
            
            // Debug日志
            if (this.debugMode) {
                console.log(`Boss在攻击范围内 - 距离: ${playerDistance}, 攻击半径: ${this.attackRadius}, 当前时间: ${currentTime}, 上次攻击: ${this.lastAttackTime}, 冷却: ${this.attackInterval}`);
            }
            
            // 如果不在攻击状态，开始攻击
            if (!this.isAttacking) {
                this.attack(currentTime);
            }
        } else {
            // 只有不在攻击状态时才移动
            if (!this.isAttacking) {
                // 向玩家移动（包括垂直方向）
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // 计算归一化方向
                    const dirX = dx / distance;
                    const dirY = dy / distance;
                    
                    // 设置速度（可以飞行追击）
                    this.body.setVelocityX(dirX * GameConfig.DEATH_BOSS.MOVE_SPEED);
                    this.body.setVelocityY(dirY * GameConfig.DEATH_BOSS.MOVE_SPEED * 0.5); // Y轴速度稍慢
                }
            }
        }
        
        // 更新阶段
        this.updatePhase();
    }
    
    checkTeleportCondition(playerDistance, currentTime) {
        // 条件1：玩家距离太远
        if (playerDistance > this.teleportDistance) {
            return true;
        }
        
        // 条件2：超过8秒没有攻击到玩家
        const timeSinceLastAttack = currentTime - this.lastAttackTime;
        if (timeSinceLastAttack > this.noAttackThreshold) {
            return true;
        }
        
        return false;
    }
    
    teleportToPlayer() {
        if (!this.scene.player || this.scene.player.states.isDead) {
            return;
        }
        
        this.isTeleporting = true;
        const player = this.scene.player;
        
        // 停止移动
        this.body.setVelocity(0, 0);
        
        // 淡出效果
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // 计算传送位置（玩家附近随机位置）
                const side = Math.random() > 0.5 ? 1 : -1;
                const offsetX = side * Phaser.Math.Between(
                    GameConfig.DEATH_BOSS.TELEPORT_OFFSET_MIN, 
                    GameConfig.DEATH_BOSS.TELEPORT_OFFSET_MAX
                );
                const offsetY = Phaser.Math.Between(-20, 20);
                
                // 传送到新位置
                this.x = player.x + offsetX;
                this.y = player.y + offsetY;
                
                // 淡入效果
                this.scene.tweens.add({
                    targets: this,
                    alpha: 1,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        this.isTeleporting = false;
                        // 设置冷却时间
                        this.teleportCooldown = this.teleportCooldownTime;
                        
                        // 重置攻击冷却，让传送后能立即攻击
                        this.lastAttackTime = 0;
                        
                        // 传送后立即攻击
                        this.attack(Date.now());
                    }
                });
                
                // 传送特效
                this.createTeleportEffect(this.x, this.y);
            }
        });
        
        // 不再显示文字提示，只有视觉特效
    }
    
    createTeleportEffect(x, y) {
        // 创建传送特效（紫色粒子）
        for (let i = 0; i < 12; i++) {
            const particle = this.scene.add.circle(
                x + Phaser.Math.Between(-30, 30),
                y + Phaser.Math.Between(-30, 30),
                4,
                0x8b00ff
            );
            particle.setDepth(this.depth + 1);
            
            this.scene.tweens.add({
                targets: particle,
                alpha: 0,
                scale: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
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
        // 检查scene是否存在
        if (!this.scene) return;
        
        // 阶段变化特效
        this.scene.tweens.add({
            targets: this,
            tint: { from: 0xffffff, to: 0xff0000 },
            duration: 500,
            yoyo: true,
            onComplete: () => {
                if (this.active) {
                    this.clearTint();
                }
            }
        });
        
        // 触发阶段变化事件
        if (this.scene.events) {
            this.scene.events.emit('bossPhaseChange', this.phase);
        }
    }
    
    attack(currentTime) {
        // 检查攻击冷却
        const timeSinceLastAttack = currentTime - this.lastAttackTime;
        if (timeSinceLastAttack < this.attackInterval) {
            if (this.debugMode) {
                const cooldownLeft = this.attackInterval - timeSinceLastAttack;
                console.log(`Boss攻击冷却中 - 剩余时间: ${Math.floor(cooldownLeft)}ms`);
            }
            return;
        }
        
        // Debug日志
        if (this.debugMode) {
            console.log(`Boss开始攻击！时间: ${currentTime}, 距离上次攻击: ${timeSinceLastAttack}ms`);
        }
        
        // 设置攻击状态
        this.isAttacking = true;
        this.lastAttackTime = currentTime;
        
        // 停止当前动画并强制播放攻击动画
        this.anims.stop();
        this.play('death_fight');
        
        // Debug日志
        if (this.debugMode) {
            console.log(`播放攻击动画: death_fight`);
        }
        
        // 延迟触发攻击判定
        this.scene.time.delayedCall(this.getAttackFrame() * 100, () => {
            if (!this.isDead) {
                this.triggerAttack();
            }
        });
        
        // 攻击动画持续时间后重置状态
        this.scene.time.delayedCall(800, () => {
            this.isAttacking = false;
            // 恢复idle动画
            if (!this.isDead) {
                this.play('death_idle', true);
            }
        });
    }
    
    getAttackFrame() {
        // 死神在第3-5帧触发攻击
        return 3;
    }
    
    triggerAttack() {
        // BOSS范围攻击
        const attackRange = this.attackRadius;
        
        // 检查玩家是否在攻击范围内
        const player = this.scene.player;
        if (player && !player.states.isDead) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 如果玩家在攻击范围内，更新最后攻击时间
            if (distance <= attackRange) {
                this.lastAttackTime = Date.now();
            }
        }
        
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
        // 停止传送
        this.isTeleporting = false;
        
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
                // 检查scene是否还存在
                if (this.scene && this.scene.events) {
                    // 触发胜利事件
                    this.scene.events.emit('bossDefeated');
                }
                if (this.active) {
                    this.destroy();
                }
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
    
    // 启用/禁用Debug模式
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        if (enabled && !this.debugGraphics) {
            // 创建debug图形
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(1000); // 确保在最上层
        } else if (!enabled && this.debugGraphics) {
            // 清除debug图形
            this.debugGraphics.clear();
            this.debugGraphics.destroy();
            this.debugGraphics = null;
        }
    }
    
    // 更新Debug显示
    updateDebugDisplay() {
        if (!this.debugMode || !this.debugGraphics || !this.active || !this.visible) {
            return;
        }
        
        // 清除之前的绘制
        this.debugGraphics.clear();
        
        // 绘制攻击范围（红色圆圈）
        this.debugGraphics.lineStyle(2, 0xff0000, 0.5);
        this.debugGraphics.strokeCircle(this.x, this.y, this.attackRadius);
        
        // 绘制攻击判定区域（黄色矩形）
        this.debugGraphics.lineStyle(2, 0xffff00, 0.3);
        this.debugGraphics.fillStyle(0xffff00, 0.1);
        this.debugGraphics.fillRect(
            this.x - this.attackRadius,
            this.y - 30,
            this.attackRadius * 2,
            60
        );
        this.debugGraphics.strokeRect(
            this.x - this.attackRadius,
            this.y - 30,
            this.attackRadius * 2,
            60
        );
        
        // 绘制传送触发范围（紫色圆圈）
        this.debugGraphics.lineStyle(1, 0x8b00ff, 0.3);
        this.debugGraphics.strokeCircle(this.x, this.y, this.teleportDistance);
        
        // 显示状态信息
        const statusText = `HP: ${this.currentHP}/${this.maxHP}\n` +
                          `Phase: ${this.phase}\n` +
                          `TP CD: ${Math.max(0, Math.floor(this.teleportCooldown / 1000))}s`;
        
        // 创建或更新状态文本
        if (!this.debugText) {
            this.debugText = this.scene.add.text(this.x, this.y - 80, statusText, {
                fontSize: '12px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setDepth(1001);
        } else {
            this.debugText.x = this.x;
            this.debugText.y = this.y - 80;
            this.debugText.setText(statusText);
        }
    }
    
    update(time, delta) {
        // DeathBoss重写update，不调用父类的巡逻逻辑
        if (this.isDead) {
            return;
        }
        
        // 检查是否在视野内
        if (!this.isInView()) {
            this.body.setVelocity(0, 0);
            return;
        }
        
        // 执行Boss的AI行为
        this.updateAI(time, delta);
        
        // 更新动画
        this.updateAnimation();
        
        // 更新朝向
        this.updateDirection();
        
        // 更新阶段（已在updateAI中调用）
        
        // 更新Debug显示
        this.updateDebugDisplay();
    }
    
    destroy() {
        // 清理Debug资源
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }
        if (this.debugText) {
            this.debugText.destroy();
        }
        
        super.destroy();
    }
}