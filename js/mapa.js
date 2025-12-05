let markersLayer;

// Construir cache de coordenades per lloc
function construirCoordenadesCache(dades) {
  coordenadesCache = {};
  dades.forEach(d => {
    const lloc = d.show?.place ?? d.city?.name ?? null;
    const lat = d.show?.latitude;
    const lon = d.show?.longitude;

    if (lloc && lat && lon) {
      if (!coordenadesCache[lloc]) {
        coordenadesCache[lloc] = { lat, lon };
      }
    }
  });
}

function inicialitzarMapa() {
  map = L.map("map").setView([41.3851, 2.1734], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  markersLayer = L.markerClusterGroup();
  map.addLayer(markersLayer);

  if (dadesCastells && dadesCastells.length > 0) {
    dibuixarMapa();
  }

  // Assignar esdeveniments per filtres mapa
  ['filterCollaMap', 'filterYearMap', 'filterTipusCastellMap', 'filterResultatMap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', dibuixarMapa);
    }
  });
}

// Obtenir coordenades (prioritzant dades, després cache, sinó genèric)
function obtenirCoordenades(d) {
  if (d.show?.latitude && d.show?.longitude) {
    return { lat: d.show.latitude, lon: d.show.longitude };
  }

  const lloc = d.show?.place ?? d.city?.name ?? null;
  if (lloc && coordenadesCache[lloc]) {
    return coordenadesCache[lloc];
  }

  return { lat: 41.7, lon: 1.6 }; // Coord genèrica Catalunya
}

// Omplir filtres de la secció mapa amb valors únics de dades
function omplirFiltresMapa() {
  const selectColla = document.getElementById('filterCollaMap');
  const selectYear = document.getElementById('filterYearMap');
  const selectTipusCastell = document.getElementById('filterTipusCastellMap');
  const selectResultat = document.getElementById('filterResultatMap');

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

// Filtrar dades per filtres de mapa
function filtrarDadesMapa() {
  const coll = document.getElementById('filterCollaMap').value || null;
  const any = document.getElementById('filterYearMap').value || null;
  const tipus = document.getElementById('filterTipusCastellMap').value || null;
  const res = document.getElementById('filterResultatMap').value || null;

  return dadesCastells.filter(d => {
    const collaname = d.colla?.name || "Desconeguda";
    const anyData = d.date ? new Date(d.date).getFullYear() : null;
    const tipusCastell = d.castell_type?.name || "Desconegut";
    const resultat = d.castell_result?.name || "Desconegut";

    return (coll ? collaname === coll : true) &&
           (any ? anyData == any : true) &&
           (tipus ? tipusCastell === tipus : true) &&
           (res ? resultat === res : true);
  });
}

function dibuixarMapa() {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  const grups = {};

  const dadesFiltrades = filtrarDadesMapa();

  dadesFiltrades.forEach(d => {
    const { lat, lon } = obtenirCoordenades(d);

    const lloc = d.show?.place ?? d.city?.name ?? "Localització desconeguda";
    const key = `${lat}_${lon}`;

    if (!grups[key]) {
      grups[key] = {
        lat,
        lon,
        lloc,
        estats: {}
      };
    }

    const estat = d.castell_result?.name || "Desconegut";
    grups[key].estats[estat] = (grups[key].estats[estat] || 0) + 1;
  });

  Object.values(grups).forEach(grup => {
    const { lat, lon, lloc, estats } = grup;

    const total = Object.values(estats).reduce((a, b) => a + b, 0);

    let popupHtml = `<b>${lloc}</b><br>Total castells: ${total}<br><ul>`;
    for (const [estat, count] of Object.entries(estats)) {
      popupHtml += `<li>${estat}: ${count}</li>`;
    }
    popupHtml += `</ul>`;

    L.marker([lat, lon])
      .addTo(markersLayer)
      .bindPopup(popupHtml);
  });
}
