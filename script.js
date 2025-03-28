// script.js (без комментариев)

const SUPABASE_URL = 'https://cophprhpchscjckyipin.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGhwcmhwY2hzY2pja3lpcGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMDk5MDksImV4cCI6MjA1NjY4NTkwOX0.CFJC8wvbdVzfgxnSkG-ZErQWOYkKvTIeP1nlNAWyJvU';
const CHANNEL_ID = '1000757048406966426';
const CHANNEL_NAME = '꒰💬꒱₊⊹основной-чат';

document.getElementById('channel-name').textContent = CHANNEL_NAME;

let supabaseClient;
let activityChart = null;
let chartData = {
    week: { labels: [], data: [] },
    month: { labels: [], data: [] },
    "all-time": { labels: [], data: [] }
};
let currentChartPeriod = 'week';

function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

function getThemeColors() {
    const isDarkTheme = getCurrentTheme() === 'dark';
    return {
        primary: isDarkTheme ? '#7983f5' : '#5865F2',
        textColor: isDarkTheme ? '#ECEFF4' : '#2E3440',
        gridColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        backgroundColor: isDarkTheme ? 'rgba(88, 101, 242, 0.2)' : 'rgba(88, 101, 242, 0.1)',
        tooltipBackground: isDarkTheme ? 'rgba(59, 66, 82, 0.9)' : 'rgba(46, 52, 64, 0.9)'
    };
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatDateTime(isoString) {
    if (!isoString) return 'Н/Д';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(date);
}

async function fetchChartData() {
    try {
        const { data: allDailyData, error: allError } = await supabaseClient
            .from('message_stats_daily')
            .select('date, count')
            .eq('channel_id', CHANNEL_ID)
            .order('date', { ascending: true }); // Загружаем все данные, сортируем по возрастанию

        if (allError) {
            console.error('Ошибка при получении всех данных для графика:', allError);
            generateDemoData();
            updateChart();
            return;
        }

        if (!allDailyData || allDailyData.length === 0) {
            console.warn('Нет данных для графика в Supabase, генерируем демо-данные.');
            generateDemoData();
            updateChart();
            return;
        }

        // Обработка данных для всех периодов
        const allLabels = allDailyData.map(item => {
            const date = new Date(item.date);
            return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
        });
        const allCounts = allDailyData.map(item => item.count || 0);

        // Неделя (последние 7 записей)
        const weekSlice = allDailyData.slice(-7);
        chartData.week.labels = weekSlice.map(item => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(item.date)));
        chartData.week.data = weekSlice.map(item => item.count || 0);

        // Месяц (последние 30 записей)
        const monthSlice = allDailyData.slice(-30);
        chartData.month.labels = monthSlice.map(item => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(item.date)));
        chartData.month.data = monthSlice.map(item => item.count || 0);

        // Все время (агрегируем по месяцам для читаемости)
        const monthlyAggregated = allDailyData.reduce((acc, item) => {
            const date = new Date(item.date);
            const monthYear = new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'short' }).format(date);
            acc[monthYear] = (acc[monthYear] || 0) + (item.count || 0);
            return acc;
        }, {});

        chartData["all-time"].labels = Object.keys(monthlyAggregated);
        chartData["all-time"].data = Object.values(monthlyAggregated);

        updateChart();

    } catch (err) {
        console.error('Ошибка при получении данных для графика:', err);
        generateDemoData();
        updateChart();
    }
}


function generateDemoData() {
    chartData.week.labels = []; chartData.week.data = [];
    chartData.month.labels = []; chartData.month.data = [];
    chartData["all-time"].labels = []; chartData["all-time"].data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today); date.setDate(today.getDate() - i);
        chartData.week.labels.push(new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date));
        chartData.week.data.push(Math.floor(Math.random() * 100) + 20);
    }
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today); date.setDate(today.getDate() - i);
        chartData.month.labels.push(new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date));
        chartData.month.data.push(Math.floor(Math.random() * 100) + 20);
    }
     // Демо для "Все время" (6 месяцев)
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today); date.setMonth(today.getMonth() - i);
        chartData["all-time"].labels.push(new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'short' }).format(date));
        chartData["all-time"].data.push(Math.floor(Math.random() * 500) + 100);
    }
}

