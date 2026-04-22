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

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

async function ensureFilterCubes(data) {
  if (data.filterCube && data.filterCubeGenero && data.filters) {
    return data;
  }

  const csvUrl = data?.source?.csvUrl;
  if (!csvUrl) return data;

  const text = await fetch(csvUrl).then((r) => r.text());
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

  const cubeMap = new Map();
  const cubeGeneroMap = new Map();
  const zonas = new Set();
  const faixaTotals = new Map();

  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]);
    const municipio = row[idx.NM_MUNICIPIO] || 'NAO INFORMADO';
    const zona = String(row[idx.NR_ZONA] || '').trim();
    const faixa = row[idx.DS_FAIXA_ETARIA] || 'NAO INFORMADO';
    const genero = row[idx.DS_GENERO] || 'NAO INFORMADO';
    const eleitores = Number(row[idx.QT_ELEITORES] || 0);
    const biometria = Number(row[idx.QT_ELEITORES_BIOMETRIA] || 0);
    const deficiencia = Number(row[idx.QT_ELEITORES_DEFICIENCIA] || 0);
    const nomeSocial = Number(row[idx.QT_ELEITORES_NOME_SOCIAL] || 0);

    const k = `${municipio}|${zona}|${faixa}`;
    if (!cubeMap.has(k)) {
      cubeMap.set(k, {
        NM_MUNICIPIO: municipio,
        ZONA: zona,
        FAIXA: faixa,
        eleitores: 0,
        biometria: 0,
        deficiencia: 0,
        nomeSocial: 0,
      });
    }
    const base = cubeMap.get(k);
    base.eleitores += eleitores;
    base.biometria += biometria;
    base.deficiencia += deficiencia;
    base.nomeSocial += nomeSocial;

    const kg = `${municipio}|${zona}|${faixa}|${genero}`;
    if (!cubeGeneroMap.has(kg)) {
      cubeGeneroMap.set(kg, {
        NM_MUNICIPIO: municipio,
        ZONA: zona,
        FAIXA: faixa,
        DS_GENERO: genero,
        eleitores: 0,
      });
    }
    cubeGeneroMap.get(kg).eleitores += eleitores;

    zonas.add(zona);
    faixaTotals.set(faixa, (faixaTotals.get(faixa) || 0) + eleitores);
  }

  data.filterCube = [...cubeMap.values()];
  data.filterCubeGenero = [...cubeGeneroMap.values()];
  data.filters = {
    zonas: [...zonas].sort((a, b) => Number(a) - Number(b)),
    faixas: [...faixaTotals.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]),
  };
  return data;
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
        <td>${r.NM_MUNICIPIO}</td>
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

