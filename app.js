const colors = {
  green: '#0d8f5b',
  green2: '#62c598',
  blue: '#2f6ea7',
  yellow: '#e3a92d',
  red: '#d05e57',
  gray: '#8ca298',
};

Chart.defaults.font.family = 'Barlow';
Chart.defaults.color = '#30463d';

function n(v) {
  return Number(v || 0).toLocaleString('pt-BR');
}

function bar(id, labels, values, color) {
  return new Chart(document.getElementById(id), {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 7, maxBarThickness: 26 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function doughnut(id, labels, values) {
  return new Chart(document.getElementById(id), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [colors.green, colors.yellow, colors.blue, colors.red, colors.green2, colors.gray],
        borderWidth: 0,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '55%' },
  });
}

function line(id, labels, values) {
  return new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: colors.green,
        backgroundColor: 'rgba(13, 143, 91, 0.18)',
        fill: true,
        tension: 0.25,
        pointRadius: 1.8,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  });
}

function cards(totals) {
  const items = [
    ['Eleitores', totals.eleitores],
    ['Biometria', totals.biometria],
    ['Deficiencia', totals.deficiencia],
    ['Nome Social', totals.nomeSocial],
    ['Municipios', totals.municipios],
    ['Zonas', totals.zonas],
    ['Secoes', totals.secoes],
    ['Locais', totals.locais],
  ];
  document.getElementById('summaryCards').innerHTML = items
    .map(([k, v]) => `<article class="card"><h3>${k}</h3><p>${n(v)}</p></article>`)
    .join('');
}

function renderTable(rows) {
  const body = document.getElementById('municipiosBody');
  body.innerHTML = rows
    .map((r) => `
      <tr>
        <td>${r.NM_MUNICIPIO || r.municipio || ''}</td>
        <td>${n(r.eleitores)}</td>
        <td>${n(r.biometria)}</td>
        <td>${n(r.deficiencia)}</td>
        <td>${n(r.nomeSocial)}</td>
        <td>${n(r.zonas)}</td>
        <td>${n(r.secoes)}</td>
        <td>${n(r.locais)}</td>
      </tr>
    `)
    .join('');
}

async function init() {
  const res = await fetch('./data/eleitores_summary.json');
  const data = await res.json();

  document.getElementById('sourceInfo').textContent = `Fonte: Google Sheets (gid ${data.source.gid})`;
  document.getElementById('generatedAt').textContent = `Atualizado: ${new Date(data.generatedAt).toLocaleString('pt-BR')}`;

  cards(data.totals);

  bar('cidadeChart', data.charts.cidade.labels, data.charts.cidade.values, colors.blue);
  doughnut('generoChart', data.charts.genero.labels, data.charts.genero.values);
  line('faixaChart', data.charts.faixaEtaria.labels, data.charts.faixaEtaria.values);
  doughnut('racaChart', data.charts.corRaca.labels, data.charts.corRaca.values);
  bar('instrucaoChart', data.charts.instrucao.labels, data.charts.instrucao.values, colors.green2);
  bar('estadoCivilChart', data.charts.estadoCivil.labels, data.charts.estadoCivil.values, colors.red);

  renderTable(data.municipios);
}

init().catch((err) => {
  console.error(err);
  alert('Falha ao carregar painel.');
});
