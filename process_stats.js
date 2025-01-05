const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const width = 800;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

async function generateChart(labels, data) {
    const configuration = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Активность чата',
                data: data,
                backgroundColor: 'rgba(114, 137, 218, 0.2)',
                borderColor: 'rgba(114, 137, 218, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    };
    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return imageBuffer.toString('base64');
}

async function processStats() {
    let dataToday = { messages: [] };
    let dataWeek = { messages: [] };
    let dataMonth = { messages: [] };

    if (fs.existsSync('chat_data_today.json')) {
        const rawDataToday = fs.readFileSync('chat_data_today.json', 'utf-8');
        dataToday = JSON.parse(rawDataToday);
    }

    if (fs.existsSync('chat_data_week.json')) {
        const rawDataWeek = fs.readFileSync('chat_data_week.json', 'utf-8');
        dataWeek = JSON.parse(rawDataWeek);
    }

    if (fs.existsSync('chat_data_month.json')) {
        const rawDataMonth = fs.readFileSync('chat_data_month.json', 'utf-8');
        dataMonth = JSON.parse(rawDataMonth);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Анализ сообщений
    const messagesToday = dataToday.messages.length;
    const messagesWeek = dataWeek.messages.length;
    const messagesMonth = dataMonth.messages.length;
    
    // Подсчет активных участников (нужно доработать)
    const allMessages = [...dataToday.messages, ...dataWeek.messages, ...dataMonth.messages];
    const activeParticipants = new Set(allMessages.map(message => message.author.id)).size;

    // Топ пользователи (нужно доработать)
    const topUsers = [
        { name: 'User1', avatar: 'avatar1.png', messageCount: 150 },
        { name: 'User2', avatar: 'avatar2.png', messageCount: 120 },
        { name: 'User3', avatar: 'avatar3.png', messageCount: 100 },
    ];

    // Данные для графика (нужно доработать)
    const chartLabels = ['10:00', '11:00', '12:00', '13:00', '14:00'];
    const chartData = [10, 20, 30, 25, 40];

    const chartImage = await generateChart(chartLabels, chartData);

    // Генерация HTML
    const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Статистика Discord чата</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #2c2f33;
                color: #ffffff;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background-color: #23272a;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            }
            .stats-header {
                background-color: #7289da;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                text-align: center;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            .stat-card {
                background-color: #2f3136;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                transition: transform 0.2s;
            }
            .stat-card:hover {
                transform: translateY(-5px);
            }
            .stat-card h3 {
                margin: 0 0 10px 0;
                color: #7289da;
            }
            .stat-card p {
                font-size: 24px;
                margin: 0;
                font-weight: bold;
            }
            .users-list {
                background-color: #2f3136;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .users-list h2 {
                margin: 0 0 20px 0;
                color: #7289da;
            }
            .user-row {
                display: grid;
                grid-template-columns: auto 1fr auto;
                gap: 15px;
                padding: 12px;
                border-bottom: 1px solid #40444b;
                align-items: center;
                transition: background-color 0.2s;
            }
            .user-row:hover {
                background-color: #36393f;
            }
            .user-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: #7289da;
            }
            .user-name {
                font-weight: bold;
            }
            .message-count {
                color: #7289da;
                font-weight: bold;
            }
            .chart-container {
                background-color: #2f3136;
                padding: 20px;
                border-radius: 8px;
                margin-top: 20px;
            }
            .time-selector {
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="stats-header">
                <h1>Статистика Discord чата</h1>
            </div>
            <div class="stats">
                <div class="stat-card">
                    <h3>Сообщений за сегодня</h3>
                    <p id="messages-today">${messagesToday}</p>
                </div>
                <div class="stat-card">
                    <h3>Сообщений за неделю</h3>
                    <p id="messages-week">${messagesWeek}</p>
                </div>
                <div class="stat-card">
                    <h3>Сообщений за месяц</h3>
                    <p id="messages-month">${messagesMonth}</p>
                </div>
                <div class="stat-card">
                    <h3>Активные участники</h3>
                    <p id="active-participants">${activeParticipants}</p>
                </div>
            </div>
            <div class="users-list">
                <h2>Топ участников по сообщениям</h2>
                <div id="top-users">
                    ${topUsers.map(user => `
                        <div class="user-row">
                            <div class="user-avatar" style="background-image: url(${user.avatar})"></div>
                            <div class="user-name">${user.name}</div>
                            <div class="message-count">${user.messageCount}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="chart-container">
                <img src="data:image/png;base64,${chartImage}" alt="Activity Chart" />
            </div>
        </div>
    </body>
    </html>
    `;

    fs.writeFileSync('index.html', html);

    // Проверка конца месяца и сохранение данных (нужно доработать)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (now.getDate() === lastDayOfMonth.getDate()) {
        const monthlyData = {
            messagesMonth,
            activeParticipants,
            topUsers
        };
        fs.writeFileSync('monthly_stats.json', JSON.stringify(monthlyData));
    }
}

processStats();
