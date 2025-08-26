class Shop extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'shop');
        
        this.scene = scene;
        this.name = 'shop';
        this.interactionRadius = 50;
        
        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // 静态物体
        
        // 根据需求设置尺寸
        const targetWidth = GameConfig.DECORATION_SIZES[326].width;
        const targetHeight = GameConfig.DECORATION_SIZES[326].height;
        const scaleX = targetWidth / this.width;
        const scaleY = targetHeight / this.height;
        this.setScale(scaleX, scaleY);
        
        // 设置碰撞盒（仅底部）
        this.body.setSize(targetWidth * 0.8, 20);
        this.body.setOffset(targetWidth * 0.1, targetHeight - 20);
        
        // 交互提示
        this.interactionHint = null;
        
        // 商店UI
        this.shopUI = null;
        this.isOpen = false;
        
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
        
        // 创建商店UI
        this.createShopUI();
    }
    
    createShopUI() {
        const { width, height } = this.scene.cameras.main;
        
        // 创建UI容器
        this.shopUI = this.scene.add.container(width / 2, height / 2);
        this.shopUI.setDepth(200);
        
        // 半透明背景
        const backdrop = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        backdrop.setOrigin(0.5);
        backdrop.setInteractive(); // 阻止点击穿透
        
        // 商店窗口
        const window = this.scene.add.rectangle(0, 0, 300, 200, 0x2c3e50);
        window.setStrokeStyle(3, 0xecf0f1);
        
        // 标题
        const title = this.scene.add.text(0, -80, '神秘商店', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 商品容器
        const itemContainer = this.scene.add.container(0, 0);
        
        // 生命药水
        this.createShopItem(itemContainer, 0, -20);
        
        // 关闭按钮
        const closeButton = this.scene.add.text(120, -80, 'X', {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.closeShop());
        
        // 说明文字
        const helpText = this.scene.add.text(0, 80, '按ESC关闭商店', {
            fontSize: '12px',
            color: '#cccccc'
        }).setOrigin(0.5);
        
        // 添加到容器
        this.shopUI.add([backdrop, window, title, itemContainer, closeButton, helpText]);
        
        // ESC键关闭
        const escKey = this.scene.input.keyboard.addKey('ESC');
        escKey.once('down', () => this.closeShop());
    }
    
    createShopItem(container, x, y) {
        const player = this.scene.player;
        
        // 物品背景
        const itemBg = this.scene.add.rectangle(x, y, 250, 60, 0x34495e);
        itemBg.setStrokeStyle(1, 0x7f8c8d);
        
        // 心心图标
        const icon = this.scene.add.image(x - 100, y, 'heart_icon');
        icon.setScale(1.5);
        
        // 物品名称
        const name = this.scene.add.text(x - 50, y - 10, '生命药水', {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        
        // 物品效果
        const effect = this.scene.add.text(x - 50, y + 10, `恢复 ${GameConfig.SHOP.POTION_HEAL} HP`, {
            fontSize: '12px',
            color: '#95a5a6'
        }).setOrigin(0, 0.5);
        
        // 当前HP显示
        const hpText = this.scene.add.text(x + 30, y, 
            `HP: ${player.currentHP}/${player.maxHP}`, {
            fontSize: '12px',
            color: player.currentHP < player.maxHP ? '#e74c3c' : '#2ecc71'
        }).setOrigin(0, 0.5);
        
        // 购买按钮
        const canBuy = window.gameData.coins >= GameConfig.SHOP.POTION_PRICE && 
                      player.currentHP < player.maxHP;
        
        const buyButton = this.scene.add.rectangle(x + 90, y, 60, 30, 
            canBuy ? 0x27ae60 : 0x95a5a6
        );
        buyButton.setStrokeStyle(1, canBuy ? 0x2ecc71 : 0x7f8c8d);
        
        const priceText = this.scene.add.text(x + 90, y, 
            `${GameConfig.SHOP.POTION_PRICE}金币`, {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        if (canBuy) {
            buyButton.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.buyPotion())
            .on('pointerover', () => buyButton.setFillStyle(0x2ecc71))
            .on('pointerout', () => buyButton.setFillStyle(0x27ae60));
        }
        
        // 提示信息
        let tipText = null;
        if (player.currentHP >= player.maxHP) {
            tipText = this.scene.add.text(x, y + 35, '生命值已满', {
                fontSize: '10px',
                color: '#e74c3c'
            }).setOrigin(0.5);
        } else if (window.gameData.coins < GameConfig.SHOP.POTION_PRICE) {
            tipText = this.scene.add.text(x, y + 35, '金币不足', {
                fontSize: '10px',
                color: '#e74c3c'
            }).setOrigin(0.5);
        }
        
        // 添加到容器
        const elements = [itemBg, icon, name, effect, hpText, buyButton, priceText];
        if (tipText) elements.push(tipText);
        container.add(elements);
    }
    
    buyPotion() {
        const player = this.scene.player;
        
        // 检查购买条件
        if (window.gameData.coins < GameConfig.SHOP.POTION_PRICE || 
            player.currentHP >= player.maxHP) {
            return;
        }
        
        // 扣除金币
        window.gameData.coins -= GameConfig.SHOP.POTION_PRICE;
        
        // 恢复生命
        player.heal(GameConfig.SHOP.POTION_HEAL);
        
        // 播放购买成功动画
        this.showPurchaseEffect();
        
        // 触发购买事件
        this.scene.events.emit('shopPurchase', {
            item: 'potion',
            price: GameConfig.SHOP.POTION_PRICE
        });
        
        // 刷新商店UI
        this.refreshShopUI();
    }
    
    showPurchaseEffect() {
        // 创建心心上浮效果
        const heart = this.scene.add.image(
            this.shopUI.x,
            this.shopUI.y,
            'heart_icon'
        );
        heart.setDepth(201);
        
        this.scene.tweens.add({
            targets: heart,
            y: heart.y - 50,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                heart.destroy();
            }
        });
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
        
        // 销毁UI
        if (this.shopUI) {
            this.shopUI.destroy();
            this.shopUI = null;
        }
        
        // 恢复游戏
        this.scene.physics.resume();
    }
}