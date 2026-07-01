class CombatSystem {
    constructor(scene) {
        this.scene = scene;
        this.player = null;
        this.enemies = [];
        this.attackHitboxes = [];
        this.damageNumbers = [];
        this.impactTimers = [];
        this.hitStopActive = false;
    }
    
    initialize(player, enemies) {
        this.player = player;
        this.enemies = enemies;
        
        // 监听玩家攻击事件
        this.scene.events.on('playerAttack', this.handlePlayerAttack, this);
        
        // 监听敌人攻击事件
        this.scene.events.on('enemyAttack', this.handleEnemyAttack, this);
        
        // 监听玩家受击事件
        this.scene.events.on('playerDamaged', this.handlePlayerDamaged, this);
    }
    
    handlePlayerAttack(attackData) {
        // 创建攻击判定盒
        const hitbox = this.createHitbox(
            attackData.x,
            attackData.y,
            attackData.width,
            attackData.height
        );
        
        const hitRecords = [];
        
        // 检测与敌人的碰撞
        this.enemies.forEach(enemy => {
            if (!enemy.isDead && this.checkCollision(hitbox, enemy)) {
                const knockbackDirection = this.player.x < enemy.x ? 1 : -1;
                const hitPoint = this.getHitPoint(hitbox, enemy, attackData);
                
                // 造成伤害
                const actualDamage = this.dealDamage(enemy, attackData.damage, 'player', {
                    heavy: attackData.hitKind === 'combo' || enemy.name === 'death',
                    hitKind: attackData.hitKind
                });
                
                // 应用生命偷取效果
                if (attackData.lifesteal && attackData.lifesteal > 0 && actualDamage > 0) {
                    const healAmount = Math.floor(actualDamage * attackData.lifesteal);
                    if (healAmount > 0 && this.player) {
                        this.player.heal(healAmount);
                        
                        // 显示吸血效果（绿色数字）
                        this.showDamageNumber(this.player.x, this.player.y - 30, `+${healAmount}`, '#00ff00');
                    }
                }
                
                if (actualDamage > 0) {
                    hitRecords.push({
                        target: enemy,
                        direction: knockbackDirection,
                        actualDamage,
                        hitX: hitPoint.x,
                        hitY: hitPoint.y,
                        wasKilled: enemy.isDead || enemy.currentHP <= 0
                    });
                }
            }
        });
        
        if (hitRecords.length > 0) {
            const impactProfile = this.getImpactProfile(attackData, hitRecords);
            this.playImpactFeedback(attackData, hitRecords, impactProfile);
        }
        
        // 销毁判定盒（Debug 模式下延长显示时间便于观察）
        const playerHitboxLifetime = (this.scene.physics && this.scene.physics.world && this.scene.physics.world.drawDebug) ? 250 : 100;
        this.scene.time.delayedCall(playerHitboxLifetime, () => {
            if (hitbox && hitbox.destroy) {
                hitbox.destroy();
            }
        });
    }
    
    handleEnemyAttack(attackData) {
        if (!this.player || this.player.states.isDead) {
            return;
        }
        
        // 创建攻击判定盒
        const hitbox = this.createHitbox(
            attackData.x,
            attackData.y,
            attackData.width,
            attackData.height
        );
        
        // 检测与玩家的碰撞
        if (this.checkCollision(hitbox, this.player)) {
            const sourceX = attackData.sourceX ?? attackData.x;
            const hitPoint = this.getHitPoint(hitbox, this.player, {
                facingRight: sourceX < this.player.x
            });
            
            // 对玩家造成伤害并获取实际伤害值
            this.player.takeDamage(attackData.damage, {
                source: attackData.source || 'enemy',
                sourceX,
                hitX: hitPoint.x,
                hitY: hitPoint.y,
                heavy: Boolean(attackData.heavy)
            });
        }
        
        // 销毁判定盒（Debug 模式下延长显示时间便于观察）
        const enemyHitboxLifetime = (this.scene.physics && this.scene.physics.world && this.scene.physics.world.drawDebug) ? 250 : 100;
        this.scene.time.delayedCall(enemyHitboxLifetime, () => {
            if (hitbox && hitbox.destroy) {
                hitbox.destroy();
            }
        });
    }
    
    handlePlayerDamaged(damageData) {
        const player = damageData.player || this.player;
        const actualDamage = damageData.actualDamage || 0;
        
        if (!player || actualDamage <= 0) {
            return;
        }
        
        const profile = this.getPlayerDamageProfile(damageData);
        
        this.triggerHitStop(profile.hitStop, [player]);
        
        if (this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(profile.shakeDuration, profile.shakeIntensity);
        }
        
        if (this.scene.uiManager) {
            this.scene.uiManager.updateHealthBar(player.currentHP, player.maxHP);
        }
        
        this.showDamageNumber(
            player.x + profile.numberOffsetX * (damageData.knockbackDirection || 1),
            player.y - 38,
            actualDamage,
            damageData.isDefending ? 0x8fd7ff : 0xff3b30,
            {
                fontSize: profile.fontSize,
                rise: profile.numberRise,
                duration: profile.numberDuration,
                strokeThickness: profile.strokeThickness,
                startScale: profile.numberStartScale
            }
        );
        
        this.squashTarget(player, profile);
        this.showPlayerDamageEffect(damageData, profile);
        this.showPlayerDamageScreenPulse(damageData, profile);
    }
    
    getPlayerDamageProfile(damageData) {
        if (damageData.isDefending) {
            return {
                hitStop: 30,
                shakeDuration: 45,
                shakeIntensity: 0.0025,
                squashX: 0.05,
                squashY: 0.04,
                sparkCount: 5,
                flashRadius: 14,
                slashLength: 24,
                fontSize: '18px',
                strokeThickness: 3,
                numberRise: 34,
                numberDuration: 720,
                numberOffsetX: 6,
                numberStartScale: 1.05,
                heavy: false
            };
        }
        
        if (damageData.heavy || damageData.isFatal) {
            return {
                hitStop: damageData.isFatal ? 105 : 78,
                shakeDuration: damageData.isFatal ? 130 : 95,
                shakeIntensity: damageData.isFatal ? 0.011 : 0.0075,
                squashX: 0.14,
                squashY: 0.11,
                sparkCount: 10,
                flashRadius: 21,
                slashLength: 46,
                fontSize: '28px',
                strokeThickness: 4,
                numberRise: 58,
                numberDuration: 980,
                numberOffsetX: 10,
                numberStartScale: 1.28,
                heavy: true
            };
        }
        
        return {
            hitStop: 48,
            shakeDuration: 62,
            shakeIntensity: 0.0045,
            squashX: 0.09,
            squashY: 0.07,
            sparkCount: 7,
            flashRadius: 16,
            slashLength: 34,
            fontSize: '22px',
            strokeThickness: 3,
            numberRise: 45,
            numberDuration: 860,
            numberOffsetX: 8,
            numberStartScale: 1.14,
            heavy: false
        };
    }
    
    showPlayerDamageEffect(damageData, profile) {
        const player = damageData.player || this.player;
        if (!player || !player.active) {
            return;
        }
        
        const direction = damageData.knockbackDirection || 1;
        const x = damageData.hitX ?? (player.x - direction * 14);
        const y = damageData.hitY ?? (player.y - 10);
        const isDefending = damageData.isDefending;
        const primaryColor = isDefending ? 0x8fd7ff : 0xff3b30;
        const secondaryColor = isDefending ? 0xffffff : 0xfff0b0;
        
        const flash = this.scene.add.circle(x, y, profile.flashRadius, secondaryColor, isDefending ? 0.72 : 0.86);
        flash.setDepth(95);
        this.scene.tweens.add({
            targets: flash,
            scaleX: profile.heavy ? 2.2 : 1.75,
            scaleY: profile.heavy ? 2.2 : 1.75,
            alpha: 0,
            duration: profile.heavy ? 145 : 105,
            ease: 'Expo.easeOut',
            onComplete: () => flash.destroy()
        });
        
        if (isDefending) {
            const guardRing = this.scene.add.circle(player.x - direction * 13, player.y - 10, 19, primaryColor, 0.12);
            guardRing.setStrokeStyle(2, primaryColor, 0.95);
            guardRing.setDepth(96);
            this.scene.tweens.add({
                targets: guardRing,
                scaleX: 1.45,
                scaleY: 1.45,
                alpha: 0,
                duration: 150,
                ease: 'Cubic.easeOut',
                onComplete: () => guardRing.destroy()
            });
        } else {
            const slash = this.scene.add.rectangle(
                x - direction * 3,
                y,
                profile.slashLength,
                profile.heavy ? 6 : 4,
                primaryColor,
                0.88
            );
            slash.setDepth(94);
            slash.setRotation(direction > 0 ? -0.18 : 0.18);
            this.scene.tweens.add({
                targets: slash,
                x: x + direction * 7,
                scaleX: 1.28,
                alpha: 0,
                duration: profile.heavy ? 135 : 100,
                ease: 'Cubic.easeOut',
                onComplete: () => slash.destroy()
            });
        }
        
        const sparks = this.scene.add.graphics();
        sparks.setDepth(97);
        sparks.setPosition(x, y);
        const baseAngle = direction > 0 ? 0 : Math.PI;
        
        for (let i = 0; i < profile.sparkCount; i++) {
            const angle = baseAngle + Phaser.Math.FloatBetween(-0.95, 0.95);
            const length = Phaser.Math.Between(
                profile.heavy ? 12 : 8,
                profile.heavy ? 30 : 20
            );
            const color = isDefending ?
                (i % 2 === 0 ? 0xffffff : primaryColor) :
                (i % 3 === 0 ? 0xffffff : (i % 3 === 1 ? 0xffb23d : primaryColor));
            
            sparks.lineStyle(profile.heavy ? 2 : 1, color, 1);
            sparks.beginPath();
            sparks.moveTo(0, 0);
            sparks.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            sparks.strokePath();
        }
        
        this.scene.tweens.add({
            targets: sparks,
            x: x + direction * 12,
            scaleX: 1.22,
            scaleY: 1.22,
            alpha: 0,
            duration: profile.heavy ? 170 : 120,
            ease: 'Quad.easeOut',
            onComplete: () => sparks.destroy()
        });
    }
    
    showPlayerDamageScreenPulse(damageData, profile) {
        if (!this.scene.cameras || !this.scene.cameras.main) {
            return;
        }
        
        const camera = this.scene.cameras.main;
        const color = damageData.isDefending ? 0x5fbfff : 0xff2d24;
        const alpha = damageData.isDefending ? 0.12 : (profile.heavy ? 0.2 : 0.14);
        const pulse = this.scene.add.rectangle(0, 0, camera.width, camera.height, color, alpha);
        pulse.setOrigin(0, 0);
        pulse.setScrollFactor(0);
        pulse.setDepth(180);
        
        if (pulse.setBlendMode && Phaser.BlendModes) {
            pulse.setBlendMode(Phaser.BlendModes.ADD);
        }
        
        this.scene.tweens.add({
            targets: pulse,
            alpha: 0,
            duration: profile.heavy ? 210 : 150,
            ease: 'Quad.easeOut',
            onComplete: () => pulse.destroy()
        });
    }
    
    createHitbox(x, y, width, height) {
        // 创建一个矩形作为攻击判定盒（默认透明）
        const hitbox = this.scene.add.rectangle(
            x, y, width, height, 0xff0000, 0
        );
        
        // 添加物理体
        this.scene.physics.add.existing(hitbox, true);
        
        // 调试模式下显示判定盒：设置填充透明度与描边，置顶层
        if (this.scene.physics && this.scene.physics.world && this.scene.physics.world.drawDebug) {
            if (typeof hitbox.setFillStyle === 'function') {
                hitbox.setFillStyle(0xff0000, 0.3);
                if (typeof hitbox.setStrokeStyle === 'function') {
                    hitbox.setStrokeStyle(1, 0xff0000, 0.8);
                }
                if (typeof hitbox.setDepth === 'function') {
                    hitbox.setDepth(1000);
                }
            } else {
                // 兜底：直接设置对象透明度（某些版本也能生效）
                hitbox.alpha = 0.3;
            }
        }
        
        this.attackHitboxes.push(hitbox);
        return hitbox;
    }
    
    checkCollision(hitbox, target) {
        // 获取判定盒和目标的边界
        const hitboxBounds = hitbox.getBounds();
        const targetBounds = target.getBounds();
        
        // 检测矩形碰撞
        return Phaser.Geom.Rectangle.Overlaps(hitboxBounds, targetBounds);
    }
    
    dealDamage(target, damage, source = 'unknown', feedback = {}) {
        if (!target || target.isDead) {
            return 0;
        }
        
        // 计算实际伤害
        let intendedDamage = damage;
        
        // 如果目标有防御状态，减少伤害
        if (target.isDefending) {
            intendedDamage = Math.floor(damage * 0.3);
        }
        
        const hpBefore = typeof target.currentHP === 'number' ? target.currentHP : null;
        const handledByTarget = target.takeDamage && typeof target.takeDamage === 'function';
        
        let targetReportedDamage = null;
        
        // 如果目标有takeDamage方法，使用它（这样会触发onHit）
        if (handledByTarget) {
            const damageContext = target.name === 'player' ? {
                source,
                sourceX: feedback.sourceX,
                hitX: feedback.hitX,
                hitY: feedback.hitY,
                heavy: Boolean(feedback.heavy || source === 'boss' || source === 'wave')
            } : feedback;
            const result = target.takeDamage(intendedDamage, damageContext);
            if (typeof result === 'number') {
                targetReportedDamage = result;
            }
        } else {
            // 否则直接扣血
            target.currentHP = Math.max(0, target.currentHP - intendedDamage);
        }
        
        const hpAfter = typeof target.currentHP === 'number' ? target.currentHP : hpBefore;
        const actualDamage = targetReportedDamage !== null ? targetReportedDamage : (hpBefore !== null && hpAfter !== null ?
            Math.max(0, hpBefore - hpAfter) :
            intendedDamage);
        
        if (actualDamage <= 0) {
            return 0;
        }
        
        // 播放受击音效（如果目标是敌人）
        if (source === 'player' && target.name !== 'player' && this.scene.audioManager) {
            const hitType = target.name === 'death' ? 'BOSS' : 'ENEMY';
            this.scene.audioManager.playHitSound(hitType, {
                heavy: feedback.heavy,
                rate: feedback.hitKind === 'combo' ? 0.95 : 1
            });
        }
        
        // 显示伤害数字；玩家受击数字由 playerDamaged 事件统一处理，避免重复
        if (target.name !== 'player') {
            this.showDamageNumber(
                target.x,
                target.y - 30,
                actualDamage,
                source === 'player' ? 0xffff00 : 0xff0000
            );
        }
        
        const targetIsDead = target.currentHP <= 0 || target.isDead;
        
        if (targetIsDead) {
            if (!target.isDead && target.die && typeof target.die === 'function') {
                target.die();
            }
            this.reportKill(target, source);
        } else if (!handledByTarget) {
            // 触发受击效果
            this.onTargetHit(target);
        }
        
        return actualDamage;
    }
    
    reportKill(target, source) {
        if (source !== 'player' || target.name === 'player' || target.__combatKillReported) {
            return;
        }
        
        target.__combatKillReported = true;
        
        if (window.gameData) {
            window.gameData.enemiesKilled++;
        }
        
        this.scene.events.emit('enemyKilled', {
            enemy: target,
            x: target.x,
            y: target.y
        });
        
        if (target.name === 'death' && window.gameData) {
            window.gameData.bossDefeated = true;
        }
    }
    
    onTargetHit(target) {
        // 受击闪烁
        target.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            target.clearTint();
        });
        
        // 不要在这里播放受击动画，让实体自己的updateAnimation处理
        // 这样可以避免动画冲突
        
        // 短暂无敌
        target.isInvincible = true;
        this.scene.time.delayedCall(300, () => {
            target.isInvincible = false;
        });
    }
    
    onTargetKilled(target, source) {
        target.isDead = true;
        
        // 如果是玩家击杀敌人
        if (source === 'player' && target.name !== 'player') {
            // 更新击杀数
            if (window.gameData) {
                window.gameData.enemiesKilled++;
            }
            
            // 触发掉落
            this.scene.events.emit('enemyKilled', {
                enemy: target,
                x: target.x,
                y: target.y
            });
            
            // Boss会在自己的die()方法中触发bossDefeated事件
            if (target.name === 'death') {
                if (window.gameData) {
                    window.gameData.bossDefeated = true;
                }
                // 不要重复触发事件
                // this.scene.events.emit('bossDefeated');
            }
        }
        
        // 播放死亡动画
        if (target.animationManager) {
            target.animationManager.playAnimation(target, 'death');
            
            // 死亡动画完成后移除（不销毁，保留重生能力）
            target.animationManager.onAnimationComplete(target, 'death', () => {
                this.removeEnemy(target);
                // 隐藏而不销毁
                target.setVisible(false);
                target.setActive(false);
                if (target.body) {
                    target.body.enable = false;
                }
            });
        } else {
            // 没有动画管理器也只是隐藏
            this.removeEnemy(target);
            target.setVisible(false);
            target.setActive(false);
            if (target.body) {
                target.body.enable = false;
            }
        }
    }
    
    applyKnockback(target, direction, forceOverride = null) {
        if (!target.body) return;
        
        // 对敌人使用轻微的击退力度（类似玩家防御时的击退）
        const isEnemy = target.name !== 'player';
        const knockbackForce = forceOverride !== null ?
            forceOverride * direction :
            (isEnemy ? 
                GameConfig.ENEMY_KNOCKBACK_FORCE * direction :
                GameConfig.KNOCKBACK_DISTANCE * direction);
        
        // 设置水平击退速度
        target.body.setVelocityX(knockbackForce);
        
        // 不再添加向上的速度，保持击退简单
        
        // 快速恢复速度（让击退短促有力）
        this.scene.time.delayedCall(150, () => {
            if (target && target.body && !target.isDead) {
                // 逐渐减速而不是突然停止
                target.body.setVelocityX(target.body.velocity.x * 0.5);
            }
        });
    }
    
    getImpactProfile(attackData, hitRecords) {
        const isCombo = attackData.hitKind === 'combo';
        const hitBoss = hitRecords.some(record => record.target.name === 'death');
        const killedTarget = hitRecords.some(record => record.wasKilled);
        
        if (killedTarget) {
            return {
                hitStop: hitBoss ? 130 : 115,
                shakeDuration: 110,
                shakeIntensity: hitBoss ? 0.011 : 0.008,
                knockbackForce: hitBoss ? 120 : 260,
                recoilForce: 38,
                sparkCount: 11,
                slashLength: 58,
                squashX: 0.18,
                squashY: 0.14,
                heavy: true
            };
        }
        
        if (isCombo) {
            return {
                hitStop: hitBoss ? 105 : 90,
                shakeDuration: 80,
                shakeIntensity: hitBoss ? 0.008 : 0.006,
                knockbackForce: hitBoss ? 95 : 220,
                recoilForce: 34,
                sparkCount: 9,
                slashLength: 52,
                squashX: 0.16,
                squashY: 0.12,
                heavy: true
            };
        }
        
        return {
            hitStop: hitBoss ? 75 : 60,
            shakeDuration: 55,
            shakeIntensity: hitBoss ? 0.005 : 0.0035,
            knockbackForce: hitBoss ? 70 : 145,
            recoilForce: 22,
            sparkCount: 6,
            slashLength: 38,
            squashX: 0.1,
            squashY: 0.08,
            heavy: false
        };
    }
    
    playImpactFeedback(attackData, hitRecords, profile) {
        const primaryHit = hitRecords.find(record => record.wasKilled) || hitRecords[0];
        const affectedSprites = [this.player, ...hitRecords.map(record => record.target)];
        
        this.triggerHitStop(profile.hitStop, affectedSprites);
        
        if (this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(profile.shakeDuration, profile.shakeIntensity);
        }
        
        hitRecords.forEach(record => {
            this.flashTarget(record.target);
            this.squashTarget(record.target, profile);
            this.showImpactEffect(record, profile, attackData);
            
            this.queueImpactTimer(profile.hitStop + 10, () => {
                if (record.target && record.target.body && !record.target.isDead) {
                    this.applyKnockback(record.target, record.direction, profile.knockbackForce);
                }
            });
        });
        
        this.queueImpactTimer(profile.hitStop + 10, () => {
            this.applyPlayerRecoil(primaryHit.direction, profile.recoilForce);
        });
    }
    
    getHitPoint(hitbox, target, attackData) {
        const targetBounds = target.getBounds();
        const hitboxBounds = hitbox.getBounds();
        const hitCenterX = hitboxBounds.centerX ?? (hitboxBounds.x + hitboxBounds.width / 2);
        const hitCenterY = hitboxBounds.centerY ?? (hitboxBounds.y + hitboxBounds.height / 2);
        const fallbackX = attackData.facingRight ? targetBounds.left : targetBounds.right;
        
        return {
            x: Phaser.Math.Clamp(hitCenterX, targetBounds.left, targetBounds.right) || fallbackX,
            y: Phaser.Math.Clamp(hitCenterY, targetBounds.top, targetBounds.bottom) || target.y
        };
    }
    
    triggerHitStop(duration, sprites) {
        if (duration <= 0 || this.hitStopActive) {
            return;
        }
        
        this.hitStopActive = true;
        const frozenSprites = sprites.filter(sprite => sprite && sprite.active !== false);
        const previousAnimationScales = frozenSprites.map(sprite => ({
            sprite,
            timeScale: sprite.anims ? sprite.anims.timeScale : null
        }));
        
        frozenSprites.forEach(sprite => {
            if (sprite.anims) {
                sprite.anims.timeScale = 0;
            }
            if (sprite.body && sprite.body.setVelocity) {
                sprite.body.setVelocity(0, 0);
            }
        });
        
        const world = this.scene.physics && this.scene.physics.world;
        if (world && world.pause) {
            world.pause();
        }
        
        this.queueImpactTimer(duration, () => {
            previousAnimationScales.forEach(entry => {
                if (entry.sprite && entry.sprite.anims && entry.timeScale !== null) {
                    entry.sprite.anims.timeScale = entry.timeScale || 1;
                }
            });
            
            if (world && world.resume) {
                world.resume();
            }
            this.hitStopActive = false;
        });
    }
    
    queueImpactTimer(delay, callback) {
        const timer = window.setTimeout(() => {
            const index = this.impactTimers.indexOf(timer);
            if (index > -1) {
                this.impactTimers.splice(index, 1);
            }
            callback();
        }, delay);
        
        this.impactTimers.push(timer);
        return timer;
    }
    
    applyPlayerRecoil(hitDirection, recoilForce) {
        if (!this.player || !this.player.body || this.player.states.isDead) {
            return;
        }
        
        this.player.body.setVelocityX(-hitDirection * recoilForce);
        this.scene.time.delayedCall(90, () => {
            if (this.player && this.player.body && !this.player.states.isDead) {
                this.player.body.setVelocityX(this.player.body.velocity.x * 0.35);
            }
        });
    }
    
    flashTarget(target) {
        if (!target || !target.active) {
            return;
        }
        
        target.setTint(0xffffff);
        this.queueImpactTimer(35, () => {
            if (target && target.active) {
                target.setTint(0xff3333);
            }
        });
        this.queueImpactTimer(145, () => {
            if (target && target.active) {
                target.clearTint();
            }
        });
    }
    
    squashTarget(target, profile) {
        if (!target || !target.active || target.isDead || (target.states && target.states.isDead)) {
            return;
        }
        
        const baseScaleX = target.scaleX;
        const baseScaleY = target.scaleY;
        
        this.scene.tweens.add({
            targets: target,
            scaleX: baseScaleX * (1 + profile.squashX),
            scaleY: baseScaleY * (1 - profile.squashY),
            duration: 45,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (target && target.active) {
                    target.setScale(baseScaleX, baseScaleY);
                }
            }
        });
    }
    
    showImpactEffect(record, profile, attackData) {
        const x = record.hitX;
        const y = record.hitY;
        const direction = record.direction;
        
        const flash = this.scene.add.circle(x, y, profile.heavy ? 18 : 13, 0xffffff, 0.9);
        flash.setDepth(80);
        this.scene.tweens.add({
            targets: flash,
            scaleX: 1.8,
            scaleY: 1.8,
            alpha: 0,
            duration: profile.heavy ? 120 : 90,
            ease: 'Expo.easeOut',
            onComplete: () => flash.destroy()
        });
        
        const slash = this.scene.add.rectangle(
            x - direction * 4,
            y,
            profile.slashLength,
            profile.heavy ? 5 : 3,
            0xfff0b0,
            0.95
        );
        slash.setDepth(75);
        slash.setRotation(direction > 0 ? -0.22 : 0.22);
        this.scene.tweens.add({
            targets: slash,
            scaleX: 1.35,
            alpha: 0,
            duration: profile.heavy ? 115 : 85,
            ease: 'Cubic.easeOut',
            onComplete: () => slash.destroy()
        });
        
        const sparks = this.scene.add.graphics();
        sparks.setDepth(85);
        sparks.setPosition(x, y);
        const baseAngle = direction > 0 ? 0 : Math.PI;
        
        for (let i = 0; i < profile.sparkCount; i++) {
            const angle = baseAngle + Phaser.Math.FloatBetween(-0.85, 0.85);
            const length = Phaser.Math.Between(profile.heavy ? 13 : 8, profile.heavy ? 28 : 18);
            const startOffset = Phaser.Math.Between(1, 4);
            const color = i % 3 === 0 ? 0xffffff : (i % 3 === 1 ? 0xffd35a : 0xff6b35);
            
            sparks.lineStyle(profile.heavy ? 2 : 1, color, 1);
            sparks.beginPath();
            sparks.moveTo(Math.cos(angle) * startOffset, Math.sin(angle) * startOffset);
            sparks.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            sparks.strokePath();
        }
        
        this.scene.tweens.add({
            targets: sparks,
            x: x + direction * 8,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0,
            duration: profile.heavy ? 150 : 110,
            ease: 'Quad.easeOut',
            onComplete: () => sparks.destroy()
        });
    }
    
    showDamageNumber(x, y, damage, color, options = {}) {
        // 创建伤害数字
        const damageText = this.scene.add.text(x, y, damage.toString(), {
            fontSize: options.fontSize || '20px',
            fontStyle: 'bold',
            color: this.formatColor(color),
            stroke: '#000000',
            strokeThickness: options.strokeThickness ?? 2
        }).setOrigin(0.5);
        
        // 设置深度
        damageText.setDepth(options.depth ?? 100);
        if (options.startScale) {
            damageText.setScale(options.startScale);
            this.scene.tweens.add({
                targets: damageText,
                scaleX: 1,
                scaleY: 1,
                duration: 95,
                ease: 'Back.easeOut'
            });
        }
        
        // 添加到列表
        this.damageNumbers.push(damageText);
        
        // 上升动画
        this.scene.tweens.add({
            targets: damageText,
            y: y - (options.rise ?? 50),
            alpha: 0,
            duration: options.duration ?? 1000,
            ease: 'Power2',
            onComplete: () => {
                const index = this.damageNumbers.indexOf(damageText);
                if (index > -1) {
                    this.damageNumbers.splice(index, 1);
                }
                damageText.destroy();
            }
        });
    }
    
    formatColor(color) {
        if (typeof color === 'string') {
            return color.startsWith('#') ? color : `#${color}`;
        }
        
        return '#' + color.toString(16).padStart(6, '0');
    }
    
    showAttackEffect(x, y) {
        // 简单的闪光效果
        const flash = this.scene.add.circle(x, y, 30, 0xffffff, 0.5);
        flash.setDepth(15);
        
        this.scene.tweens.add({
            targets: flash,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
    }
    
    addEnemy(enemy) {
        if (!this.enemies.includes(enemy)) {
            this.enemies.push(enemy);
        }
    }
    
    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
        }
    }
    
    checkEnemyAttackRange(enemy, range) {
        if (!this.player || this.player.states.isDead) {
            return false;
        }
        
        const distance = Phaser.Math.Distance.Between(
            enemy.x, enemy.y,
            this.player.x, this.player.y
        );
        
        return distance <= range;
    }
    
    getPlayerDistance(enemy) {
        if (!this.player) return Infinity;
        
        // 计算水平距离
        const horizontalDistance = Math.abs(enemy.x - this.player.x);
        
        // 计算垂直距离
        const verticalDistance = Math.abs(enemy.y - this.player.y);
        
        // 如果垂直距离过大（不同平台），返回无限远
        if (verticalDistance > 100) {
            return Infinity;
        }
        
        // 主要考虑水平距离，垂直距离只作为辅助判断
        return horizontalDistance;
    }
    
    getPlayerDirection(enemy) {
        if (!this.player) return 0;
        
        return this.player.x > enemy.x ? 1 : -1;
    }
    
    update(time, delta) {
        // 清理已销毁的判定盒
        this.attackHitboxes = this.attackHitboxes.filter(hitbox => {
            if (hitbox.scene === undefined) {
                return false;
            }
            return true;
        });
    }
    
    destroy() {
        // 清理事件监听
        this.scene.events.off('playerAttack', this.handlePlayerAttack, this);
        this.scene.events.off('enemyAttack', this.handleEnemyAttack, this);
        this.scene.events.off('playerDamaged', this.handlePlayerDamaged, this);
        
        // 清理判定盒
        this.attackHitboxes.forEach(hitbox => hitbox.destroy());
        this.attackHitboxes = [];
        
        // 清理伤害数字
        this.damageNumbers.forEach(text => text.destroy());
        this.damageNumbers = [];
        
        this.impactTimers.forEach(timer => window.clearTimeout(timer));
        this.impactTimers = [];
    }
}