function updateChart() {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    const colors = getThemeColors();
    if (activityChart) { activityChart.destroy(); }

    const data = chartData[currentChartPeriod];
    if (!data || !data.data || data.data.length === 0) {
        console.warn(`Нет данных для графика за период: ${currentChartPeriod}`);
        // Можно отобразить сообщение на самом canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = colors.textColor;
        ctx.textAlign = 'center';
        ctx.fillText('Нет данных для отображения', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const maxValue = Math.max(0, ...data.data); // Используем 0 как минимум

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Количество сообщений', data: data.data,
                borderColor: colors.primary, backgroundColor: colors.backgroundColor,
                borderWidth: 3, fill: true, tension: 0.4,
                pointBackgroundColor: '#FFFFFF', pointBorderColor: colors.primary,
                pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
                pointHoverBackgroundColor: colors.primary, pointHoverBorderColor: '#FFFFFF',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 1500, easing: 'easeOutQuart' },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: colors.tooltipBackground,
                    titleFont: { family: 'Montserrat', size: 14, weight: 'bold' },
                    bodyFont: { family: 'Montserrat', size: 13 },
                    padding: 12, displayColors: false,
                    callbacks: { label: function(context) { return `Сообщений: ${formatNumber(context.raw)}`; } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true, suggestedMax: maxValue * 1.1,
                    grid: { color: colors.gridColor, drawBorder: false },
                    ticks: {
                        font: { family: 'Montserrat', size: 11 }, color: colors.textColor, padding: 10,
                        callback: function(value) { return formatNumber(value); }
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        font: { family: 'Montserrat', size: 11 }, color: colors.textColor, padding: 10
                    }
                }
            }
        }
    });
}

function updateCounters(data) {
    if (!data) {
        document.getElementById('count-today').textContent = 'Н/Д';
        document.getElementById('count-yesterday').textContent = 'Н/Д';
        document.getElementById('count-week').textContent = 'Н/Д';
        document.getElementById('count-month').textContent = 'Н/Д';
        document.getElementById('count-all-time').textContent = 'Н/Д';
        document.getElementById('last-update-time').textContent = 'Ошибка';
        return;
    }

    function animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = Math.floor(progress * (end - start) + start);
            element.textContent = formatNumber(currentValue);
            if (progress < 1) { window.requestAnimationFrame(step); }
            else {
                element.classList.add('updated');
                setTimeout(() => { element.classList.remove('updated'); }, 1000);
            }
        };
        window.requestAnimationFrame(step);
    }

    const todayEl = document.getElementById('count-today');
    const yesterdayEl = document.getElementById('count-yesterday');
    const weekEl = document.getElementById('count-week');
    const monthEl = document.getElementById('count-month');
    const allTimeEl = document.getElementById('count-all-time');

    const currentToday = parseInt(todayEl.textContent.replace(/\s/g, ''), 10) || 0;
    const currentYesterday = parseInt(yesterdayEl.textContent.replace(/\s/g, ''), 10) || 0;
    const currentWeek = parseInt(weekEl.textContent.replace(/\s/g, ''), 10) || 0;
    const currentMonth = parseInt(monthEl.textContent.replace(/\s/g, ''), 10) || 0;
    const currentAllTime = parseInt(allTimeEl.textContent.replace(/\s/g, ''), 10) || 0;

    if (todayEl.textContent.includes('loader')) todayEl.textContent = '0';
    if (yesterdayEl.textContent.includes('loader')) yesterdayEl.textContent = '0';
    if (weekEl.textContent.includes('loader')) weekEl.textContent = '0';
    if (monthEl.textContent.includes('loader')) monthEl.textContent = '0';
    if (allTimeEl.textContent.includes('loader')) allTimeEl.textContent = '0';


    setTimeout(() => animateValue(todayEl, currentToday, data.count_today || 0, 1500), 100);
    setTimeout(() => animateValue(yesterdayEl, currentYesterday, data.count_yesterday || 0, 1500), 300);
    setTimeout(() => animateValue(weekEl, currentWeek, data.count_week || 0, 1500), 500);
    setTimeout(() => animateValue(monthEl, currentMonth, data.count_month || 0, 1500), 700);
    setTimeout(() => animateValue(allTimeEl, currentAllTime, data.count_all_time || 0, 1500), 900);

    document.getElementById('last-update-time').textContent = formatDateTime(data.last_updated);
}


async function fetchMessageCounts() {
    try {
        const { data, error } = await supabaseClient
            .from('message_counts')
            .select('*')
            .eq('channel_id', CHANNEL_ID)
            .single();
        if (error) { console.error('Ошибка при получении данных счетчиков:', error); updateCounters(null); return; }
        updateCounters(data);
    } catch (err) { console.error('Исключение при получении данных счетчиков:', err); updateCounters(null); }
}

function setupChartTabs() {
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentChartPeriod = tab.dataset.period;
            updateChart();
        });
    });
}

function setupThemeChangeListener() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') { updateChart(); }
        });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('ВАША_ССЫЛКА')) {
        const message = 'Необходимо указать URL и ключ Supabase в файле script.js';
        alert(message); document.querySelector('.container').innerHTML = `<div class="error">${message}</div>`; return;
    }
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setupChartTabs();
        setupThemeChangeListener();
        fetchMessageCounts();
        fetchChartData();
        setInterval(() => { fetchMessageCounts(); fetchChartData(); }, 30 * 1000); // Обновление каждые 30 секунд
    } catch (err) {
        console.error('Ошибка при инициализации Supabase:', err);
        document.querySelector('.container').innerHTML = `<div class="error">Ошибка подключения к базе данных.</div>`;
    }
});