class DeathBoss extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'death', GameConfig.DEATH_BOSS);
        
        this.name = 'death';
        
        // 设置碰撞盒
        this.body.setSize(30, 20);
        this.body.setOffset(25, 50);
        
        // BOSS特有属性
        this.phase = 1; // 当前阶段（改为3阶段系统）
        this.baseAttackInterval = GameConfig.DEATH_BOSS.ATTACK_INTERVAL;
        this.attackSpeedBonus = 0;
        this.isPhaseTransitioning = false; // 是否正在阶段转换
        this.phaseWaves = []; // 存储光波对象
        this.initialPosition = { x: x, y: y }; // 记录初始位置
        
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
        
        // 重要：立即停止任何初始速度，防止Boss缓慢飘移
        this.body.setVelocity(0, 0);
        
        // 重置所有状态标志，确保AI能正常运行
        this.isDead = false;
        this.isStunned = false;
        this.isChasing = false;
        this.isAttacking = false;
        
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
            
            // 立即开始追击和攻击
            this.isChasing = true;
            
            // 如果玩家在攻击范围内，立即发起第一次攻击
            const combatSystem = this.scene.combatSystem;
            if (combatSystem) {
                const playerDistance = combatSystem.getPlayerDistance(this);
                if (playerDistance <= this.attackRadius * 2) { // 稍大的范围，确保能攻击到
                    this.scene.time.delayedCall(500, () => {
                        if (this.active && !this.isDead) {
                            this.attack(Date.now());
                        }
                    });
                }
            }
        }
    }
    
    updateAI(time, delta) {
        if (!this.active || !this.visible || this.isTeleporting) {
            return;
        }
        
        // 如果被眩晕或阶段转换中，停止AI
        if (this.isStunned || this.isPhaseTransitioning) {
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
        
        // Boss始终追击玩家，不管距离多远（Boss战场景限定）
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
        // 阶段转换中不检查
        if (this.isPhaseTransitioning) {
            return;
        }
        
        const hpPercent = this.currentHP / this.maxHP;
        
        // 改为3阶段系统
        if (hpPercent <= 0.66 && this.phase === 1) {
            // 进入第二阶段
            this.startPhaseTransition(2);
        } else if (hpPercent <= 0.33 && this.phase === 2) {
            // 进入第三阶段
            this.startPhaseTransition(3);
        }
    }
    
    startPhaseTransition(newPhase) {
        this.isPhaseTransitioning = true;
        const config = GameConfig.DEATH_BOSS.PHASE_TRANSITION;
        
        // 停止当前所有行动
        this.isStunned = true;
        this.isAttacking = false;
        this.body.setVelocity(0, 0);
        
        // 第一步：先传送回初始位置
        this.teleportToSpawn();
        
        // 第二步：传送后开始虚化
        this.scene.time.delayedCall(200, () => {
            // 虚化效果
            this.scene.tweens.add({
                targets: this,
                alpha: 0.3,
                duration: config.FADE_DURATION,
                ease: 'Power2',
                onComplete: () => {
                    // 第三步：虚化完成后等待
                    this.scene.time.delayedCall(config.WAIT_BEFORE_WAVES, () => {
                        // 第四步：发射多波光波（保持虚化状态）
                        this.launchMultipleWaves(newPhase);
                    });
                }
            });
        });
    }
    
    teleportToSpawn() {
        // 播放传送离开特效（当前位置）
        const departEffect = this.scene.add.sprite(this.x, this.y, 'death');
        departEffect.setDepth(this.depth + 1);
        departEffect.setAlpha(0.8);
        departEffect.setTint(0x9400d3);
        departEffect.setScale(1.2);
        
        this.scene.tweens.add({
            targets: departEffect,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                departEffect.destroy();
            }
        });
        
        // 瞬移到初始位置
        this.x = this.initialPosition.x;
        this.y = this.initialPosition.y;
        
        // 播放传送到达特效（目标位置）
        const arriveEffect = this.scene.add.sprite(this.x, this.y, 'death');
        arriveEffect.setDepth(this.depth + 1);
        arriveEffect.setAlpha(0);
        arriveEffect.setTint(0x9400d3);
        arriveEffect.setScale(0);
        
        this.scene.tweens.add({
            targets: arriveEffect,
            scale: 2,
            alpha: { from: 0.8, to: 0 },
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                arriveEffect.destroy();
            }
        });
    }
    
    launchMultipleWaves(newPhase) {
        const config = GameConfig.DEATH_BOSS.PHASE_TRANSITION;
        let waveCount = 0;
        
        // 确保在整个光波发射过程中保持虚化和无敌状态
        this.isPhaseTransitioning = true;
        this.isStunned = true;
        
        // 发射多波光波
        const waveTimer = this.scene.time.addEvent({
            delay: config.WAVE_INTERVAL,
            callback: () => {
                this.launchWaveAttack(waveCount);
                waveCount++;
                
                // 最后一波后等待一段时间再恢复
                if (waveCount >= config.WAVE_COUNT) {
                    waveTimer.destroy();
                    this.scene.time.delayedCall(config.RECOVERY_DELAY, () => {
                        // 这时才开始恢复到正常状态
                        this.completePhaseTransition(newPhase);
                    });
                }
            },
            repeat: config.WAVE_COUNT - 1
        });
        
        // 立即发射第一波
        this.launchWaveAttack(0);
        waveCount++;
    }
    
    launchWaveAttack(waveIndex) {
        const config = GameConfig.DEATH_BOSS.PHASE_TRANSITION;
        const waveCount = config.WAVES_PER_BURST;
        const waveSpeed = config.WAVE_SPEED;
        const waveDamage = config.WAVE_DAMAGE;
        
        // 根据波次调整起始角度，让每波光波错开
        const angleOffset = (Math.PI / waveCount) * waveIndex * 0.5;
        
        for (let i = 0; i < waveCount; i++) {
            const angle = (Math.PI * 2 / waveCount) * i + angleOffset;
            
            // 创建光波精灵
            const wave = this.scene.physics.add.sprite(
                this.x,
                this.y,
                'death_fire'
            );
            
            // 设置光波属性
            wave.setScale(config.WAVE_SCALE);
            wave.setDepth(this.depth - 1);
            
            // 调整光波朝向（原动画面向右，需要旋转到对应角度）
            wave.rotation = angle;
            wave.damage = waveDamage;
            
            // 播放光波动画
            if (!this.scene.anims.exists('wave_fire')) {
                this.scene.anims.create({
                    key: 'wave_fire',
                    frames: this.scene.anims.generateFrameNumbers('death_fire', { start: 0, end: 2 }),
                    frameRate: 10,
                    repeat: -1
                });
            }
            wave.play('wave_fire');
            
            // 设置速度
            const velocityX = Math.cos(angle) * waveSpeed;
            const velocityY = Math.sin(angle) * waveSpeed;
            wave.body.setVelocity(velocityX, velocityY);
            wave.body.setAllowGravity(false);
            wave.body.setSize(16, 20); // 调整碰撞盒
            
            // 添加发光效果
            wave.setTint(0x9400ff);
            wave.setBlendMode(Phaser.BlendModes.ADD);
            
            // 添加到光波数组
            this.phaseWaves.push(wave);
            
            // 设置碰撞检测
            this.setupWaveCollision(wave);
            
            // 设定时间后销毁光波
            this.scene.time.delayedCall(config.WAVE_LIFETIME, () => {
                if (wave && wave.active) {
                    // 淡出效果
                    this.scene.tweens.add({
                        targets: wave,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            wave.destroy();
                            const index = this.phaseWaves.indexOf(wave);
                            if (index > -1) {
                                this.phaseWaves.splice(index, 1);
                            }
                        }
                    });
                }
            });
        }
        
        // 播放音效或特效（可选）
        this.createWaveEffect();
    }
    
    createWaveEffect() {
        // 创建扩散光环效果
        const ring = this.scene.add.circle(this.x, this.y, 20, 0x9400ff, 0.3);
        ring.setDepth(this.depth - 2);
        
        this.scene.tweens.add({
            targets: ring,
            scale: 4,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                ring.destroy();
            }
        });
    }
    
    setupWaveCollision(wave) {
        // 检测与玩家的碰撞
        if (this.scene.player) {
            this.scene.physics.add.overlap(
                wave,
                this.scene.player,
                (wave, player) => {
                    // 避免重复伤害
                    if (!wave.hasHitPlayer && !player.states.isInvincible) {
                        wave.hasHitPlayer = true;
                        
                        // 造成伤害
                        this.scene.combatSystem.dealDamage(
                            player,
                            wave.damage,
                            'wave'
                        );
                        
                        // 击退效果
                        const knockbackX = player.x > wave.x ? 100 : -100;
                        player.body.setVelocityX(knockbackX);
                        
                        // 销毁光波
                        wave.destroy();
                        const index = this.phaseWaves.indexOf(wave);
                        if (index > -1) {
                            this.phaseWaves.splice(index, 1);
                        }
                    }
                }
            );
        }
    }
    
    completePhaseTransition(newPhase) {
        const config = GameConfig.DEATH_BOSS.PHASE_TRANSITION;
        
        // 设置新阶段
        this.phase = newPhase;
        
        // 根据阶段调整属性
        if (newPhase === 2) {
            this.attackSpeedBonus = 0.15; // 攻击速度提升15%
            this.teleportCooldownTime *= 0.8; // 传送CD减少20%
        } else if (newPhase === 3) {
            this.attackSpeedBonus = 0.3; // 攻击速度提升30%
            this.teleportCooldownTime *= 0.6; // 传送CD减少40%
        }
        
        // 更新攻击间隔
        this.attackInterval = this.baseAttackInterval * (1 - this.attackSpeedBonus);
        
        // 恢复实体状态（从虚化恢复到正常）
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: config.FADE_DURATION,
            ease: 'Power2',
            onComplete: () => {
                // 完全恢复后才解除无敌和眩晕状态
                this.isStunned = false;
                this.isPhaseTransitioning = false;
                
                // 只播放恢复特效，不显示文字
                this.createRecoveryEffect();
            }
        });
    }
    
    createRecoveryEffect() {
        // 创建恢复时的能量爆发效果
        const burst = this.scene.add.circle(this.x, this.y, 10, 0x9400ff, 0.8);
        burst.setDepth(this.depth + 1);
        
        this.scene.tweens.add({
            targets: burst,
            scale: 5,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                burst.destroy();
            }
        });
        
        // 创建向内收缩的粒子效果
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const distance = 60;
            
            const particle = this.scene.add.circle(
                this.x + Math.cos(angle) * distance,
                this.y + Math.sin(angle) * distance,
                3,
                0x9400ff,
                0.8
            );
            particle.setDepth(this.depth);
            
            this.scene.tweens.add({
                targets: particle,
                x: this.x,
                y: this.y,
                scale: 0,
                alpha: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    showPhaseAnnouncement(phase) {
        // 创建阶段提示效果
        const phaseText = this.scene.add.text(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY - 50,
            `第 ${phase} 阶段`,
            {
                fontSize: '32px',
                color: '#ff00ff',
                stroke: '#000000',
                strokeThickness: 6,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setDepth(200).setScrollFactor(0);
        
        // 添加动画效果
        phaseText.setScale(0);
        this.scene.tweens.add({
            targets: phaseText,
            scale: 1.2,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: phaseText,
                    scale: 1,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => {
                        // 保持1秒后淡出
                        this.scene.time.delayedCall(1000, () => {
                            this.scene.tweens.add({
                                targets: phaseText,
                                alpha: 0,
                                y: phaseText.y - 30,
                                duration: 500,
                                ease: 'Power2',
                                onComplete: () => {
                                    phaseText.destroy();
                                }
                            });
                        });
                    }
                });
            }
        });
    }
    
    onPhaseChange() {
        // 此方法已被startPhaseTransition替代
        // 保留以兼容旧代码
        return;
    }
    
    takeDamage(damage) {
        // 阶段转换中无敌
        if (this.isPhaseTransitioning) {
            // 显示免疫提示
            const immuneText = this.scene.add.text(
                this.x,
                this.y - 60,
                '免疫',
                {
                    fontSize: '16px',
                    color: '#ffff00',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            ).setOrigin(0.5).setDepth(100);
            
            this.scene.tweens.add({
                targets: immuneText,
                y: immuneText.y - 20,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    immuneText.destroy();
                }
            });
            return;
        }
        super.takeDamage(damage);
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
        // 防止重复调用
        if (this.isDead) {
            return;
        }
        
        // 停止传送
        this.isTeleporting = false;
        
        // 立即触发胜利事件（不要等待动画）
        if (this.scene && this.scene.events) {
            console.log('Boss死亡，触发bossDefeated事件');
            this.scene.events.emit('bossDefeated');
        }
        
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
        // 清理光波
        this.phaseWaves.forEach(wave => {
            if (wave && wave.active) {
                wave.destroy();
            }
        });
        this.phaseWaves = [];
        
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