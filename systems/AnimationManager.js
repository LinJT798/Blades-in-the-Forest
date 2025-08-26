class AnimationManager {
    constructor(scene) {
        this.scene = scene;
        this.currentAnimation = null;
        this.animationPriorities = {
            'death': 100,
            'be_attacked': 90,
            'attack_1hit': 80,
            'combo_attack': 80,
            'shield_defense': 75,
            'jump_prepare': 70,
            'flying_up': 70,
            'falling': 70,
            'landing': 70,
            'wall_slide_start': 65,
            'wall_slide_loop': 65,
            'run': 50,
            'walking': 40,
            'crouch': 30,
            'idle': 10
        };
    }
    
    playAnimation(sprite, animationKey, ignoreIfPlaying = false) {
        const fullAnimKey = this.getFullAnimationKey(sprite, animationKey);
        
        // 检查动画是否存在
        if (!this.scene.anims.exists(fullAnimKey)) {
            console.warn(`Animation ${fullAnimKey} does not exist`);
            return false;
        }
        
        // 如果已经在播放相同动画且设置忽略
        if (ignoreIfPlaying && sprite.anims.currentAnim && 
            sprite.anims.currentAnim.key === fullAnimKey) {
            return true;
        }
        
        // 检查优先级
        if (this.shouldPlayAnimation(sprite, animationKey)) {
            sprite.play(fullAnimKey);
            this.currentAnimation = animationKey;
            return true;
        }
        
        return false;
    }
    
    getFullAnimationKey(sprite, animationKey) {
        // 根据精灵类型生成完整的动画键名
        if (sprite.name === 'player') {
            return 'player_' + animationKey;
        } else if (sprite.name === 'slime') {
            return 'slime_' + animationKey;
        } else if (sprite.name === 'skeleton') {
            return 'skeleton_' + animationKey;
        } else if (sprite.name === 'death') {
            return 'death_' + animationKey;
        } else if (sprite.name === 'chest_small') {
            return 'chest_small_' + animationKey;
        } else if (sprite.name === 'chest_large') {
            return 'chest_large_' + animationKey;
        } else if (sprite.name === 'coin') {
            return 'coin_' + animationKey;
        } else if (sprite.name === 'heart') {
            return 'heart_' + animationKey;
        } else if (sprite.name === 'shop') {
            return 'shop_' + animationKey;
        }
        
        return animationKey;
    }
    
    shouldPlayAnimation(sprite, newAnimation) {
        // 如果没有当前动画，可以播放
        if (!sprite.anims.currentAnim) {
            return true;
        }
        
        const currentAnimKey = this.extractAnimationKey(sprite.anims.currentAnim.key);
        
        // 获取优先级
        const currentPriority = this.animationPriorities[currentAnimKey] || 0;
        const newPriority = this.animationPriorities[newAnimation] || 0;
        
        // 死亡动画不能被打断
        if (currentAnimKey === 'death') {
            return false;
        }
        
        // 新动画优先级更高时播放
        return newPriority >= currentPriority;
    }
    
    extractAnimationKey(fullKey) {
        // 从完整的动画键名中提取基础动画名
        const parts = fullKey.split('_');
        if (parts[0] === 'player' || parts[0] === 'slime' || 
            parts[0] === 'skeleton' || parts[0] === 'death') {
            return parts.slice(1).join('_');
        }
        return fullKey;
    }
    
    stopAnimation(sprite) {
        if (sprite.anims.isPlaying) {
            sprite.anims.stop();
            this.currentAnimation = null;
        }
    }
    
    isAnimationPlaying(sprite, animationKey) {
        if (!sprite.anims.currentAnim) {
            return false;
        }
        
        const fullAnimKey = this.getFullAnimationKey(sprite, animationKey);
        return sprite.anims.currentAnim.key === fullAnimKey;
    }
    
    isAnimationFinished(sprite) {
        if (!sprite.anims.currentAnim) {
            return true;
        }
        
        return sprite.anims.currentFrame.index === 
               sprite.anims.currentAnim.frames.length - 1;
    }
    
    setAnimationSpeed(sprite, speed) {
        if (sprite.anims.currentAnim) {
            sprite.anims.timeScale = speed;
        }
    }
    
    // 创建动画事件监听器
    addAnimationEvent(sprite, animationKey, frameIndex, callback) {
        const fullAnimKey = this.getFullAnimationKey(sprite, animationKey);
        
        sprite.on('animationupdate', (animation, frame) => {
            if (animation.key === fullAnimKey && frame.index === frameIndex) {
                callback();
            }
        });
    }
    
    // 动画完成事件
    onAnimationComplete(sprite, animationKey, callback) {
        const fullAnimKey = this.getFullAnimationKey(sprite, animationKey);
        
        sprite.on('animationcomplete', (animation) => {
            if (animation.key === fullAnimKey) {
                callback();
            }
        });
    }
    
    // 获取当前动画进度
    getAnimationProgress(sprite) {
        if (!sprite.anims.currentAnim) {
            return 0;
        }
        
        const currentFrame = sprite.anims.currentFrame.index;
        const totalFrames = sprite.anims.currentAnim.frames.length;
        
        return currentFrame / totalFrames;
    }
    
    // 设置动画循环
    setAnimationRepeat(sprite, animationKey, repeat = -1) {
        const fullAnimKey = this.getFullAnimationKey(sprite, animationKey);
        const anim = this.scene.anims.get(fullAnimKey);
        
        if (anim) {
            anim.repeat = repeat;
        }
    }
    
    // 镜像精灵（用于改变朝向）
    flipSprite(sprite, flipX, flipY = false) {
        sprite.setFlipX(flipX);
        sprite.setFlipY(flipY);
    }
    
    // 根据速度自动设置朝向
    updateSpriteDirection(sprite, velocityX) {
        if (velocityX > 0) {
            this.flipSprite(sprite, false);
        } else if (velocityX < 0) {
            this.flipSprite(sprite, true);
        }
    }
}