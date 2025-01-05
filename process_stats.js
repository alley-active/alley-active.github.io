const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const Chart = require('chart.js'); //Для графика

const html = fs.readFileSync('path/to/exported.html', 'utf-8'); // Путь к экспортированному файлу
const dom = new JSDOM(html);
const document = dom.window.document;

// Парсинг и обработка HTML (как в предыдущем примере)
const messages = document.querySelectorAll('.chatlog__message'); // Уточните класс!
// ... (Подсчет статистики)

//Генерация нового HTML
const newHtml = `<!DOCTYPE html>
<html>
<head>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
<h1>Сообщений: ${messages.length}</h1>
<canvas id="myChart"></canvas>
<script>
  const ctx = document.getElementById('myChart').getContext('2d');
  const myChart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
          datasets: [{
              label: '# of Votes',
              data: [12, 19, 3, 5, 2, 3],
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
  });
</script>
</body>
</html>`;

fs.writeFileSync('index.html', newHtml); // Запись нового HTML-файла
