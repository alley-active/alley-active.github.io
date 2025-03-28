// Константы для подключения к Supabase
const SUPABASE_URL = 'https://cophprhpchscjckyipin.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGhwcmhwY2hzY2pja3lpcGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMDk5MDksImV4cCI6MjA1NjY4NTkwOX0.CFJC8wvbdVzfgxnSkG-ZErQWOYkKvTIeP1nlNAWyJvU'; // Публичный ключ (anon/public)
const CHANNEL_ID = '1000757048406966426';
const CHANNEL_NAME = '꒰💬꒱₊⊹основной-чат';

// Устанавливаем название канала
document.getElementById('channel-name').textContent = CHANNEL_NAME;

// Инициализация клиента Supabase
let supabaseClient;

// Глобальные переменные для графика
let activityChart = null;
let chartData = {
    week: {
        labels: [],
        data: []
    },
    month: {
        labels: [],
        data: []
    }
};
let currentChartPeriod = 'week';

// Функция для получения текущей темы
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

// Функция для получения цветов темы
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

// Функция для форматирования чисел
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Функция для форматирования даты и времени
function formatDateTime(isoString) {
    if (!isoString) return 'Н/Д';
    
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Функция для получения данных для графика
async function fetchChartData() {
    try {
        // Получаем недельные данные
        let { data: weekData, error: weekError } = await supabaseClient
            .from('message_stats_daily')
            .select('date, count')
            .eq('channel_id', CHANNEL_ID)
            .order('date', { ascending: false })
            .limit(7);
            
        if (weekError) {
            console.error('Ошибка при получении недельных данных:', weekError);
            return;
        }
        
        if (weekData && weekData.length > 0) {
            // Обрабатываем данные для недельного графика
            weekData.reverse(); // Меняем порядок на хронологический
            
            chartData.week.labels = weekData.map(item => {
                const date = new Date(item.date);
                return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
            });
            
            chartData.week.data = weekData.map(item => item.count || 0);
        }
        
        // Получаем месячные данные
        let { data: monthData, error: monthError } = await supabaseClient
            .from('message_stats_daily')
            .select('date, count')
            .eq('channel_id', CHANNEL_ID)
            .order('date', { ascending: false })
            .limit(30);
            
        if (monthError) {
            console.error('Ошибка при получении месячных данных:', monthError);
            return;
        }
        
        if (monthData && monthData.length > 0) {
            // Обрабатываем данные для месячного графика
            monthData.reverse(); // Меняем порядок на хронологический
            
            chartData.month.labels = monthData.map(item => {
                const date = new Date(item.date);
                return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
            });
            
            chartData.month.data = monthData.map(item => item.count || 0);
        }
        
        // Если у нас нет реальных данных из Supabase, генерируем демо-данные
        if (!weekData || weekData.length === 0) {
            generateDemoData();
        }
        
        // Обновляем график
        updateChart();
        
    } catch (err) {
        console.error('Ошибка при получении данных для графика:', err);
        generateDemoData(); // Генерируем демо-данные в случае ошибки
        updateChart();
    }
}

// Функция для генерации демо-данных, если нет данных из Supabase
function generateDemoData() {
    // Генерируем демо-данные для недельного графика
    chartData.week.labels = [];
    chartData.week.data = [];
    
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        chartData.week.labels.push(new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date));
        chartData.week.data.push(Math.floor(Math.random() * 100) + 20); // Случайное число от 20 до 120
    }
    
    // Генерируем демо-данные для месячного графика
    chartData.month.labels = [];
    chartData.month.data = [];
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        chartData.month.labels.push(new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date));
        chartData.month.data.push(Math.floor(Math.random() * 100) + 20); // Случайное число от 20 до 120
    }
}

// Функция для создания/обновления графика
function updateChart() {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    const colors = getThemeColors();
    
    // Если график уже существует, уничтожаем его
    if (activityChart) {
        activityChart.destroy();
    }
    
    // Определяем данные для текущего периода
    const data = chartData[currentChartPeriod];
    
    // Находим максимальное значение для анимации
    const maxValue = Math.max(...data.data);
    
    // Создаем новый график
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Количество сообщений',
                data: data.data,
                borderColor: colors.primary,
                backgroundColor: colors.backgroundColor,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: colors.primary,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: colors.primary,
                pointHoverBorderColor: '#FFFFFF',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: colors.tooltipBackground,
                    titleFont: {
                        family: 'Montserrat',
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Montserrat',
                        size: 13
                    },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Сообщений: ${formatNumber(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: maxValue * 1.1, // Добавляем 10% сверху для лучшего вида
                    grid: {
                        color: colors.gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            family: 'Montserrat',
                            size: 11
                        },
                        color: colors.textColor,
                        padding: 10,
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            family: 'Montserrat',
                            size: 11
                        },
                        color: colors.textColor,
                        padding: 10
                    }
                }
            }
        }
    });
}

