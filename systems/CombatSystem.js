class CombatSystem {
    constructor(scene) {
        this.scene = scene;
        this.player = null;
        this.enemies = [];
        this.attackHitboxes = [];
        this.damageNumbers = [];
    }
    
    initialize(player, enemies) {
        this.player = player;
        this.enemies = enemies;
        
        // 监听玩家攻击事件
        this.scene.events.on('playerAttack', this.handlePlayerAttack, this);
        
        // 监听敌人攻击事件
        this.scene.events.on('enemyAttack', this.handleEnemyAttack, this);
    }
    
    handlePlayerAttack(attackData) {
        // 创建攻击判定盒
        const hitbox = this.createHitbox(
            attackData.x,
            attackData.y,
            attackData.width,
            attackData.height
        );
        
        // 检测与敌人的碰撞
        this.enemies.forEach(enemy => {
            if (!enemy.isDead && this.checkCollision(hitbox, enemy)) {
                // 记录敌人当前血量（用于计算实际造成的伤害）
                const enemyHPBefore = enemy.currentHP;
                
                // 先应用击退效果（在造成伤害之前，这样不会被死亡中断）
                // 击退方向：如果玩家在敌人左边，敌人向右击退，反之向左
                const knockbackDirection = this.player.x < enemy.x ? 1 : -1;
                this.applyKnockback(enemy, knockbackDirection);
                
                // 造成伤害
                this.dealDamage(enemy, attackData.damage, 'player');
                
                // 计算实际造成的伤害
                const actualDamage = enemyHPBefore - (enemy.currentHP || 0);
                
                // 应用生命偷取效果
                if (attackData.lifesteal && attackData.lifesteal > 0 && actualDamage > 0) {
                    const healAmount = Math.floor(actualDamage * attackData.lifesteal);
                    if (healAmount > 0 && this.player) {
                        this.player.heal(healAmount);
                        
                        // 显示吸血效果（绿色数字）
                        this.showDamageNumber(this.player.x, this.player.y - 30, `+${healAmount}`, '#00ff00');
                    }
                }
            }
        });
        
        // 显示攻击特效
        this.showAttackEffect(attackData.x, attackData.y);
        
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
            // 对玩家造成伤害
            this.player.takeDamage(attackData.damage);
            
            // 显示伤害数字
            this.showDamageNumber(
                this.player.x,
                this.player.y - 30,
                attackData.damage,
                0xff0000
            );
        }
        
        // 销毁判定盒（Debug 模式下延长显示时间便于观察）
        const enemyHitboxLifetime = (this.scene.physics && this.scene.physics.world && this.scene.physics.world.drawDebug) ? 250 : 100;
        this.scene.time.delayedCall(enemyHitboxLifetime, () => {
            if (hitbox && hitbox.destroy) {
                hitbox.destroy();
            }
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
    
    dealDamage(target, damage, source = 'unknown') {
        if (!target || target.isDead) {
            return;
        }
        
        // 计算实际伤害
        let actualDamage = damage;
        
        // 如果目标有防御状态，减少伤害
        if (target.isDefending) {
            actualDamage = Math.floor(damage * 0.3);
        }
        
        // 如果目标有takeDamage方法，使用它（这样会触发onHit）
        if (target.takeDamage && typeof target.takeDamage === 'function') {
            target.takeDamage(actualDamage);
        } else {
            // 否则直接扣血
            target.currentHP = Math.max(0, target.currentHP - actualDamage);
        }
        
        // 显示伤害数字
        this.showDamageNumber(
            target.x,
            target.y - 30,
            actualDamage,
            source === 'player' ? 0xffff00 : 0xff0000
        );
        
        // 检查死亡（takeDamage内部会处理死亡，这里做二次检查）
        if (target.currentHP <= 0 && !target.isDead) {
            // 如果目标有die方法，调用它（让Enemy自己处理死亡和掉落）
            if (target.die && typeof target.die === 'function') {
                target.die();
                
                // 触发击杀事件
                if (source === 'player' && target.name !== 'player') {
                    if (window.gameData) {
                        window.gameData.enemiesKilled++;
                    }
                    
                    this.scene.events.emit('enemyKilled', {
                        enemy: target,
                        x: target.x,
                        y: target.y
                    });
                    
                    // Boss会在自己的die()方法中触发bossDefeated事件
                    // 这里只设置标志
                    if (target.name === 'death') {
                        if (window.gameData) {
                            window.gameData.bossDefeated = true;
                        }
                        // 不要重复触发事件，Boss的die()方法会处理
                        // this.scene.events.emit('bossDefeated');
                    }
                }
            } else {
                // 其他情况（如玩家）使用原有逻辑
                this.onTargetKilled(target, source);
            }
        } else {
            // 触发受击效果
            this.onTargetHit(target);
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
    
    applyKnockback(target, direction) {
        if (!target.body) return;
        
        // 对敌人使用轻微的击退力度（类似玩家防御时的击退）
        const isEnemy = target.name !== 'player';
        const knockbackForce = isEnemy ? 
            GameConfig.ENEMY_KNOCKBACK_FORCE * direction :
            GameConfig.KNOCKBACK_DISTANCE * direction;
        
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
    
    showDamageNumber(x, y, damage, color) {
        // 创建伤害数字
        const damageText = this.scene.add.text(x, y, damage.toString(), {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#' + color.toString(16).padStart(6, '0'),
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // 设置深度
        damageText.setDepth(100);
        
        // 添加到列表
        this.damageNumbers.push(damageText);
        
        // 上升动画
        this.scene.tweens.add({
            targets: damageText,
            y: y - 50,
            alpha: 0,
            duration: 1000,
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
        
        // 清理判定盒
        this.attackHitboxes.forEach(hitbox => hitbox.destroy());
        this.attackHitboxes = [];
        
        // 清理伤害数字
        this.damageNumbers.forEach(text => text.destroy());
        this.damageNumbers = [];
    }
}