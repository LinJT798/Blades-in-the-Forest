#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的HTTP服务器用于运行游戏
避免CORS问题
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

# 设置默认端口，可通过命令行参数覆盖
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

# 获取当前目录
DIRECTORY = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # 添加CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def guess_type(self, path):
        # 确保正确的MIME类型
        mimetype = super().guess_type(path)
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.json'):
            return 'application/json'
        elif path.endswith('.tmj'):
            return 'application/json'
        return mimetype

def run_server():
    # 尝试不同的端口
    ports_to_try = [PORT, 8080, 8888, 3000, 5000]
    httpd = None
    actual_port = None
    
    for port in ports_to_try:
        try:
            httpd = socketserver.TCPServer(("", port), MyHTTPRequestHandler)
            actual_port = port
            break
        except OSError as e:
            if port == ports_to_try[-1]:
                print(f"❌ 错误：所有常用端口都被占用")
                print(f"请手动指定端口：python3 server.py <端口号>")
                print(f"例如：python3 server.py 9000")
                return
            continue
    
    if httpd and actual_port:
        print(f"========================================")
        print(f"  🎮 神秘森林游戏服务器已启动")
        print(f"========================================")
        print(f"  访问地址: http://localhost:{actual_port}")
        print(f"  按 Ctrl+C 停止服务器")
        print(f"========================================\n")
        
        # 自动打开浏览器
        webbrowser.open(f'http://localhost:{actual_port}')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")
            httpd.shutdown()
            return

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    run_server()