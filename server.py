#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的HTTP服务器用于运行游戏
避免CORS问题
"""

import http.server
import json
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

# 设置默认端口，可通过命令行参数覆盖
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

# 获取当前目录
DIRECTORY = Path(__file__).parent
MAP_FILE = DIRECTORY / "map" / "map_full.tmj"
MAP_BACKUP_FILE = DIRECTORY / "map" / "map_full.tmj.bak"

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
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()
    
    def do_POST(self):
        if self.path != '/save-map':
            self.send_json_response(404, {'ok': False, 'error': 'Unknown endpoint'})
            return
        
        try:
            content_length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            self.send_json_response(400, {'ok': False, 'error': 'Invalid Content-Length'})
            return
        
        if content_length <= 0 or content_length > 8 * 1024 * 1024:
            self.send_json_response(400, {'ok': False, 'error': 'Invalid payload size'})
            return
        
        try:
            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body.decode('utf-8'))
            map_data = payload.get('map')
            target_path = payload.get('path')
            
            if target_path != 'map/map_full.tmj':
                self.send_json_response(400, {'ok': False, 'error': 'Only map/map_full.tmj can be saved'})
                return
            
            self.validate_map_data(map_data)
            
            if MAP_FILE.exists():
                MAP_BACKUP_FILE.write_text(MAP_FILE.read_text(encoding='utf-8'), encoding='utf-8')
            
            tmp_file = MAP_FILE.with_suffix('.tmj.tmp')
            tmp_file.write_text(
                json.dumps(map_data, ensure_ascii=False, indent=1) + '\n',
                encoding='utf-8'
            )
            tmp_file.replace(MAP_FILE)
            
            self.send_json_response(200, {
                'ok': True,
                'path': 'map/map_full.tmj',
                'backup': 'map/map_full.tmj.bak'
            })
        except ValueError as error:
            self.send_json_response(400, {'ok': False, 'error': str(error)})
        except Exception as error:
            self.send_json_response(500, {'ok': False, 'error': str(error)})
    
    def validate_map_data(self, map_data):
        if not isinstance(map_data, dict):
            raise ValueError('Map payload must be an object')
        
        width = map_data.get('width')
        height = map_data.get('height')
        layers = map_data.get('layers')
        
        if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
            raise ValueError('Map width and height must be positive integers')
        
        if not isinstance(layers, list):
            raise ValueError('Map layers must be an array')
        
        expected_tile_count = width * height
        for layer in layers:
            if not isinstance(layer, dict):
                raise ValueError('Each layer must be an object')
            
            if layer.get('type') == 'tilelayer':
                data = layer.get('data')
                if not isinstance(data, list) or len(data) != expected_tile_count:
                    raise ValueError(f"Tile layer '{layer.get('name', '')}' has invalid data length")
                
                if any((not isinstance(gid, int) or gid < 0) for gid in data):
                    raise ValueError(f"Tile layer '{layer.get('name', '')}' contains invalid tile ids")
    
    def send_json_response(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class ThreadingHTTPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

def run_server():
    # 尝试不同的端口
    ports_to_try = [PORT, 8080, 8888, 3000, 5000]
    httpd = None
    actual_port = None
    
    for port in ports_to_try:
        try:
            httpd = ThreadingHTTPServer(("", port), MyHTTPRequestHandler)
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
