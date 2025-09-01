// 教学系统配置
const TutorialConfig = {
    // 出生点教学
    SPAWN_TUTORIAL: {
        x: 58,          // 触发位置
        y: 233,
        width: 100,     // 触发区域
        height: 100,
        messages: [
            {
                text: "欢迎来到Blades in the Forest",
                delay: 1000,
                duration: 3000
            },
            {
                text: "使用 A/D 移动，空格跳跃",
                delay: 4500,
                duration: 3000
            },
            {
                text: "按住 Shift 可以加速奔跑",
                delay: 8000,
                duration: 3000
            },
            {
                text: "奔跑、跳跃都会消耗精力",
                delay: 11000,
                duration: 3000
            }
        ]
    },
    
    // 攻击教学
    ATTACK_TUTORIAL: {
        x: 400,         // 第一只史莱姆附近
        y: 233,
        width: 150,
        height: 100,
        messages: [
            {
                text: "前方有敌人！",
                delay: 0,
                duration: 2000
            },
            {
                text: "按 J 键进行攻击",
                delay: 2500,
                duration: 3000
            },
            {
                text: "攻击时注意时机，可以打出连击",
                delay: 6000,
                duration: 3000
            },
            {
                text: "按 K 键可以防御，减少受到的伤害",
                delay: 9000,
                duration: 3000
            },
            {
                text: "防御、攻击都要消耗精力",
                delay: 12000,
                duration: 3000
            }
        ]
    },
    
    // 爬墙教学
    WALL_CLIMB_TUTORIAL: {
        x: 1800,        // 爬墙区域
        y: 150,
        width: 100,
        height: 150,
        messages: [
            {
                text: "这里可以爬墙",
                delay: 0,
                duration: 2000
            },
            {
                text: "跳到墙壁上后,可以挂在墙上",
                delay: 2500,
                duration: 3000
            },
            {
                text: "爬墙时按空格和方向键可以进行墙跳",
                delay: 6000,
                duration: 3000
            }
        ]
    },
    
    // 通用配置
    TEXT_STYLE: {
        fontSize: '20px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
    },
    
    // 是否只触发一次
    TRIGGER_ONCE: true,
    
    // 文字显示位置（相对于屏幕）
    DISPLAY_POSITION: {
        x: 0.5,  // 屏幕中心
        y: 0.3   // 上方30%位置
    }
};