function groupBy(rows, key, metric) {
  const map = new Map();
  rows.forEach((r) => {
    map.set(r[key], (map.get(r[key]) || 0) + Number(r[metric] || 0));
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function applyFilters() {
  const municipio = document.getElementById('municipioSelect').value;
  const zona = document.getElementById('zonaSelect').value;
  const faixa = document.getElementById('faixaSelect').value;

  const filteredCube = dashboardData.filterCube.filter((r) =>
    (municipio === 'TODOS' || r.NM_MUNICIPIO === municipio) &&
    (zona === 'TODAS' || r.ZONA === zona) &&
    (faixa === 'TODAS' || r.FAIXA === faixa)
  );

  const totalEleitoresAbaEleitores = filteredCube.reduce((acc, r) => acc + Number(r.eleitores || 0), 0);
  const totalBiometria = filteredCube.reduce((acc, r) => acc + Number(r.biometria || 0), 0);
  const totalDeficiencia = filteredCube.reduce((acc, r) => acc + Number(r.deficiencia || 0), 0);
  const totalNomeSocial = filteredCube.reduce((acc, r) => acc + Number(r.nomeSocial || 0), 0);

  const byMunicipio = groupBy(filteredCube, 'NM_MUNICIPIO', 'eleitores');
  const totalsByMunicipioMap = new Map(byMunicipio);

  const scopedMunicipios = dashboardData.municipios
    .map((m) => ({ ...m, eleitores: totalsByMunicipioMap.get(m.NM_MUNICIPIO) || 0 }))
    .filter((m) => m.eleitores > 0)
    .sort((a, b) => b.eleitores - a.eleitores);

  const totalEleitoresAbaMunicipio = scopedMunicipios.reduce((acc, m) => acc + Number(m.eleitores || 0), 0);

  const totals = {
    eleitores: totalEleitoresAbaEleitores,
    biometria: totalBiometria,
    deficiencia: totalDeficiencia,
    nomeSocial: totalNomeSocial,
    municipios: scopedMunicipios.length,
    zonas: zona === 'TODAS' ? dashboardData.totals.zonas : 1,
    secoes: dashboardData.totals.secoes,
    locais: dashboardData.totals.locais,
  };

  cards(totals);
  renderTable(scopedMunicipios);

  upsertChart(
    'cidadeChart',
    'bar',
    byMunicipio.map((x) => x[0]),
    byMunicipio.map((x) => x[1]),
    colors.blue
  );

  const faixaDist = groupBy(filteredCube, 'FAIXA', 'eleitores');
  upsertChart('faixaChart', 'line', faixaDist.map((x) => x[0]), faixaDist.map((x) => x[1]));

  const generoDist = groupBy(
    dashboardData.filterCubeGenero.filter((r) =>
      (municipio === 'TODOS' || r.NM_MUNICIPIO === municipio) &&
      (zona === 'TODAS' || r.ZONA === zona) &&
      (faixa === 'TODAS' || r.FAIXA === faixa)
    ),
    'DS_GENERO',
    'eleitores'
  );
  upsertChart('generoChart', 'doughnut', generoDist.map((x) => x[0]), generoDist.map((x) => x[1]), 'multi');

  // Mantidos gerais, pois o cubo dinamico atual cobre foco zona/faixa/municipio.
  upsertChart('racaChart', 'doughnut', dashboardData.charts.corRaca.labels, dashboardData.charts.corRaca.values, 'multi');
  upsertChart('instrucaoChart', 'bar', dashboardData.charts.instrucao.labels, dashboardData.charts.instrucao.values, colors.green2);
  upsertChart('estadoCivilChart', 'bar', dashboardData.charts.estadoCivil.labels, dashboardData.charts.estadoCivil.values, colors.red);

  upsertChart(
    'comparativoAbasChart',
    'bar',
    ['ELEITORES', 'ELEITORES POR MUNICIPIO'],
    [totalEleitoresAbaEleitores, totalEleitoresAbaMunicipio],
    colors.yellow
  );

  const diferenca = totalEleitoresAbaEleitores - totalEleitoresAbaMunicipio;
  document.getElementById('comparativoMeta').textContent =
    `Diferenca atual entre abas: ${n(diferenca)} eleitor(es).`;
}

function buildFilters() {
  const municipioSelect = document.getElementById('municipioSelect');
  const zonaSelect = document.getElementById('zonaSelect');
  const faixaSelect = document.getElementById('faixaSelect');

  const municipios = dashboardData.municipios
    .map((m) => m.NM_MUNICIPIO)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  municipioSelect.innerHTML = '<option value="TODOS">Todos os municipios</option>' +
    municipios.map((m) => `<option value="${m}">${m}</option>`).join('');

  zonaSelect.innerHTML = '<option value="TODAS">Todas</option>' +
    dashboardData.filters.zonas.map((z) => `<option value="${z}">${z}</option>`).join('');

  faixaSelect.innerHTML = '<option value="TODAS">Todas</option>' +
    dashboardData.filters.faixas.map((f) => `<option value="${f}">${f}</option>`).join('');

  [municipioSelect, zonaSelect, faixaSelect].forEach((el) => {
    el.addEventListener('change', applyFilters);
  });
}

async function init() {
  const res = await fetch('./data/eleitores_summary.json');
  dashboardData = await ensureFilterCubes(await res.json());

  document.getElementById('sourceInfo').textContent = `Fonte: Google Sheets (gid ${dashboardData.source.gid})`;
  document.getElementById('generatedAt').textContent = `Atualizado: ${new Date(dashboardData.generatedAt).toLocaleString('pt-BR')}`;

  buildFilters();
  applyFilters();
}

init().catch((err) => {
  console.error(err);
  alert('Falha ao carregar painel.');
});
