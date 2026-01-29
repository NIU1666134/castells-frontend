let dadesCastells = [];
let map;
let coordenadesCache = {};

// Carregar dades des de l'API proxy (Node.js)
async function carregarDades() {
  const loader = document.getElementById('loader');
  loader.style.display = 'flex'; // mostrar loader i tapar la pàgina

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
    if (!map) {
      inicialitzarMapa();
    } else {
      dibuixarMapa();
    }

  } catch (err) {
    console.error("ERROR carregant dades API:", err);
  } finally {
    loader.style.display = 'none'; // amagar loader quan tot ha acabat
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

// Filtrar dades segons selecció de filtres (ús genèric)
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

// Dibuixar gràfics a partir de les dades filtrades i tipus de visualització
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

  if (tipusVisualitzacio === 'any') {
    dadesFiltrades.forEach(d => {
      const any = d.date ? new Date(d.date).getFullYear() : "Desconegut";
      counts[any] = (counts[any] || 0) + 1;
    });
  } else if (tipusVisualitzacio === 'colla') {
    dadesFiltrades.forEach(d => {
      const collaname = d.colla?.name || "Desconeguda";
      counts[collaname] = (counts[collaname] || 0) + 1;
    });
  } else if (tipusVisualitzacio === 'tipusCastell') {
    dadesFiltrades.forEach(d => {
      const tipus = d.castell_type?.name || "Desconegut";
      counts[tipus] = (counts[tipus] || 0) + 1;
    });
  } else if (tipusVisualitzacio === 'resultat') {
    dadesFiltrades.forEach(d => {
      const res = d.castell_result?.name || "Desconegut";
      counts[res] = (counts[res] || 0) + 1;
    });
  }

  const ctx = document.getElementById('chartCastells').getContext('2d');
  if (window.chartInstance) window.chartInstance.destroy();

  window.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: 'rgba(255,42,26,0.45)',
        borderColor: 'rgba(255,42,26,1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,

      plugins: {
        legend: {
          display: false
        }
      },

      scales: {
        x: {
          ticks: {
            font: {
              family: 'Inter'
            }
          }
        },

        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: {
              family: 'Inter'
            }
          }
        }
      }
    }
  });
}

// Actualitzar gràfic quan canviïn els filtres
['filterColla', 'filterYear', 'filterTipusCastell', 'filterResultat', 'filterVisualitzacio'].forEach(id => {
  document.getElementById(id).addEventListener('change', dibuixarGrafics);
});

// Executar càrrega de dades quan la pàgina està llesta
window.addEventListener('load', carregarDades);