// Функция обновления счетчиков на странице с анимацией
function updateCounters(data) {
    if (!data) {
        document.getElementById('count-today').textContent = 'Ошибка загрузки';
        document.getElementById('count-yesterday').textContent = 'Ошибка загрузки';
        document.getElementById('count-week').textContent = 'Ошибка загрузки';
        document.getElementById('count-month').textContent = 'Ошибка загрузки';
        document.getElementById('last-update-time').textContent = 'Ошибка загрузки';
        return;
    }
    
    // Функция для анимации счетчиков
    function animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = Math.floor(progress * (end - start) + start);
            element.textContent = formatNumber(currentValue);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                // Добавляем класс для эффекта пульсации в конце анимации
                element.classList.add('updated');
                setTimeout(() => {
                    element.classList.remove('updated');
                }, 1000);
            }
        };
        window.requestAnimationFrame(step);
    }
    
    // Обновляем счетчики с анимацией
    const todayElement = document.getElementById('count-today');
    const yesterdayElement = document.getElementById('count-yesterday');
    const weekElement = document.getElementById('count-week');
    const monthElement = document.getElementById('count-month');
    
    // Очищаем содержимое, чтобы удалить loader
    todayElement.innerHTML = '0';
    yesterdayElement.innerHTML = '0';
    weekElement.innerHTML = '0';
    monthElement.innerHTML = '0';
    
    // Запускаем анимацию с небольшой задержкой
    setTimeout(() => {
        animateValue(todayElement, 0, data.count_today || 0, 1500);
    }, 100);
    
    setTimeout(() => {
        animateValue(yesterdayElement, 0, data.count_yesterday || 0, 1500);
    }, 300);
    
    setTimeout(() => {
        animateValue(weekElement, 0, data.count_week || 0, 1500);
    }, 500);
    
    setTimeout(() => {
        animateValue(monthElement, 0, data.count_month || 0, 1500);
    }, 700);
    
    // Обновляем время последнего обновления
    document.getElementById('last-update-time').textContent = formatDateTime(data.last_updated);
}

// Функция для загрузки данных из Supabase
async function fetchMessageCounts() {
    try {
        // Получаем данные из таблицы message_counts
        const { data, error } = await supabaseClient
            .from('message_counts')
            .select('*')
            .eq('channel_id', CHANNEL_ID)
            .single();
            
        if (error) {
            console.error('Ошибка при получении данных:', error);
            updateCounters(null);
            return;
        }
        
        // Обновляем счетчики на странице
        updateCounters(data);
        
    } catch (err) {
        console.error('Ошибка при получении данных из Supabase:', err);
        updateCounters(null);
    }
}

// Обработчики событий для вкладок графика
function setupChartTabs() {
    const tabs = document.querySelectorAll('.chart-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Удаляем активный класс у всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            
            // Добавляем активный класс текущей вкладке
            tab.classList.add('active');
            
            // Обновляем текущий период
            currentChartPeriod = tab.dataset.period;
            
            // Обновляем график
            updateChart();
        });
    });
}

// Обработчик изменения темы для обновления графика
function setupThemeChangeListener() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                updateChart();
            }
        });
    });
    
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем наличие необходимых констант
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('ВАША_ССЫЛКА')) {
        const message = 'Необходимо указать URL и ключ Supabase в файле script.js';
        alert(message);
        document.querySelector('.container').innerHTML = `<div class="error">${message}</div>`;
        return;
    }
    
    // Создаем клиент Supabase
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Настраиваем обработчики событий
        setupChartTabs();
        setupThemeChangeListener();
        
        // Загружаем данные при первом открытии страницы
        fetchMessageCounts();
        fetchChartData();
        
        // Устанавливаем интервал обновления данных (каждые 5 минут)
        setInterval(() => {
            fetchMessageCounts();
            fetchChartData();
        }, 5 * 60 * 1000);
    } catch (err) {
        console.error('Ошибка при инициализации Supabase:', err);
        document.querySelector('.container').innerHTML = 
            `<div class="error">Ошибка при подключении к базе данных. Пожалуйста, проверьте консоль.</div>`;
    }
}); 