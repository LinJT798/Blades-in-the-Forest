class PhysicsSystem {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
    }
    
    setupWorldPhysics() {
        // 设置世界边界（底部延伸500像素，允许掉落）
        this.scene.physics.world.setBounds(0, 0, GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT + 500);
        
        // 设置重力
        this.scene.physics.world.gravity.y = GameConfig.GRAVITY;
    }
    
    setupPlayerCollisions(player, tileLayer, decorations) {
        // 玩家与地块碰撞
        if (tileLayer) {
            const tileCollider = this.scene.physics.add.collider(player, tileLayer);
            this.colliders.push(tileCollider);
        }
        
        // 玩家与装饰物碰撞
        if (decorations && decorations.length > 0) {
            decorations.forEach(decoration => {
                if (decoration.body) {
                    const decoCollider = this.scene.physics.add.collider(player, decoration);
                    this.colliders.push(decoCollider);
                }
            });
        }
    }
    
    setupEnemyCollisions(enemies, tileLayer, decorations) {
        enemies.forEach(enemy => {
            // 敌人与地块碰撞
            if (tileLayer) {
                const tileCollider = this.scene.physics.add.collider(enemy, tileLayer);
                this.colliders.push(tileCollider);
            }
            
            // 敌人与装饰物碰撞
            if (decorations && decorations.length > 0) {
                decorations.forEach(decoration => {
                    if (decoration.body) {
                        const decoCollider = this.scene.physics.add.collider(enemy, decoration);
                        this.colliders.push(decoCollider);
                    }
                });
            }
            
            // 敌人之间的碰撞
            enemies.forEach(otherEnemy => {
                if (enemy !== otherEnemy) {
                    const enemyCollider = this.scene.physics.add.collider(
                        enemy, 
                        otherEnemy,
                        null,
                        (e1, e2) => {
                            // 防止敌人重叠
                            return !e1.isDead && !e2.isDead;
                        }
                    );
                    this.colliders.push(enemyCollider);
                }
            });
        });
    }
    
    setupDropItemPhysics(item, tileLayer, decorations) {
        // 掉落物与地块碰撞
        if (tileLayer) {
            const tileCollider = this.scene.physics.add.collider(
                item, 
                tileLayer,
                () => {
                    // 落地后停止弹跳
                    if (item.body.velocity.y < 1 && item.body.touching.down) {
                        item.body.setVelocityY(0);
                        item.body.setBounce(0);
                    }
                }
            );
            this.colliders.push(tileCollider);
        }
        
        // 掉落物与装饰物碰撞
        if (decorations && decorations.length > 0) {
            decorations.forEach(decoration => {
                if (decoration.body) {
                    const decoCollider = this.scene.physics.add.collider(item, decoration);
                    this.colliders.push(decoCollider);
                }
            });
        }
    }
    
    setupPickupOverlap(player, items, callback) {
        // 玩家与物品的重叠检测
        const overlap = this.scene.physics.add.overlap(
            player,
            items,
            (player, item) => {
                if (callback) {
                    callback(player, item);
                }
            }
        );
        this.colliders.push(overlap);
        return overlap;
    }
    
    setupInteractionZone(player, interactables, callback) {
        // 玩家与交互物的重叠检测
        interactables.forEach(interactable => {
            const overlap = this.scene.physics.add.overlap(
                player,
                interactable,
                (player, object) => {
                    if (callback) {
                        callback(player, object);
                    }
                },
                null,
                this.scene
            );
            this.colliders.push(overlap);
        });
    }
    
    createDropPhysics(x, y, sprite) {
        // 设置掉落物理属性
        sprite.body.setGravityY(GameConfig.DROP_GRAVITY);
        sprite.body.setBounce(GameConfig.DROP_BOUNCE);
        sprite.body.setFriction(GameConfig.DROP_FRICTION);
        
        // 设置初始速度（随机）
        const vx = Phaser.Math.Between(
            GameConfig.DROP_INITIAL_VX[0],
            GameConfig.DROP_INITIAL_VX[1]
        );
        const vy = Phaser.Math.Between(
            GameConfig.DROP_INITIAL_VY[0],
            GameConfig.DROP_INITIAL_VY[1]
        );
        
        sprite.body.setVelocity(vx, vy);
    }
    
    createMultipleDrops(x, y, count, createCallback) {
        const drops = [];
        const angleStep = 30; // 每个掉落物之间的角度
        const startAngle = -((count - 1) * angleStep) / 2;
        
        for (let i = 0; i < count; i++) {
            const angle = startAngle + i * angleStep;
            const radians = Phaser.Math.DegToRad(angle);
            
            // 计算速度向量
            const speed = Phaser.Math.Between(100, 150);
            const vx = Math.sin(radians) * speed;
            const vy = -Math.abs(Math.cos(radians) * speed);
            
            const drop = createCallback(x, y);
            if (drop && drop.body) {
                drop.body.setVelocity(vx, vy);
                drops.push(drop);
            }
        }
        
        return drops;
    }
    
    checkGrounded(sprite) {
        return sprite.body.blocked.down || sprite.body.touching.down;
    }
    
    checkWallTouch(sprite) {
        return {
            left: sprite.body.blocked.left || sprite.body.touching.left,
            right: sprite.body.blocked.right || sprite.body.touching.right
        };
    }
    
    applyForce(sprite, forceX, forceY) {
        if (sprite.body) {
            const currentVx = sprite.body.velocity.x;
            const currentVy = sprite.body.velocity.y;
            sprite.body.setVelocity(currentVx + forceX, currentVy + forceY);
        }
    }
    
    limitVelocity(sprite, maxVx, maxVy) {
        if (sprite.body) {
            const vx = Phaser.Math.Clamp(sprite.body.velocity.x, -maxVx, maxVx);
            const vy = Phaser.Math.Clamp(sprite.body.velocity.y, -maxVy, maxVy);
            sprite.body.setVelocity(vx, vy);
        }
    }
    
    removeCollider(collider) {
        const index = this.colliders.indexOf(collider);
        if (index > -1) {
            this.colliders.splice(index, 1);
            this.scene.physics.world.removeCollider(collider);
        }
    }
    
    destroy() {
        // 清理所有碰撞器
        this.colliders.forEach(collider => {
            if (collider) {
                this.scene.physics.world.removeCollider(collider);
            }
        });
        this.colliders = [];
    }
}