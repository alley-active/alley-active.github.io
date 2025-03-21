# Discord AI Бот на Node.js

Discord бот с использованием AI от OpenRouter, написанный на Node.js с использованием библиотек discord.js-selfbot-v13 и Supabase для хранения истории сообщений.

## Функции бота

- Отвечает на текстовые сообщения в указанном треде/канале
- Анализирует прикрепленные изображения
- Хранит историю переписки в памяти и в Supabase
- Фильтрует запрещенный контент
- Форматирует ответы, если они слишком длинные
- Поддерживает многократные попытки получения ответа от API

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://your-repository-url.git
cd discord-ai-bot
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Заполните необходимые переменные окружения в файле `.env`:
```
DISCORD_TOKEN=ваш_токен_discord
OPENROUTER_API_KEY=ваш_ключ_api_openrouter
TARGET_THREAD_ID=id_треда_discord
SUPABASE_URL=ваш_url_supabase
SUPABASE_KEY=ваш_ключ_supabase
```

## Настройка Supabase

1. Создайте проект на [Supabase](https://supabase.com/)
2. Создайте таблицу `message_history` со следующей структурой:
```sql
CREATE TABLE message_history (
  id SERIAL PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_message TEXT,
  bot_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Запуск бота

```bash
# Для обычного запуска
npm start

# Для разработки с автоматической перезагрузкой
npm run dev
```

## Конфигурация

В файле `.env` вы можете настроить следующие параметры:

- `DISCORD_TOKEN` - токен вашего аккаунта Discord
- `OPENROUTER_API_KEY` - API ключ для OpenRouter
- `TARGET_THREAD_ID` - ID канала/треда Discord, где будет работать бот
- `MODEL` - модель для генерации ответов (по умолчанию "google/gemma-3-27b-it:free")
- `SUPABASE_URL` - URL вашего проекта Supabase
- `SUPABASE_KEY` - API ключ для Supabase
- `MAX_HISTORY_LENGTH` - максимальная длина истории переписки
- `MAX_RESPONSE_LENGTH` - максимальная длина ответа бота
- `MAX_RETRIES` - количество попыток получения ответа от API

## Безопасность

⚠️ **Внимание**: Этот проект использует Discord selfbot, что противоречит условиям использования Discord. Используйте на свой страх и риск.

## Лицензия

MIT 