class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.uiContainer = null;
        
        // UI元素
        this.hpBar = null;
        this.spBar = null;
        this.hpText = null;
        this.spText = null;
        this.coinText = null;
        this.tutorialText = null;
        this.bossHealthBar = null;
    }
    
    create() {
        // 创建UI容器
        this.uiContainer = this.scene.add.container(0, 0);
        this.uiContainer.setDepth(150);
        this.uiContainer.setScrollFactor(0); // UI不跟随摄像机
        
        // 创建血条和精力条
        this.createHealthBar();
        this.createStaminaBar();
        
        // 创建金币显示
        this.createCoinDisplay();
        
        // 创建操作提示
        this.createTutorialHints();
    }
    
    createHealthBar() {
        const x = 20;
        const y = 20;
        const width = 150;
        const height = 20;
        
        // 血条背景
        const hpBarBg = this.scene.add.rectangle(x, y, width, height, 0x000000, 0.5);
        hpBarBg.setOrigin(0, 0);
        hpBarBg.setStrokeStyle(2, 0x8b0000);
        
        // 血条
        this.hpBar = this.scene.add.rectangle(x + 2, y + 2, width - 4, height - 4, 0xff0000);
        this.hpBar.setOrigin(0, 0);
        
        // HP文字
        this.hpText = this.scene.add.text(x + width / 2, y + height / 2, '', {
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // 心心图标
        const heartIcon = this.scene.add.image(x - 5, y + height / 2, 'heart_icon');
        heartIcon.setScale(0.8);
        
        // 添加到容器
        this.uiContainer.add([hpBarBg, this.hpBar, this.hpText, heartIcon]);
    }
    
    createStaminaBar() {
        const x = 20;
        const y = 45;
        const width = 150;
        const height = 15;
        
        // 精力条背景
        const spBarBg = this.scene.add.rectangle(x, y, width, height, 0x000000, 0.5);
        spBarBg.setOrigin(0, 0);
        spBarBg.setStrokeStyle(2, 0x00008b);
        
        // 精力条
        this.spBar = this.scene.add.rectangle(x + 2, y + 2, width - 4, height - 4, 0x0080ff);
        this.spBar.setOrigin(0, 0);
        
        // SP文字
        this.spText = this.scene.add.text(x + width / 2, y + height / 2, '', {
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // SP标签
        const spLabel = this.scene.add.text(x - 5, y + height / 2, 'SP', {
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#0080ff'
        }).setOrigin(1, 0.5);
        
        // 添加到容器
        this.uiContainer.add([spBarBg, this.spBar, this.spText, spLabel]);
        
        // SP低警告闪烁
        this.spWarning = false;
    }
    
    createCoinDisplay() {
        const x = 20;
        const y = 70;
        
        // 金币图标
        const coinIcon = this.scene.add.image(x, y, 'coin_icon');
        coinIcon.setScale(1);
        
        // 金币数量
        this.coinText = this.scene.add.text(x + 20, y, '0', {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5);
        
        // 添加到容器
        this.uiContainer.add([coinIcon, this.coinText]);
    }
    
    createTutorialHints() {
        // 教学提示容器
        this.tutorialContainer = this.scene.add.container(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height - 50
        );
        this.tutorialContainer.setDepth(140);
        this.tutorialContainer.setScrollFactor(0);
        
        // 教学文本
        this.tutorialText = this.scene.add.text(0, 0, '', {
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        
        this.tutorialContainer.add(this.tutorialText);
        this.tutorialContainer.setVisible(false);
    }
    
    updateHealthBar(current, max) {
        if (!this.hpBar) return;
        
        const percent = Math.max(0, current / max);
        const maxWidth = 146;
        
        this.hpBar.width = maxWidth * percent;
        this.hpText.setText(`${Math.floor(current)}/${max}`);
        
        // 根据血量改变颜色
        if (percent > 0.6) {
            this.hpBar.setFillStyle(0x00ff00); // 绿色
        } else if (percent > 0.3) {
            this.hpBar.setFillStyle(0xffff00); // 黄色
        } else {
            this.hpBar.setFillStyle(0xff0000); // 红色
        }
    }
    
    updateStaminaBar(current, max) {
        if (!this.spBar) return;
        
        const percent = Math.max(0, current / max);
        const maxWidth = 146;
        
        this.spBar.width = maxWidth * percent;
        this.spText.setText(`${Math.floor(current)}/${max}`);
        
        // SP低于20时闪烁警告
        if (current < 20 && !this.spWarning) {
            this.spWarning = true;
            this.scene.tweens.add({
                targets: [this.spBar, this.spText],
                alpha: 0.3,
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        } else if (current >= 20 && this.spWarning) {
            this.spWarning = false;
            this.scene.tweens.killTweensOf([this.spBar, this.spText]);
            this.spBar.alpha = 1;
            this.spText.alpha = 1;
        }
    }
    
    updateCoinDisplay(amount) {
        if (this.coinText) {
            this.coinText.setText(amount.toString());
            
            // 金币增加动画
            this.scene.tweens.add({
                targets: this.coinText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                yoyo: true
            });
        }
    }
    
    showTutorial(text, duration = 3000) {
        if (!this.tutorialContainer) return;
        
        this.tutorialText.setText(text);
        this.tutorialContainer.setVisible(true);
        
        // 淡入
        this.tutorialContainer.setAlpha(0);
        this.scene.tweens.add({
            targets: this.tutorialContainer,
            alpha: 1,
            duration: 500
        });
        
        // 自动隐藏
        if (duration > 0) {
            this.scene.time.delayedCall(duration, () => {
                this.hideTutorial();
            });
        }
    }
    
    hideTutorial() {
        if (!this.tutorialContainer) return;
        
        this.scene.tweens.add({
            targets: this.tutorialContainer,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.tutorialContainer.setVisible(false);
            }
        });
    }
    
    createBossHealthBar() {
        const width = 400;
        const height = 30;
        const x = (this.scene.cameras.main.width - width) / 2;
        const y = 50;
        
        // BOSS血条容器
        this.bossHealthContainer = this.scene.add.container(x, y);
        this.bossHealthContainer.setDepth(151);
        this.bossHealthContainer.setScrollFactor(0);
        
        // 背景
        const bg = this.scene.add.rectangle(width / 2, 0, width, height, 0x000000, 0.7);
        bg.setStrokeStyle(3, 0x8b0000);
        
        // 血条
        this.bossHealthBar = this.scene.add.rectangle(2, -height / 2 + 2, width - 4, height - 4, 0x8b0000);
        this.bossHealthBar.setOrigin(0, 0);
        
        // BOSS名称
        const bossName = this.scene.add.text(width / 2, -height - 5, '死神', {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 1);
        
        // HP文字
        this.bossHpText = this.scene.add.text(width / 2, 0, '', {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // 添加到容器
        this.bossHealthContainer.add([bg, this.bossHealthBar, bossName, this.bossHpText]);
        this.bossHealthContainer.setVisible(false);
    }
    
    showBossHealthBar() {
        if (!this.bossHealthContainer) {
            this.createBossHealthBar();
        }
        
        this.bossHealthContainer.setVisible(true);
        this.bossHealthContainer.setAlpha(0);
        
        this.scene.tweens.add({
            targets: this.bossHealthContainer,
            alpha: 1,
            duration: 1000
        });
    }
    
    updateBossHealthBar(current, max) {
        if (!this.bossHealthBar) return;
        
        const percent = Math.max(0, current / max);
        const maxWidth = 396;
        
        this.bossHealthBar.width = maxWidth * percent;
        this.bossHpText.setText(`${Math.floor(current)}/${max}`);
        
        // 根据血量阶段改变颜色
        if (percent > 0.75) {
            this.bossHealthBar.setFillStyle(0x8b0000); // 深红
        } else if (percent > 0.5) {
            this.bossHealthBar.setFillStyle(0xff0000); // 红色
        } else if (percent > 0.25) {
            this.bossHealthBar.setFillStyle(0xff4500); // 橙红
        } else {
            this.bossHealthBar.setFillStyle(0xff8c00); // 暗橙
        }
    }
    
    hideBossHealthBar() {
        if (!this.bossHealthContainer) return;
        
        this.scene.tweens.add({
            targets: this.bossHealthContainer,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                this.bossHealthContainer.setVisible(false);
            }
        });
    }
    
    showDamageNumber(x, y, damage, color = 0xffff00) {
        // 转换世界坐标到屏幕坐标
        const camera = this.scene.cameras.main;
        const screenX = x - camera.scrollX;
        const screenY = y - camera.scrollY;
        
        const damageText = this.scene.add.text(screenX, screenY, damage.toString(), {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#' + color.toString(16).padStart(6, '0'),
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        damageText.setDepth(160);
        damageText.setScrollFactor(0);
        
        // 上升动画
        this.scene.tweens.add({
            targets: damageText,
            y: screenY - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                damageText.destroy();
            }
        });
    }
    
    showGameMessage(message, duration = 2000) {
        const { width, height } = this.scene.cameras.main;
        
        const messageText = this.scene.add.text(width / 2, height / 2, message, {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        messageText.setDepth(200);
        messageText.setScrollFactor(0);
        messageText.setScale(0);
        
        // 放大动画
        this.scene.tweens.add({
            targets: messageText,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                // 延迟后消失
                this.scene.time.delayedCall(duration, () => {
                    this.scene.tweens.add({
                        targets: messageText,
                        alpha: 0,
                        scaleX: 0.5,
                        scaleY: 0.5,
                        duration: 500,
                        onComplete: () => {
                            messageText.destroy();
                        }
                    });
                });
            }
        });
    }
    
    update() {
        // 更新UI显示
        const player = this.scene.player;
        if (player) {
            this.updateHealthBar(player.currentHP, player.maxHP);
            this.updateStaminaBar(player.currentSP, player.maxSP);
        }
        
        if (window.gameData) {
            this.updateCoinDisplay(window.gameData.coins);
        }
    }
    
    destroy() {
        if (this.uiContainer) {
            this.uiContainer.destroy();
        }
        if (this.tutorialContainer) {
            this.tutorialContainer.destroy();
        }
        if (this.bossHealthContainer) {
            this.bossHealthContainer.destroy();
        }
    }
}