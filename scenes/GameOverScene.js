class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
        this.particles = [];
    }
    
    create() {
        const { width, height } = this.cameras.main;
        
        // 获取游戏数据
        const gameData = window.gameData || {};
        
        // 计算通关时间
        const playTime = gameData.startTime ? 
            Math.floor((Date.now() - gameData.startTime) / 1000) : 0;
        const minutes = Math.floor(playTime / 60);
        const seconds = playTime % 60;
        
        // 背景
        this.createBackground();
        
        // 创建胜利特效
        this.createVictoryEffects();
        
        // 标题
        const title = this.add.text(width / 2, 60, '森林已恢复！', {
            fontSize: '42px',
            fontStyle: 'bold',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // 添加发光效果
        this.tweens.add({
            targets: title,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // 副标题
        const subtitle = this.add.text(width / 2, 100, '恭喜你拯救了神秘森林！', {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // 创建统计面板
        this.createStatsPanel(width / 2, height / 2, {
            time: `${minutes}分${seconds}秒`,
            coins: gameData.coins || 0,
            deaths: gameData.deathCount || 0,
            enemies: gameData.enemiesKilled || 0
        });
        
        // 创建按钮
        this.createButtons(width / 2, height - 60);
        
        // 播放胜利音乐（如果有）
        // this.sound.play('victory_music');
    }
    
    createBackground() {
        // 创建渐变背景
        const { width, height } = this.cameras.main;
        
        // 天空渐变
        const graphics = this.add.graphics();
        
        // 从深蓝到浅蓝的渐变
        const colors = [0x001a33, 0x003366, 0x0066cc, 0x3399ff];
        const alphas = [1, 1, 0.8, 0.6];
        
        for (let i = 0; i < 4; i++) {
            graphics.fillStyle(colors[i], alphas[i]);
            graphics.fillRect(0, i * height / 4, width, height / 4);
        }
        
        // 添加闪烁的星星
        for (let i = 0; i < 20; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height / 2),
                Phaser.Math.Between(1, 3),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 0.8)
            );
            
            this.tweens.add({
                targets: star,
                alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.1, 0.3) },
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
        }
        
        // 添加恢复的森林剪影
        const forestY = height - 100;
        for (let i = 0; i < 5; i++) {
            const treeX = (width / 5) * i + (width / 10);
            const treeHeight = Phaser.Math.Between(80, 120);
            
            // 树干
            graphics.fillStyle(0x4a4a4a, 1);
            graphics.fillRect(treeX - 5, forestY, 10, treeHeight);
            
            // 树叶（绿色，表示森林恢复）
            graphics.fillStyle(0x00ff00, 0.8);
            graphics.fillCircle(treeX, forestY, treeHeight / 2);
            graphics.fillCircle(treeX - treeHeight / 3, forestY + 20, treeHeight / 3);
            graphics.fillCircle(treeX + treeHeight / 3, forestY + 20, treeHeight / 3);
        }
    }
    
    createVictoryEffects() {
        const { width, height } = this.cameras.main;
        
        // 创建飘落的树叶特效
        for (let i = 0; i < 10; i++) {
            const leaf = this.add.rectangle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(-50, 0),
                8, 6,
                0x00ff00
            );
            leaf.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
            
            this.tweens.add({
                targets: leaf,
                y: height + 50,
                x: leaf.x + Phaser.Math.Between(-50, 50),
                rotation: leaf.rotation + Math.PI * 4,
                duration: Phaser.Math.Between(5000, 8000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 3000),
                ease: 'Sine.easeIn'
            });
            
            this.particles.push(leaf);
        }
        
        // 创建光芒特效
        const light = this.add.circle(width / 2, 60, 100, 0xffff00, 0.2);
        this.tweens.add({
            targets: light,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 2000,
            repeat: -1,
            ease: 'Power2'
        });
    }
    
    createStatsPanel(x, y, stats) {
        // 面板容器
        const panel = this.add.container(x, y);
        
        // 面板背景
        const bg = this.add.rectangle(0, 0, 350, 200, 0x000000, 0.7);
        bg.setStrokeStyle(3, 0x00ff00);
        
        // 统计标题
        const statsTitle = this.add.text(0, -70, '冒险统计', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 统计项
        const statItems = [
            { icon: '⏱', label: '通关时间', value: stats.time },
            { icon: '💰', label: '收集金币', value: stats.coins },
            { icon: '💀', label: '死亡次数', value: stats.deaths },
            { icon: '⚔️', label: '击败敌人', value: stats.enemies }
        ];
        
        const itemsContainer = this.add.container(0, 0);
        
        statItems.forEach((item, index) => {
            const y = -25 + index * 30;
            
            // 图标
            const icon = this.add.text(-140, y, item.icon, {
                fontSize: '20px'
            }).setOrigin(0, 0.5);
            
            // 标签
            const label = this.add.text(-110, y, item.label, {
                fontSize: '16px',
                color: '#cccccc'
            }).setOrigin(0, 0.5);
            
            // 值
            const value = this.add.text(140, y, item.value.toString(), {
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#00ff00'
            }).setOrigin(1, 0.5);
            
            itemsContainer.add([icon, label, value]);
        });
        
        // 评级
        const rating = this.calculateRating(stats);
        const ratingText = this.add.text(0, 75, `评级: ${rating}`, {
            fontSize: '20px',
            fontStyle: 'bold',
            color: this.getRatingColor(rating)
        }).setOrigin(0.5);
        
        // 添加闪烁效果
        this.tweens.add({
            targets: ratingText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        panel.add([bg, statsTitle, itemsContainer, ratingText]);
        
        // 面板入场动画
        panel.setScale(0);
        this.tweens.add({
            targets: panel,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.out',
            delay: 500
        });
    }
    
    calculateRating(stats) {
        let score = 100;
        
        // 时间评分（10分钟内满分）
        const time = parseInt(stats.time);
        if (time > 600) score -= Math.min(30, (time - 600) / 20);
        
        // 死亡评分（无死亡满分）
        score -= Math.min(30, stats.deaths * 10);
        
        // 金币评分（收集越多越好）
        score += Math.min(20, stats.coins / 5);
        
        // 击杀评分
        score += Math.min(20, stats.enemies / 2);
        
        // 返回评级
        if (score >= 90) return 'S';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        return 'D';
    }
    
    getRatingColor(rating) {
        switch(rating) {
            case 'S': return '#ff00ff'; // 紫色
            case 'A': return '#ffd700'; // 金色
            case 'B': return '#00ff00'; // 绿色
            case 'C': return '#0080ff'; // 蓝色
            case 'D': return '#808080'; // 灰色
            default: return '#ffffff';
        }
    }
    
    createButtons(x, y) {
        // 返回主菜单按钮
        const menuButton = this.createButton(
            x - 80, y,
            '返回主菜单',
            () => {
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('MenuScene');
                });
            }
        );
        
        // 重新开始按钮
        const restartButton = this.createButton(
            x + 80, y,
            '重新开始',
            () => {
                // 重置游戏数据
                if (window.mysteriousForest) {
                    window.mysteriousForest.resetGameData();
                }
                
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('GameScene');
                });
            }
        );
    }
    
    createButton(x, y, text, callback) {
        // 创建按钮背景
        const buttonBg = this.add.rectangle(x, y, 150, 40, 0x27ae60);
        buttonBg.setInteractive({ useHandCursor: true });
        buttonBg.setStrokeStyle(2, 0x2ecc71);
        
        // 创建按钮文字
        const buttonText = this.add.text(x, y, text, {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // 鼠标悬停效果
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x2ecc71);
            buttonBg.setScale(1.05);
            buttonText.setScale(1.05);
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x27ae60);
            buttonBg.setScale(1);
            buttonText.setScale(1);
        });
        
        // 点击事件
        buttonBg.on('pointerdown', () => {
            buttonBg.setScale(0.95);
            buttonText.setScale(0.95);
        });
        
        buttonBg.on('pointerup', () => {
            buttonBg.setScale(1);
            buttonText.setScale(1);
            if (callback) callback();
        });
        
        // 按钮入场动画
        buttonBg.setAlpha(0);
        buttonText.setAlpha(0);
        
        this.tweens.add({
            targets: [buttonBg, buttonText],
            alpha: 1,
            y: y - 10,
            duration: 500,
            ease: 'Power2',
            delay: 1000
        });
        
        return { bg: buttonBg, text: buttonText };
    }
    
    update() {
        // 更新粒子效果等
    }
}