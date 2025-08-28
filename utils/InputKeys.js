// 输入按键配置
const InputKeys = {
    LEFT: 'A',
    RIGHT: 'D',
    UP: 'W',
    DOWN: 'S',
    JUMP: 'SPACE',
    ATTACK: 'J',
    DEFENSE: 'K',
    RUN: 'SHIFT'
};

// 导出为全局变量
if (typeof window !== 'undefined') {
    window.InputKeys = InputKeys;
}