const SUPABASE_URL = 'https://cophprhpchscjckyipin.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGhwcmhwY2hzY2pja3lpcGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMDk5MDksImV4cCI6MjA1NjY4NTkwOX0.CFJC8wvbdVzfgxnSkG-ZErQWOYkKvTIeP1nlNAWyJvU';
const CHANNEL_ID = '1000757048406966426';

let supabaseClient;

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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

async function fetchChartData() {
    try {
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
            weekData.reverse(); 
            
            chartData.week.labels = weekData.map(item => {
                const date = new Date(item.date);
                return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
            });
            
            chartData.week.data = weekData.map(item => item.count || 0);
        }
        
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
            monthData.reverse(); 
            
            chartData.month.labels = monthData.map(item => {
                const date = new Date(item.date);
                return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
            });
            
            chartData.month.data = monthData.map(item => item.count || 0);
        }
        
        if (!weekData || weekData.length === 0) {
            generateDemoData();
        }
        
        updateChart();
        
    } catch (err) {
        console.error('Ошибка при получении данных для графика:', err);
        generateDemoData(); 
        updateChart();
    }
}

function generateDemoData() {
    chartData.week.labels = [];
    chartData.week.data = [];
    
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        chartData.week.labels.push(new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date));
        chartData.week.data.push(Math.floor(Math.random() * 100) + 20); 
    }
    
    chartData.month.labels = [];
    chartData.month.data = [];
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        chartData.month.labels.push(new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date));
        chartData.month.data.push(Math.floor(Math.random() * 100) + 20); 
    }
}

function updateChart() {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    const colors = getThemeColors();
    
    if (activityChart) {
        activityChart.destroy();
    }
    
    const data = chartData[currentChartPeriod];
    
    const maxValue = Math.max(...data.data);
    
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
                    suggestedMax: maxValue * 1.1, 
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

function updateCounters(data) {
    if (!data) {
        document.getElementById('count-today').textContent = 'Ошибка загрузки';
        document.getElementById('count-yesterday').textContent = 'Ошибка загрузки';
        document.getElementById('count-week').textContent = 'Ошибка загрузки';
        document.getElementById('count-month').textContent = 'Ошибка загрузки';
        document.getElementById('last-update-time').textContent = 'Ошибка загрузки';
        return;
    }
    
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
                element.classList.add('updated');
                setTimeout(() => {
                    element.classList.remove('updated');
                }, 1000);
            }
        };
        window.requestAnimationFrame(step);
    }
    
    const todayElement = document.getElementById('count-today');
    const yesterdayElement = document.getElementById('count-yesterday');
    const weekElement = document.getElementById('count-week');
    const monthElement = document.getElementById('count-month');
    
    todayElement.innerHTML = '0';
    yesterdayElement.innerHTML = '0';
    weekElement.innerHTML = '0';
    monthElement.innerHTML = '0';
    
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
    
    document.getElementById('last-update-time').textContent = formatDateTime(data.last_updated);
}

async function fetchMessageCounts() {
    try {
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
        
        updateCounters(data);
        
    } catch (err) {
        console.error('Ошибка при получении данных из Supabase:', err);
        updateCounters(null);
    }
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

async function fetchTopUser() {
    const topUserContainer = document.getElementById('top-user-info');
    if (!topUserContainer) return;

    topUserContainer.innerHTML = '<div class="loader"></div>'; 

    try {
        const response = await fetch(`/api/most_active_user`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Ошибка при запросе к API' }));
            throw new Error(`Ошибка: ${response.status} ${response.statusText}. ${errorData.error || errorData.message}`);
        }
        const userData = await response.json();

        if (userData && userData.name && userData.count !== undefined) {
            topUserContainer.innerHTML = `
                <span class="user-name">${userData.name}</span>
                <span class="user-messages">(${formatNumber(userData.count)} сообщ.)</span>
            `;
        } else {
            topUserContainer.textContent = 'Нет данных';
        }
    } catch (error) {
        console.error('Ошибка при загрузке самого активного пользователя:', error);
        topUserContainer.textContent = 'Ошибка загрузки';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('ВАША_ССЫЛКА')) {
        const message = 'Необходимо указать URL и ключ Supabase в файле script.js';
        alert(message);
        document.querySelector('.container').innerHTML = `<div class="error">${message}</div>`;
        return;
    }
    
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        setupChartTabs();
        setupThemeChangeListener();
        
        fetchMessageCounts();
        fetchTopUser(); 
        fetchChartData();
        
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