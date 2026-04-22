const palette = {
  green: '#0d8f5b',
  greenLight: '#55bf8f',
  yellow: '#f7b733',
  blue: '#3f88c5',
  coral: '#f06c64',
  gray: '#8aa398',
};

const chartDefaults = {
  plugins: {
    legend: {
      labels: {
        font: { family: 'Barlow', size: 12 },
        color: '#32473d',
      },
    },
    tooltip: {
      bodyFont: { family: 'Barlow' },
      titleFont: { family: 'Sora' },
    },
  },
  responsive: true,
  maintainAspectRatio: false,
};

Chart.defaults.font.family = 'Barlow';
Chart.defaults.color = '#32473d';

function numberBr(value) {
  return value.toLocaleString('pt-BR');
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR');
}

function renderCards(totals) {
  const cards = [
    ['Registros', totals.registros],
    ['Cidades', totals.cidades],
    ['Bairros', totals.bairros],
    ['Indicacoes', totals.indicacoes],
    ['Com E-mail', totals.comEmail],
    ['Com Facebook', totals.comFacebook],
    ['Com Instagram', totals.comInstagram],
  ];

  const container = document.getElementById('summaryCards');
  container.innerHTML = cards
    .map(
      ([label, value]) =>
        `<article class="card"><h3>${label}</h3><p>${numberBr(value)}</p></article>`
    )
    .join('');
}

function makeBarChart(id, labels, values, color) {
  new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: color,
          borderRadius: 8,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

function makeLineChart(id, labels, values) {
  new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: palette.green,
          backgroundColor: 'rgba(13, 143, 91, 0.18)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

function makeDoughnutChart(id, labels, values) {
  new Chart(document.getElementById(id), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [palette.green, palette.yellow, palette.blue, palette.coral, palette.gray],
          borderWidth: 0,
        },
      ],
    },
    options: {
      ...chartDefaults,
      cutout: '58%',
    },
  });
}

async function init() {
  const response = await fetch('./data/eleitores_summary.json');
  const data = await response.json();

  document.getElementById('sourceFile').textContent = `Fonte: ${data.sourceFile}`;
  document.getElementById('generatedAt').textContent = `Atualizacao: ${formatDate(data.generatedAt)}`;

  renderCards(data.totals);

  makeLineChart('cadastrosDiaChart', data.charts.cadastrosDia.labels, data.charts.cadastrosDia.values);
  makeBarChart('cadastrosHoraChart', data.charts.cadastrosHora.labels, data.charts.cadastrosHora.values, palette.yellow);
  makeDoughnutChart('programaChart', data.charts.programa.labels, data.charts.programa.values);
  makeDoughnutChart('areaChart', data.charts.area.labels, data.charts.area.values);
  makeBarChart('cidadeChart', data.charts.cidade.labels, data.charts.cidade.values, palette.blue);
  makeBarChart('bairroChart', data.charts.bairro.labels, data.charts.bairro.values, palette.greenLight);
  makeBarChart('indicacaoChart', data.charts.indicacao.labels, data.charts.indicacao.values, palette.coral);
}

init().catch((error) => {
  console.error('Erro ao carregar dashboard', error);
  alert('Nao foi possivel carregar os dados do dashboard.');
});
