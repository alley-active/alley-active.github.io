from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import json
import sqlite3
import subprocess
import os
from typing import List, Dict
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфигурация
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")
DB_PATH = "discord_stats.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY,
            user_id TEXT,
            username TEXT,
            content TEXT,
            timestamp DATETIME,
            is_bot BOOLEAN
        )
    ''')
    conn.commit()
    conn.close()

async def export_discord_chat():
    try:
        # Запуск DiscordChatExporter
        process = await asyncio.create_subprocess_exec(
            './DiscordChatExporter.Cli',
            'export',
            '-t', DISCORD_TOKEN,
            '-c', CHANNEL_ID,
            '-f', 'Json',
            '-o', 'temp_export.json'
        )
        await process.communicate()
        
        # Чтение и парсинг экспортированных данных
        with open('temp_export.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Сохранение в БД
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        for message in data['messages']:
            c.execute('''
                INSERT OR IGNORE INTO messages 
                (id, user_id, username, content, timestamp, is_bot)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                message['id'],
                message['author']['id'],
                message['author']['name'],
                message['content'],
                message['timestamp'],
                message['author'].get('isBot', False)
            ))
        
        conn.commit()
        conn.close()
        
        # Удаление временного файла
        os.remove('temp_export.json')
        
    except Exception as e:
        print(f"Error during export: {e}")

@app.get("/stats")
async def get_stats(period: str = "day"):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    now = datetime.now()
    
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(weeks=1)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    # Получение общей статистики
    c.execute("""
        SELECT COUNT(*) FROM messages WHERE is_bot = 0
    """)
    total_messages = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(DISTINCT user_id) FROM messages 
        WHERE is_bot = 0 AND timestamp >= datetime('now', '-30 days')
    """)
    active_users = c.fetchone()[0]
    
    c.execute("""
        SELECT COUNT(*) FROM messages 
        WHERE is_bot = 0 AND timestamp >= datetime('now', 'start of day')
    """)
    today_messages = c.fetchone()[0]
    
    # Получение топ пользователей
    c.execute("""
        SELECT username, COUNT(*) as count
        FROM messages
        WHERE is_bot = 0 AND timestamp >= ?
        GROUP BY username
        ORDER BY count DESC
        LIMIT 10
    """, (start_date.isoformat(),))
    
    top_users = [{"username": row[0], "message_count": row[1]} for row in c.fetchall()]
    
    # Получение активности по дням
    c.execute("""
        SELECT date(timestamp) as date, COUNT(*) as count
        FROM messages
        WHERE is_bot = 0 AND timestamp >= ?
        GROUP BY date(timestamp)
        ORDER BY date
    """, (start_date.isoformat(),))
    
    activity = [{"date": row[0], "count": row[1]} for row in c.fetchall()]
    
    conn.close()
    
    return {
        "total_messages": total_messages,
        "active_users": active_users,
        "today_messages": today_messages,
        "top_users": top_users,
        "activity": activity
    }

# Настройка планировщика для регулярного обновления данных
scheduler = AsyncIOScheduler()
scheduler.add_job(export_discord_chat, 'interval', minutes=30)
scheduler.start()

# Инициализация базы данных при запуске
@app.on_event("startup")
async def startup_event():
    init_db()
    await export_discord_chat()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
