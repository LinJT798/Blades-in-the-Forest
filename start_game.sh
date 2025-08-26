#!/bin/bash
# 启动游戏的脚本

echo "🎮 启动神秘森林游戏..."
echo "=================================="

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3，请先安装Python3"
    exit 1
fi

# 运行服务器
python3 server.py