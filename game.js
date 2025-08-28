// 游戏主配置和启动文件
class Game {
    constructor() {
        this.config = {
            type: Phaser.AUTO,
            parent: 'game-container',
            width: GameConfig.GAME_WIDTH,
            height: GameConfig.GAME_HEIGHT,
            pixelArt: true,
            roundPixels: true,  // 开启像素对齐
            fps: {
                target: 60,    // 目标帧率60fps
                forceSetTimeOut: false  // 使用requestAnimationFrame而不是setTimeout
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: GameConfig.GRAVITY },
                    debug: true  // 开启debug模式查看碰撞体
                }
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: GameConfig.GAME_WIDTH,
                height: GameConfig.GAME_HEIGHT
            },
            scene: [PreloadScene, MenuScene, GameScene, GameOverScene]
        };
        
        this.game = new Phaser.Game(this.config);
        
        // 游戏全局数据（会话内）
        this.gameData = {
            coins: 0,
            playerHP: GameConfig.PLAYER_MAX_HP,
            playerSP: GameConfig.PLAYER_MAX_SP,
            deathCount: 0,
            startTime: 0,
            chestsOpened: [],
            enemiesKilled: 0,
            bossDefeated: false,
            buffs: {} // 初始化buff存储
        };
        
        // 将游戏数据挂载到全局
        window.gameData = this.gameData;
        
        // 确保CardSystem初始化（如果还没有的话）
        if (!window.cardSystem && typeof CardSystem !== 'undefined') {
            window.cardSystem = new CardSystem();
        }
    }
    
    resetGameData() {
        this.gameData.coins = 0;
        this.gameData.playerHP = GameConfig.PLAYER_MAX_HP;
        this.gameData.playerSP = GameConfig.PLAYER_MAX_SP;
        this.gameData.deathCount = 0;
        this.gameData.startTime = Date.now();
        this.gameData.chestsOpened = [];
        this.gameData.enemiesKilled = 0;
        this.gameData.bossDefeated = false;
        this.gameData.buffs = {}; // 重置buff
        
        // 重置卡片商店
        if (window.cardSystem) {
            window.cardSystem.resetAllShops();
        }
    }
}

// 启动游戏
window.addEventListener('load', () => {
    window.mysteriousForest = new Game();
});