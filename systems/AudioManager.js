// 音频管理器
class AudioManager {
    constructor(scene) {
        this.scene = scene;
        
        // 当前播放的背景音乐
        this.currentBGM = null;
        this.currentBGMKey = null;
        
        // 音效实例缓存
        this.soundEffects = {};
        
        // 从配置读取音量设置
        this.bgmVolume = AudioConfig.GLOBAL.BGM_VOLUME;
        this.sfxVolume = AudioConfig.GLOBAL.SFX_VOLUME;
        this.masterVolume = AudioConfig.GLOBAL.MASTER_VOLUME;
        
        // 初始化音效
        this.initSoundEffects();
    }
    
    initSoundEffects() {
        // 预创建音效实例（但不播放）
        const soundKeys = ['attack_1', 'attack_2', 'attacked'];
        
        soundKeys.forEach(key => {
            if (this.scene.cache.audio.exists(key)) {
                this.soundEffects[key] = this.scene.sound.add(key, {
                    volume: this.sfxVolume,
                    loop: false
                });
            }
        });
    }
    
    // 播放背景音乐
    playBGM(key, fadeIn = true) {
        // 如果已经在播放相同的音乐，不做处理
        if (this.currentBGMKey === key && this.currentBGM && this.currentBGM.isPlaying) {
            return;
        }
        
        // 停止当前音乐
        if (this.currentBGM) {
            if (fadeIn) {
                // 淡出效果
                this.scene.tweens.add({
                    targets: this.currentBGM,
                    volume: 0,
                    duration: 500,
                    onComplete: () => {
                        this.currentBGM.stop();
                        this.currentBGM.destroy();
                        this.startNewBGM(key, fadeIn);
                    }
                });
            } else {
                this.currentBGM.stop();
                this.currentBGM.destroy();
                this.startNewBGM(key, false);
            }
        } else {
            this.startNewBGM(key, fadeIn);
        }
    }
    
    startNewBGM(key, fadeIn) {
        // 检查音频是否存在
        if (!this.scene.cache.audio.exists(key)) {
            console.warn(`BGM '${key}' not found in cache`);
            return;
        }
        
        // 创建新的背景音乐
        this.currentBGM = this.scene.sound.add(key, {
            volume: fadeIn ? 0 : this.bgmVolume,
            loop: true
        });
        
        this.currentBGMKey = key;
        this.currentBGM.play();
        
        // 淡入效果
        if (fadeIn) {
            this.scene.tweens.add({
                targets: this.currentBGM,
                volume: this.bgmVolume,
                duration: 1000
            });
        }
    }
    
    // 停止背景音乐
    stopBGM(fadeOut = true) {
        if (!this.currentBGM) return;
        
        if (fadeOut) {
            this.scene.tweens.add({
                targets: this.currentBGM,
                volume: 0,
                duration: 500,
                onComplete: () => {
                    if (this.currentBGM) {
                        this.currentBGM.stop();
                        this.currentBGM.destroy();
                        this.currentBGM = null;
                        this.currentBGMKey = null;
                    }
                }
            });
        } else {
            this.currentBGM.stop();
            this.currentBGM.destroy();
            this.currentBGM = null;
            this.currentBGMKey = null;
        }
    }
    
    // 播放音效
    playSFX(key, config = {}) {
        // 检查音效是否存在
        if (!this.scene.cache.audio.exists(key)) {
            console.warn(`SFX '${key}' not found in cache`);
            return;
        }
        
        // 使用缓存的音效实例或创建新的
        let sound = this.soundEffects[key];
        
        if (!sound || sound.isPlaying) {
            // 如果正在播放或不存在，创建新实例
            sound = this.scene.sound.add(key, {
                volume: config.volume || this.sfxVolume,
                detune: config.detune || 0,
                rate: config.rate || 1,
                loop: false
            });
        }
        
        sound.play();
        
        // 如果不是预定义的音效，播放后销毁
        if (!this.soundEffects[key]) {
            sound.once('complete', () => {
                sound.destroy();
            });
        }
    }
    
    // 播放攻击音效
    playAttackSound(isCombo = false) {
        const config = isCombo ? 
            AudioConfig.SFX.ATTACK.COMBO : 
            AudioConfig.SFX.ATTACK.NORMAL;
        
        if (config && config.key) {
            this.playSFX(config.key, {
                volume: config.volume * this.masterVolume
            });
        }
    }
    
    // 播放受击音效
    playHitSound(target = 'PLAYER') {
        const config = AudioConfig.SFX.HIT[target] || AudioConfig.SFX.HIT.PLAYER;
        
        if (config && config.key) {
            this.playSFX(config.key, {
                volume: config.volume * this.masterVolume
            });
        }
    }
    
    // 根据触发器播放音频
    playByTrigger(trigger) {
        const config = AudioConfig.getTriggerConfig(trigger);
        if (!config) return;
        
        // 如果是BGM配置
        if (config.loop !== undefined) {
            this.playBGM(config.key, config.fadeIn);
        } else if (config.key) {
            // 如果是音效配置
            this.playSFX(config.key, {
                volume: config.volume * this.masterVolume
            });
        }
    }
    
    // 设置背景音乐音量
    setBGMVolume(volume) {
        this.bgmVolume = Phaser.Math.Clamp(volume, 0, 1);
        if (this.currentBGM) {
            this.currentBGM.setVolume(this.bgmVolume);
        }
    }
    
    // 设置音效音量
    setSFXVolume(volume) {
        this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
        // 更新所有音效的音量
        Object.values(this.soundEffects).forEach(sound => {
            sound.setVolume(this.sfxVolume);
        });
    }
    
    // 暂停所有音频
    pauseAll() {
        if (this.currentBGM && this.currentBGM.isPlaying) {
            this.currentBGM.pause();
        }
    }
    
    // 恢复所有音频
    resumeAll() {
        if (this.currentBGM && this.currentBGM.isPaused) {
            this.currentBGM.resume();
        }
    }
    
    // 清理资源
    destroy() {
        this.stopBGM(false);
        
        // 销毁所有音效
        Object.values(this.soundEffects).forEach(sound => {
            if (sound) {
                sound.destroy();
            }
        });
        
        this.soundEffects = {};
    }
}