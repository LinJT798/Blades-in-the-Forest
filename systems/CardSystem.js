class CardSystem {
    constructor() {
        // 卡片定义
        this.cards = {
            heal_instant: {
                id: 'heal_instant',
                name: '生命恢复',
                description: '立即恢复50点生命值',
                price: 5,
                image: 'card_heal',
                effect: (player) => {
                    player.heal(50);
                    return true;
                }
            },
            defense_up: {
                id: 'defense_up',
                name: '防御强化',
                description: '防御减伤提高10%',
                price: 7,
                image: 'card_defense',
                effect: (player) => {
                    // 将减伤从70%提高到80%
                    if (!window.gameData.buffs) {
                        window.gameData.buffs = {};
                    }
                    window.gameData.buffs.defenseBonus = (window.gameData.buffs.defenseBonus || 0) + 0.1;
                    return true;
                }
            },
            energy_regen: {
                id: 'energy_regen',
                name: '精力涌动',
                description: '精力回复速度提升50%',
                price: 7,
                image: 'card_energy',
                effect: (player) => {
                    if (!window.gameData.buffs) {
                        window.gameData.buffs = {};
                    }
                    window.gameData.buffs.energyRegenBonus = (window.gameData.buffs.energyRegenBonus || 0) + 0.5;
                    return true;
                }
            },
            lifesteal: {
                id: 'lifesteal',
                name: '吸血攻击',
                description: '攻击时回复造成伤害的20%生命值',
                price: 8,
                image: 'card_lifesteal',
                effect: (player) => {
                    if (!window.gameData.buffs) {
                        window.gameData.buffs = {};
                    }
                    window.gameData.buffs.lifesteal = (window.gameData.buffs.lifesteal || 0) + 0.1;
                    return true;
                }
            },
            regen_idle: {
                id: 'regen_idle',
                name: '静息回复',
                description: '静止时每秒回复2点生命值',
                price: 10,
                image: 'card_regen',
                effect: (player) => {
                    if (!window.gameData.buffs) {
                        window.gameData.buffs = {};
                    }
                    window.gameData.buffs.idleRegen = (window.gameData.buffs.idleRegen || 0) + 2;
                    return true;
                }
            }
        };
        
        // 商店状态存储（每个商店的卡片和重随次数）
        this.shopStates = {};
    }
    
    // 获取指定商店的卡片（如果没有则生成）
    getShopCards(shopId) {
        if (!this.shopStates[shopId]) {
            this.shopStates[shopId] = {
                cards: this.generateRandomCards(3),
                rerollCount: 0,
                purchasedCards: []
            };
        }
        return this.shopStates[shopId];
    }
    
    // 生成随机卡片
    generateRandomCards(count) {
        const allCardIds = Object.keys(this.cards);
        const selectedCards = [];
        const availableIds = [...allCardIds];
        
        for (let i = 0; i < Math.min(count, availableIds.length); i++) {
            const randomIndex = Math.floor(Math.random() * availableIds.length);
            const cardId = availableIds.splice(randomIndex, 1)[0];
            selectedCards.push(cardId);
        }
        
        return selectedCards;
    }
    
    // 重随商店卡片
    rerollShopCards(shopId, cost) {
        const shopState = this.getShopCards(shopId);
        
        // 检查是否可以重随
        if (shopState.rerollCount >= 1) {
            return { success: false, message: '该商店已经重随过了' };
        }
        
        // 检查玩家生命值是否足够
        const player = window.gameData.currentPlayer;
        if (!player || player.currentHP <= cost) {
            return { success: false, message: '生命值不足' };
        }
        
        // 扣除生命值
        player.takeDamage(cost);
        
        // 生成新的卡片（排除已购买的）
        const availableCards = Object.keys(this.cards).filter(
            cardId => !shopState.purchasedCards.includes(cardId)
        );
        
        // 随机选择最多3张（如果可用卡片不足3张，就显示所有可用的）
        const newCards = [];
        const tempAvailable = [...availableCards];
        const cardCount = Math.min(3, tempAvailable.length);
        for (let i = 0; i < cardCount; i++) {
            const randomIndex = Math.floor(Math.random() * tempAvailable.length);
            newCards.push(tempAvailable.splice(randomIndex, 1)[0]);
        }
        
        shopState.cards = newCards;
        shopState.rerollCount++;
        
        return { success: true, cards: newCards };
    }
    
    // 购买卡片
    purchaseCard(shopId, cardIndex) {
        const shopState = this.getShopCards(shopId);
        
        if (cardIndex < 0 || cardIndex >= shopState.cards.length) {
            return { success: false, message: '无效的卡片索引' };
        }
        
        const cardId = shopState.cards[cardIndex];
        
        // 检查是否已购买
        if (shopState.purchasedCards.includes(cardId)) {
            return { success: false, message: '该卡片已购买' };
        }
        
        const card = this.cards[cardId];
        
        // 检查金币是否足够
        if (window.gameData.coins < card.price) {
            return { success: false, message: '金币不足' };
        }
        
        // 扣除金币
        window.gameData.coins -= card.price;
        
        // 应用卡片效果
        const player = window.gameData.currentPlayer;
        if (player && card.effect) {
            card.effect(player);
        }
        
        // 标记为已购买
        shopState.purchasedCards.push(cardId);
        
        return { success: true, card: card };
    }
    
    // 获取卡片信息
    getCardInfo(cardId) {
        return this.cards[cardId];
    }
    
    // 重置所有商店状态（用于新游戏）
    resetAllShops() {
        this.shopStates = {};
    }
}

// 创建单例实例
if (typeof window !== 'undefined') {
    if (!window.cardSystem) {
        window.cardSystem = new CardSystem();
    }
}