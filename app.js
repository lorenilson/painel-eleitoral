const colors = {
  green: '#0d8f5b',
  green2: '#62c598',
  blue: '#2f6ea7',
  yellow: '#e3a92d',
  red: '#d05e57',
  gray: '#8ca298',
};

const charts = {};
let dashboardData = null;

Chart.defaults.font.family = 'Barlow';
Chart.defaults.color = '#30463d';

function n(v) {
  return Number(v || 0).toLocaleString('pt-BR');
}

function upsertChart(id, type, labels, values, colorMode) {
  if (charts[id]) charts[id].destroy();

  let dataset;
  if (colorMode === 'multi') {
    dataset = {
      data: values,
      backgroundColor: [colors.green, colors.yellow, colors.blue, colors.red, colors.green2, colors.gray],
      borderWidth: 0,
    };
  } else if (type === 'line') {
    dataset = {
      data: values,
      borderColor: colors.green,
      backgroundColor: 'rgba(13, 143, 91, 0.18)',
      fill: true,
      tension: 0.25,
      pointRadius: 1.8,
    };
  } else {
    dataset = {
      data: values,
      backgroundColor: colorMode || colors.blue,
      borderRadius: 7,
      maxBarThickness: 26,
    };
  }

  charts[id] = new Chart(document.getElementById(id), {
    type,
    data: { labels, datasets: [dataset] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: type === 'doughnut' ? {} : { y: { beginAtZero: true, ticks: { precision: 0 } } },
      cutout: type === 'doughnut' ? '55%' : undefined,
    },
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
    .map(
      (r) => `
      <tr>
        <td>${r.NM_MUNICIPIO || ''}</td>
        <td>${n(r.eleitores)}</td>
        <td>${n(r.biometria)}</td>
        <td>${n(r.deficiencia)}</td>
        <td>${n(r.nomeSocial)}</td>
        <td>${n(r.zonas)}</td>
        <td>${n(r.secoes)}</td>
        <td>${n(r.locais)}</td>
      </tr>
    `
    )
    .join('');
}

function getMunicipioTotals(row) {
  return {
    eleitores: row.eleitores,
    biometria: row.biometria,
    deficiencia: row.deficiencia,
    nomeSocial: row.nomeSocial,
    municipios: 1,
    zonas: row.zonas,
    secoes: row.secoes,
    locais: row.locais,
  };
}

function renderWithFilter(municipio) {
  const hasDetailed = Boolean(dashboardData.byMunicipio);
  const row = municipio === 'TODOS'
    ? null
    : dashboardData.municipios.find((m) => m.NM_MUNICIPIO === municipio);

  const scopedTotals = municipio === 'TODOS'
    ? dashboardData.totals
    : getMunicipioTotals(row);

  cards(scopedTotals);
  renderTable(municipio === 'TODOS' ? dashboardData.municipios : [row]);

  if (municipio === 'TODOS') {
    upsertChart('cidadeChart', 'bar', dashboardData.charts.cidade.labels, dashboardData.charts.cidade.values, colors.blue);
  } else {
    upsertChart('cidadeChart', 'bar', [municipio], [row.eleitores], colors.blue);
  }

  if (hasDetailed && municipio !== 'TODOS') {
    const scoped = dashboardData.byMunicipio[municipio];
    upsertChart('generoChart', 'doughnut', scoped.charts.genero.labels, scoped.charts.genero.values, 'multi');
    upsertChart('faixaChart', 'line', scoped.charts.faixaEtaria.labels, scoped.charts.faixaEtaria.values);
    upsertChart('racaChart', 'doughnut', scoped.charts.corRaca.labels, scoped.charts.corRaca.values, 'multi');
    upsertChart('instrucaoChart', 'bar', scoped.charts.instrucao.labels, scoped.charts.instrucao.values, colors.green2);
    upsertChart('estadoCivilChart', 'bar', scoped.charts.estadoCivil.labels, scoped.charts.estadoCivil.values, colors.red);
    return;
  }

  upsertChart('generoChart', 'doughnut', dashboardData.charts.genero.labels, dashboardData.charts.genero.values, 'multi');
  upsertChart('faixaChart', 'line', dashboardData.charts.faixaEtaria.labels, dashboardData.charts.faixaEtaria.values);
  upsertChart('racaChart', 'doughnut', dashboardData.charts.corRaca.labels, dashboardData.charts.corRaca.values, 'multi');
  upsertChart('instrucaoChart', 'bar', dashboardData.charts.instrucao.labels, dashboardData.charts.instrucao.values, colors.green2);
  upsertChart('estadoCivilChart', 'bar', dashboardData.charts.estadoCivil.labels, dashboardData.charts.estadoCivil.values, colors.red);
}

function buildMunicipioSelect() {
  const select = document.getElementById('municipioSelect');
  const municipios = dashboardData.municipios
    .map((m) => m.NM_MUNICIPIO)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  select.innerHTML = '<option value="TODOS">Todos os municipios</option>' +
    municipios.map((m) => `<option value="${m}">${m}</option>`).join('');

  select.addEventListener('change', () => {
    renderWithFilter(select.value);
  });
}

async function init() {
  const res = await fetch('./data/eleitores_summary.json');
  dashboardData = await res.json();

  document.getElementById('sourceInfo').textContent = `Fonte: Google Sheets (gid ${dashboardData.source.gid})`;
  document.getElementById('generatedAt').textContent = `Atualizado: ${new Date(dashboardData.generatedAt).toLocaleString('pt-BR')}`;

  buildMunicipioSelect();
  renderWithFilter('TODOS');
}

init().catch((err) => {
  console.error(err);
  alert('Falha ao carregar painel.');
});
