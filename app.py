from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from datetime import datetime, timedelta
from collections import defaultdict
import os

app = Flask(__name__)
CORS(app)  # Включаем CORS для разработки

def load_discord_data():
    """Загрузка данных из экспортированного JSON файла"""
    with open('discord_export.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def get_period_start(period):
    """Получение начальной даты для указанного периода"""
    now = datetime.now()
    if period == 'day':
        return now - timedelta(days=1)
    elif period == 'week':
        return now - timedelta(days=7)
    elif period == 'month':
        return now - timedelta(days=30)
    return now - timedelta(days=30)  # По умолчанию месяц

def process_messages(data, period='day'):
    """Обработка сообщений и подготовка статистики"""
    period_start = get_period_start(period)
    now = datetime.now()
    today = now.date()
    
    # Счетчики
    total_messages = 0
    today_messages = 0
    active_users = set()
    user_messages = defaultdict(int)
    daily_activity = defaultdict(int)
    
    for message in data['messages']:
        # Пропускаем сообщения от ботов
        if message.get('author', {}).get('isBot', False):
            continue
            
        timestamp = datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
        user_id = message['author']['id']
        message_date = timestamp.date()
        
        # Общая статистика
        total_messages += 1
        user_messages[user_id] += 1
        active_users.add(user_id)
        
        # Статистика за сегодня
        if message_date == today:
            today_messages += 1
        
        # Статистика активности за период
        if timestamp >= period_start:
            daily_activity[message_date.isoformat()] += 1
    
    # Формируем топ пользователей
    top_users = []
    for user_id, count in sorted(user_messages.items(), key=lambda x: x[1], reverse=True)[:10]:
        user_info = next((u for u in data.get('users', []) if u['id'] == user_id), None)
        if user_info:
            top_users.append({
                'username': user_info.get('name', 'Unknown User'),
                'message_count': count
            })
    
    # Формируем данные активности
    activity_data = []
    current_date = period_start.date()
    while current_date <= now.date():
        activity_data.append({
            'date': current_date.isoformat(),
            'count': daily_activity.get(current_date.isoformat(), 0)
        })
        current_date += timedelta(days=1)
    
    return {
        'total_messages': total_messages,
        'today_messages': today_messages,
        'active_users': len(active_users),
        'top_users': top_users,
        'activity': activity_data
    }

@app.route('/stats')
def get_stats():
    try:
        period = request.args.get('period', 'day')
        data = load_discord_data()
        stats = process_messages(data, period)
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
