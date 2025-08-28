class Shop extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // Y坐标已经是底部位置，需要调整为中心位置
        super(scene, x, y, 'shop');
        
        this.scene = scene;
        this.name = 'shop';
        this.interactionRadius = 50;
        
        // 商店唯一ID（用位置生成）
        this.shopId = `shop_${x}_${y}`;
        
        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // 静态物体
        
        // 根据需求设置尺寸
        const targetWidth = GameConfig.DECORATION_SIZES[326].width;
        const targetHeight = GameConfig.DECORATION_SIZES[326].height;
        const scaleX = targetWidth / this.width;
        const scaleY = targetHeight / this.height;
        this.setScale(scaleX, scaleY);
        
        // 设置原点为底部中心（与MapLoader的坐标系统一致）
        this.setOrigin(0.5, 1);
        
        // 设置碰撞盒（仅底部）
        this.body.setSize(targetWidth * 0.8, 20);
        this.body.setOffset(-targetWidth * 0.4, -20);
        
        // 交互提示
        this.interactionHint = null;
        
        // 商店UI
        this.shopUI = null;
        this.isOpen = false;
        
        // 卡片选择相关
        this.selectedIndex = 0; // 当前选中的卡片索引
        this.isSelectingReroll = false; // 是否选中重随按钮
        this.cardContainers = []; // 卡片容器数组
        this.rerollButton = null; // 重随按钮
        this.shopState = null; // 商店状态
        
        // 输入按键
        this.shopKeys = null;
        
        // 设置深度
        this.setDepth(5);
        
        // 播放动画（如果有）
        if (this.scene.anims.exists('shop_idle')) {
            this.play('shop_idle');
        }
    }
    
    update() {
        // 检查玩家距离
        const player = this.scene.player;
        if (player) {
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                player.x, player.y
            );
            
            if (distance <= this.interactionRadius) {
                this.showInteractionHint();
                
                // 检查交互输入
                if (player.keys && player.keys.attack.isDown && 
                    player.keys.attack.getDuration() < 100 && !this.isOpen) {
                    this.openShop();
                }
            } else {
                this.hideInteractionHint();
            }
        }
    }
    
    showInteractionHint() {
        if (!this.interactionHint && !this.isOpen) {
            // 创建交互提示
            this.interactionHint = this.scene.add.container(this.x, this.y - 60);
            
            // 背景
            const bg = this.scene.add.rectangle(0, 0, 80, 20, 0x000000, 0.7);
            
            // 文字
            const text = this.scene.add.text(0, 0, '按J进入商店', {
                fontSize: '12px',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            this.interactionHint.add([bg, text]);
            this.interactionHint.setDepth(100);
            
            // 淡入动画
            this.interactionHint.setAlpha(0);
            this.scene.tweens.add({
                targets: this.interactionHint,
                alpha: 1,
                duration: 200
            });
        }
    }
    
    hideInteractionHint() {
        if (this.interactionHint) {
            this.scene.tweens.add({
                targets: this.interactionHint,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    if (this.interactionHint) {
                        this.interactionHint.destroy();
                        this.interactionHint = null;
                    }
                }
            });
        }
    }
    
    openShop() {
        if (this.isOpen) {
            return;
        }
        
        this.isOpen = true;
        this.hideInteractionHint();
        
        // 暂停游戏
        this.scene.physics.pause();
        
        // 保存玩家引用到全局
        window.gameData.currentPlayer = this.scene.player;
        
        // 创建商店UI
        this.createShopUI();
        
        // 设置输入监听
        this.setupShopInput();
    }
    
    createShopUI() {
        const { width, height } = this.scene.cameras.main;
        
        // 创建UI容器（位置取整）
        this.shopUI = this.scene.add.container(Math.round(width / 2), Math.round(height / 2));
        this.shopUI.setScrollFactor(0); // 固定在屏幕上，不随相机滚动
        this.shopUI.setDepth(200);
        
        // 确保相机像素对齐
        this.scene.cameras.main.roundPixels = true;
        
        
        // 标题
        const title = this.scene.add.text(0, -120, '神秘商店', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 获取或生成商店卡片
        this.shopState = window.cardSystem.getShopCards(this.shopId);
        
        // 创建卡片显示
        this.createCardDisplay();
        
        // 创建重随按钮
        this.createRerollButton();
        
        // 操作提示（放在屏幕左下角，位置取整）
        const helpText = this.scene.add.text(Math.round(-width/2 + 10), Math.round(height/2 - 20), 
            'A/D: 选择卡片  W/S: 切换卡片/重随  J: 确认  K: 退出', {
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 1);
        
        // 金币显示（位置取整）
        const coinDisplay = this.scene.add.container(-200, -120);
        const coinIcon = this.scene.add.image(0, 0, 'coin_icon').setScale(0.5);
        const coinText = this.scene.add.text(15, 0, window.gameData.coins.toString(), {
            fontSize: '16px',
            color: '#ffd700'
        }).setOrigin(0, 0.5);
        coinDisplay.add([coinIcon, coinText]);
        
        // 生命显示（位置取整）
        const hpDisplay = this.scene.add.container(200, -120);
        const hpIcon = this.scene.add.image(0, 0, 'heart_icon').setScale(0.5);
        const hpText = this.scene.add.text(15, 0, 
            `${this.scene.player.currentHP}/${this.scene.player.maxHP}`, {
            fontSize: '16px',
            color: '#ff6b6b'
        }).setOrigin(0, 0.5);
        hpDisplay.add([hpIcon, hpText]);
        
        // 添加到容器
        this.shopUI.add([title, helpText, coinDisplay, hpDisplay]);
    }
    
    createCardDisplay() {
        const cardSpacing = 150;
        const startX = -cardSpacing;
        
        // 确保位置为整数
        const roundedStartX = Math.round(startX);
        
        this.cardContainers = [];
        
        for (let i = 0; i < 3; i++) {
            const cardId = this.shopState.cards[i];
            if (!cardId) continue;
            
            const card = window.cardSystem.getCardInfo(cardId);
            const isPurchased = this.shopState.purchasedCards.includes(cardId);
            
            // 卡片容器（位置取整）
            const cardContainer = this.scene.add.container(Math.round(roundedStartX + i * cardSpacing), 0);
            
            // 直接使用卡片图片作为主体
            const cardImage = this.scene.add.image(0, 0, card.image);
            // 使用0.4等比缩放，从320x400缩到128x160
            cardImage.setScale(0.4);
            
            // 卡片价格（金币icon + 数字，放在卡片下方）
            const priceContainer = this.scene.add.container(0, 90);
            const coinIcon = this.scene.add.image(-15, 0, 'coin_icon');
            coinIcon.setScale(0.4);
            const priceText = this.scene.add.text(5, 0, card.price.toString(), {
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#ffd700'
            }).setOrigin(0, 0.5);
            priceContainer.add([coinIcon, priceText]);
            
            // 组装卡片
            cardContainer.add([cardImage, priceContainer]);
            
            // 如果已购买，显示已购买文字并降低透明度
            if (isPurchased) {
                cardContainer.setAlpha(0.4);
                const purchasedText = this.scene.add.text(0, 0, '已购买', {
                    fontSize: '18px',
                    fontStyle: 'bold',
                    color: '#00ff00',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
                cardContainer.add(purchasedText);
            }
            
            // 保存引用
            cardContainer.cardIndex = i;
            cardContainer.isPurchased = isPurchased;
            this.cardContainers.push(cardContainer);
            
            // 添加到商店UI
            this.shopUI.add(cardContainer);
        }
        
        // 选中第一张未购买的卡片
        this.selectedIndex = 0;
        for (let i = 0; i < this.cardContainers.length; i++) {
            if (!this.cardContainers[i].isPurchased) {
                this.selectedIndex = i;
                break;
            }
        }
        
        this.updateSelection();
    }
    
    createRerollButton() {
        // 重随按钮容器（位置取整）
        const buttonContainer = this.scene.add.container(0, 130);
        
        // 直接使用重随按钮图片
        const buttonBg = this.scene.add.image(0, 0, 'reroll_button');
        // 使用0.3等比缩放，从320x160缩到96x48
        buttonBg.setScale(0.3);
        
        buttonContainer.add(buttonBg);
        
        // 如果已经重随过，禁用按钮
        if (this.shopState.rerollCount >= 1) {
            buttonBg.setTint(0x555555);
            buttonContainer.setAlpha(0.5);
            const disabledText = this.scene.add.text(0, 0, '已使用', {
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#ff9999',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            buttonContainer.add(disabledText);
        }
        
        this.rerollButton = buttonContainer;
        this.shopUI.add(buttonContainer);
    }
    
    setupShopInput() {
        // 创建输入键
        this.shopKeys = {
            left: this.scene.input.keyboard.addKey('A'),
            right: this.scene.input.keyboard.addKey('D'),
            up: this.scene.input.keyboard.addKey('W'),
            down: this.scene.input.keyboard.addKey('S'),
            confirm: this.scene.input.keyboard.addKey('J'),
            cancel: this.scene.input.keyboard.addKey('K')
        };
        
        // 监听按键事件
        this.shopKeys.left.on('down', () => this.navigateCard(-1));
        this.shopKeys.right.on('down', () => this.navigateCard(1));
        this.shopKeys.down.on('down', () => this.toggleRerollSelection(true));  // S键向下切到重随
        this.shopKeys.up.on('down', () => this.toggleRerollSelection(false));    // W键向上切回卡片
        this.shopKeys.confirm.on('down', () => this.confirmSelection());
        this.shopKeys.cancel.on('down', () => this.closeShop());
    }
    
    navigateCard(direction) {
        if (this.isSelectingReroll) {
            // 从重随按钮切换到卡片
            this.isSelectingReroll = false;
            this.selectedIndex = direction > 0 ? 0 : this.cardContainers.length - 1;
        } else {
            // 在卡片之间切换
            let newIndex = this.selectedIndex + direction;
            
            // 循环选择
            if (newIndex < 0) {
                newIndex = this.cardContainers.length - 1;
            } else if (newIndex >= this.cardContainers.length) {
                newIndex = 0;
            }
            
            // 跳过已购买的卡片
            let attempts = 0;
            while (this.cardContainers[newIndex].isPurchased && 
                   attempts < this.cardContainers.length) {
                newIndex += direction;
                if (newIndex < 0) {
                    newIndex = this.cardContainers.length - 1;
                } else if (newIndex >= this.cardContainers.length) {
                    newIndex = 0;
                }
                attempts++;
            }
            
            if (attempts < this.cardContainers.length) {
                this.selectedIndex = newIndex;
            }
        }
        
        this.updateSelection();
    }
    
    toggleRerollSelection(toReroll) {
        if (toReroll && !this.isSelectingReroll) {
            // S键向下切换到重随按钮
            if (this.shopState.rerollCount < 1) {
                this.isSelectingReroll = true;
                this.updateSelection();
            }
        } else if (!toReroll && this.isSelectingReroll) {
            // W键向上切换回卡片
            this.isSelectingReroll = false;
            this.updateSelection();
        }
    }
    
    updateSelection() {
        // 使用描边或色调代替缩放效果
        this.cardContainers.forEach((container, index) => {
            const cardImage = container.list[0]; // 获取卡片图片
            if (index === this.selectedIndex && !this.isSelectingReroll && 
                !container.isPurchased) {
                // 选中时使用高亮色调
                cardImage.setTint(0xffff88);
            } else {
                // 默认无色调
                cardImage.clearTint();
            }
        });
        
        // 重随按钮也使用色调代替缩放
        if (this.rerollButton) {
            const buttonBg = this.rerollButton.list[0];
            if (this.isSelectingReroll && this.shopState.rerollCount < 1) {
                buttonBg.setTint(0xffff88);
            } else if (this.shopState.rerollCount < 1) {
                buttonBg.clearTint();
            }
        }
    }
    
    confirmSelection() {
        if (this.isSelectingReroll) {
            // 执行重随
            if (this.shopState.rerollCount < 1) {
                const result = window.cardSystem.rerollShopCards(this.shopId, 10);
                
                if (result.success) {
                    // 刷新UI
                    this.refreshShopUI();
                } else {
                    // 显示错误信息
                    this.showMessage(result.message);
                }
            }
        } else {
            // 购买卡片
            const cardContainer = this.cardContainers[this.selectedIndex];
            if (!cardContainer.isPurchased) {
                const result = window.cardSystem.purchaseCard(this.shopId, this.selectedIndex);
                
                if (result.success) {
                    // 更新卡片状态
                    cardContainer.isPurchased = true;
                    
                    // 标记已购买
                    cardContainer.setAlpha(0.4);
                    const purchasedText = this.scene.add.text(0, 0, '已购买', {
                        fontSize: '18px',
                        fontStyle: 'bold',
                        color: '#00ff00',
                        stroke: '#000000',
                        strokeThickness: 3
                    }).setOrigin(0.5);
                    cardContainer.add(purchasedText);
                    
                    // 播放购买效果
                    this.showPurchaseEffect(cardContainer);
                    
                    // 刷新金币显示
                    this.updateCoinDisplay();
                    
                    // 选择下一张未购买的卡片
                    this.selectNextAvailableCard();
                } else {
                    // 显示错误信息
                    this.showMessage(result.message);
                }
            }
        }
    }
    
    selectNextAvailableCard() {
        // 查找下一张未购买的卡片
        for (let i = 0; i < this.cardContainers.length; i++) {
            if (!this.cardContainers[i].isPurchased) {
                this.selectedIndex = i;
                this.isSelectingReroll = false;
                this.updateSelection();
                return;
            }
        }
        
        // 如果所有卡片都已购买，选择重随按钮（如果可用）
        if (this.shopState.rerollCount < 1) {
            this.isSelectingReroll = true;
            this.updateSelection();
        }
    }
    
    showPurchaseEffect(cardContainer) {
        // 创建购买特效
        this.scene.tweens.add({
            targets: cardContainer,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0.5,
            duration: 300,
            yoyo: true,
            ease: 'Power2'
        });
    }
    
    showMessage(message) {
        // 创建消息文本
        const msgText = this.scene.add.text(0, -60, message, {
            fontSize: '16px',
            color: '#ff6b6b',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);
        
        this.shopUI.add(msgText);
        
        // 淡出动画
        this.scene.tweens.add({
            targets: msgText,
            alpha: 0,
            y: -80,
            duration: 1500,
            onComplete: () => {
                msgText.destroy();
            }
        });
    }
    
    updateCoinDisplay() {
        // 更新金币显示
        const coinText = this.shopUI.list.find(obj => 
            obj.type === 'Text' && obj.style.color === '#ffd700'
        );
        if (coinText) {
            coinText.setText(window.gameData.coins.toString());
        }
    }
    
    refreshShopUI() {
        // 销毁旧UI
        if (this.shopUI) {
            this.shopUI.destroy();
        }
        
        // 重新创建UI
        this.createShopUI();
    }
    
    closeShop() {
        if (!this.isOpen) {
            return;
        }
        
        this.isOpen = false;
        
        // 清理输入监听
        if (this.shopKeys) {
            Object.keys(this.shopKeys).forEach(key => {
                this.shopKeys[key].off('down');
                // 不要destroy按键，只移除监听器
            });
            this.shopKeys = null;
        }
        
        // 销毁UI
        if (this.shopUI) {
            this.shopUI.destroy();
            this.shopUI = null;
        }
        
        // 清空引用
        this.cardContainers = [];
        this.rerollButton = null;
        
        // 恢复游戏
        this.scene.physics.resume();
    }
}