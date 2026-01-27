let dadesCastells = [];
let map;
let coordenadesCache = {};
let chartInstance;

// Carregar dades des de l'API proxy
async function carregarDades() {
  const loader = document.getElementById('loader');
  loader.style.display = 'flex'; // mostrar loader

  console.log("Iniciant càrrega de dades...");

  try {
    const response = await fetch("https://castells-proxy.onrender.com/api/actuacions");
    const data = await response.json();

    if (Array.isArray(data.results)) {
      dadesCastells = data.results;
      console.log("Dades carregades correctament:", dadesCastells.length, "items");
    } else {
      dadesCastells = [];
      console.warn("L'API no ha retornat un array vàlid.");
    }

    // Construir cache de coordenades
    construirCoordenadesCache(dadesCastells);

    // Omplir filtres gràfics i mapa
    omplirFiltres();
    omplirFiltresMapa();

    // Dibuixar gràfics i mapa
    dibuixarGrafics();
    if (!map) inicialitzarMapa(); else dibuixarMapa();

  } catch (err) {
    console.error("ERROR carregant dades API:", err);
  } finally {
    loader.style.display = 'none'; // amagar loader
  }
}

// Omplir filtres de la secció de gràfics
function omplirFiltres() {
  const selectColla = document.getElementById('filterColla');
  const selectYear = document.getElementById('filterYear');
  const selectTipusCastell = document.getElementById('filterTipusCastell');
  const selectResultat = document.getElementById('filterResultat');

  const colles = [...new Set(dadesCastells.map(d => d.colla?.name || "Desconeguda"))].sort();
  const anys = [...new Set(dadesCastells.map(d => d.date ? new Date(d.date).getFullYear() : null).filter(y => y !== null))].sort();
  const tipusCastells = [...new Set(dadesCastells.map(d => d.castell_type?.name || "Desconegut"))].sort();
  const resultats = [...new Set(dadesCastells.map(d => d.castell_result?.name || "Desconegut"))].sort();

  [selectColla, selectYear, selectTipusCastell, selectResultat].forEach(sel => {
    Array.from(sel.options)
      .filter(opt => opt.value !== "")
      .forEach(opt => sel.removeChild(opt));
  });

  colles.forEach(colla => {
    const option = document.createElement('option');
    option.value = colla;
    option.textContent = colla;
    selectColla.appendChild(option);
  });

  anys.forEach(any => {
    const option = document.createElement('option');
    option.value = any;
    option.textContent = any;
    selectYear.appendChild(option);
  });

  tipusCastells.forEach(tipus => {
    const option = document.createElement('option');
    option.value = tipus;
    option.textContent = tipus;
    selectTipusCastell.appendChild(option);
  });

  resultats.forEach(res => {
    const option = document.createElement('option');
    option.value = res;
    option.textContent = res;
    selectResultat.appendChild(option);
  });
}

// Filtrar dades segons selecció de filtres
function filtrarDades(filters = {}) {
  return dadesCastells.filter(d => {
    const collaname = d.colla?.name || "Desconeguda";
    const any = d.date ? new Date(d.date).getFullYear() : null;
    const tipus = d.castell_type?.name || "Desconegut";
    const resultat = d.castell_result?.name || "Desconegut";

    return (filters.colla ? collaname === filters.colla : true)
      && (filters.any ? any == filters.any : true)
      && (filters.tipusCastell ? tipus === filters.tipusCastell : true)
      && (filters.resultat ? resultat === filters.resultat : true);
  });
}

// Dibuixar gràfics
function dibuixarGrafics() {
  const filters = {
    colla: document.getElementById('filterColla').value || null,
    any: document.getElementById('filterYear').value || null,
    tipusCastell: document.getElementById('filterTipusCastell').value || null,
    resultat: document.getElementById('filterResultat').value || null
  };

  const dadesFiltrades = filtrarDades(filters);
  const tipusVisualitzacio = document.getElementById('filterVisualitzacio').value;

  let counts = {};

  dadesFiltrades.forEach(d => {
    let key;
    if (tipusVisualitzacio === 'any') key = d.date ? new Date(d.date).getFullYear() : "Desconegut";
    else if (tipusVisualitzacio === 'colla') key = d.colla?.name || "Desconeguda";
    else if (tipusVisualitzacio === 'tipusCastell') key = d.castell_type?.name || "Desconegut";
    else if (tipusVisualitzacio === 'resultat') key = d.castell_result?.name || "Desconegut";
    counts[key] = (counts[key] || 0) + 1;
  });

  const ctx = document.getElementById('chartCastells').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Nombre de castells',
        data: Object.values(counts),
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

// Detectar canvis en filtres
['filterColla', 'filterYear', 'filterTipusCastell', 'filterResultat', 'filterVisualitzacio'].forEach(id => {
  document.getElementById(id).addEventListener('change', dibuixarGrafics);
});

// Carregar dades quan la pàgina està llesta
window.addEventListener('load', carregarDades);

