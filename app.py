from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from datetime import datetime, timedelta
from collections import defaultdict
import os
import subprocess
import tempfile
import time

app = Flask(__name__)
CORS(app)

# Получаем переменные окружения
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
CHANNEL_ID = os.getenv('CHANNEL_ID')
EXPORT_INTERVAL = int(os.getenv('EXPORT_INTERVAL', '3600'))  # Интервал обновления в секундах (по умолчанию 1 час)

# Путь к временному файлу с данными
TEMP_DATA_FILE = 'discord_export.json'
last_export_time = 0

def download_discord_chat_exporter():
    """Загружает Discord Chat Exporter если его нет"""
    if not os.path.exists('DiscordChatExporter.CLI'):
        print("Downloading Discord Chat Exporter...")
        subprocess.run([
            'wget', 
            'https://github.com/Tyrrrz/DiscordChatExporter/releases/download/2.44/DiscordChatExporter.Cli.linux-x64.zip'
        ])
        subprocess.run(['unzip', 'DiscordChatExporter.CLI.linux.x64.zip', '-d', 'DiscordChatExporter.CLI'])
        subprocess.run(['chmod', '+x', 'DiscordChatExporter.CLI/DiscordChatExporter.Cli'])

def export_discord_data():
    """Экспортирует данные из Discord используя переменные окружения"""
    global last_export_time
    
    # Проверяем, нужно ли обновлять данные
    current_time = time.time()
    if current_time - last_export_time < EXPORT_INTERVAL and os.path.exists(TEMP_DATA_FILE):
        return
    
    try:
        # Проверяем наличие Discord Chat Exporter
        download_discord_chat_exporter()
        
        # Запускаем экспорт
        print("Exporting Discord data...")
        result = subprocess.run([
            './DiscordChatExporter.CLI/DiscordChatExporter.Cli',
            'export',
            '-t', DISCORD_TOKEN,
            '-c', CHANNEL_ID,
            '-f', 'Json',
            '-o', TEMP_DATA_FILE
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Error during export: {result.stderr}")
            raise Exception(f"Discord export failed: {result.stderr}")
        
        last_export_time = current_time
        print("Export completed successfully")
        
    except Exception as e:
        print(f"Error during export: {str(e)}")
        raise

def load_discord_data():
    """Загрузка данных из экспортированного JSON файла"""
    # Сначала экспортируем свежие данные
    export_discord_data()
    
    # Затем читаем файл
    with open(TEMP_DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# ... [весь остальной код process_messages и другие функции остаются без изменений] ...

@app.route('/stats')
def get_stats():
    try:
        if not DISCORD_TOKEN or not CHANNEL_ID:
            return jsonify({
                'error': 'Discord token or channel ID not configured. '
                        'Please set DISCORD_TOKEN and CHANNEL_ID environment variables.'
            }), 500
            
        period = request.args.get('period', 'day')
        data = load_discord_data()
        stats = process_messages(data, period)
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    """Эндпоинт для проверки работоспособности сервиса"""
    return jsonify({
        'status': 'healthy',
        'last_export': datetime.fromtimestamp(last_export_time).isoformat() if last_export_time > 0 else None,
        'discord_token': bool(DISCORD_TOKEN),
        'channel_id': bool(CHANNEL_ID)
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
