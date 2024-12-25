from fastapi import FastAPI, UploadFile, HTTPException
import matplotlib.pyplot as plt
import pandas as pd
import os
import subprocess
from fastapi.responses import FileResponse

app = FastAPI()

# Путь к DiscordChatExporter CLI
dce_path = "./DiscordChatExporter.Cli.exe"  # Убедись, что путь правильный

# Папка для временных файлов
os.makedirs("temp", exist_ok=True)

@app.post("/export-chat")
async def export_chat(token: str, channel_id: str):
    """
    Экспортирует чат из канала Discord и анализирует данные.
    """
    output_file = f"temp/chat_{channel_id}.json"

    # Выполнение команды DiscordChatExporter
    try:
        subprocess.run([
            dce_path,
            "export",
            "--token", token,
            "--channel", channel_id,
            "--output", output_file,
            "--format", "Json"
        ], check=True)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при экспорте чата: {str(e)}")

    return {"message": "Чат успешно экспортирован", "file": output_file}

@app.post("/upload-chat")
async def upload_chat(file: UploadFile):
    """
    Загрузка файла чата для анализа.
    """
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Неверный формат файла. Ожидается JSON.")

    file_path = f"temp/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())

    return analyze_chat(file_path)

def analyze_chat(file_path):
    """
    Анализирует данные чата и создает графики.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = pd.read_json(f)

    # Извлечение информации об авторах
    authors = [message['author']['name'] for message in data['messages']]

    # Подсчет сообщений
    message_counts = pd.Series(authors).value_counts()

    # Построение графика активности
    plt.figure(figsize=(10, 6))
    message_counts.plot(kind='bar', color='skyblue')
    plt.title('Активность пользователей в чате')
    plt.xlabel('Пользователь')
    plt.ylabel('Количество сообщений')
    plt.xticks(rotation=45)

    graph_path = "temp/activity_graph.png"
    plt.savefig(graph_path)
    plt.close()

    return {"message": "Анализ завершен", "graph": graph_path}

@app.get("/graph")
async def get_graph():
    """
    Возвращает график активности пользователей.
    """
    graph_path = "temp/activity_graph.png"
    if not os.path.exists(graph_path):
        raise HTTPException(status_code=404, detail="График не найден.")

    return FileResponse(graph_path)

# Убедись, что DiscordChatExporter CLI добавлен в проект и доступен
