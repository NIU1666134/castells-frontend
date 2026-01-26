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
  if (map) return; // si el mapa ja existeix, no fer res

  map = L.map("map").setView([41.3851, 2.1734], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  markersLayer = L.markerClusterGroup();
  map.addLayer(markersLayer);

  // Construir el cache de coordenades abans de dibuixar
  if (dadesCastells && dadesCastells.length > 0) {
    construirCoordenadesCache(dadesCastells);
  }

  // Omplir els filtres abans de dibuixar
  omplirFiltresMapa();

  // Dibuixar el mapa només un cop el cache està llest
  if (dadesCastells && dadesCastells.length > 0) {
    dibuixarMapa();
  }

  // Assignar esdeveniments dels filtres
  ['filterCollaMap', 'filterYearMap', 'filterTipusCastellMap', 'filterResultatMap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', dibuixarMapa);
    }
  });
}


const coordenadesCiutats = {
  "Barcelona": { lat: 41.3851, lon: 2.1734 },
  "Badalona": { lat: 41.4465, lon: 2.2453 },
  "Tarragona": { lat: 41.1189, lon: 1.2445 },
  "Girona": { lat: 41.9794, lon: 2.8214 },
  "Lleida": { lat: 41.6176, lon: 0.6200 },
  "Reus": { lat: 41.1561, lon: 1.1069 },
  "Valls": { lat: 41.2873, lon: 1.2519 },
  "Vilafranca del Penedès": { lat: 41.3467, lon: 1.6996 },
  "Terrassa": { lat: 41.5632, lon: 2.0089 },
  "Sabadell": { lat: 41.5486, lon: 2.1074 },
  "Cerdanyola del Vallès": { lat: 41.4913, lon: 2.1408 },
  "Sant Cugat del Vallès": { lat: 41.4667, lon: 2.0833 },
  "L’Hospitalet de Llobregat": { lat: 41.3667, lon: 2.1167 },
  "Mataró": { lat: 41.5381, lon: 2.4447 }
};

function obtenirCoordenades(d) {
  const placa = d.show?.place ?? null;
  const ciutat = d.city?.name ?? null;

  // Si la mateixa actuació ja té coordenades
  if (d.show?.latitude && d.show?.longitude) {
    return { lat: d.show.latitude, lon: d.show.longitude };
  }

  // Mirar si en altres actuacions ja hi ha coordenades per la mateixa plaça
  if (placa && coordenadesCache[placa]) {
    return coordenadesCache[placa];
  }

  // Mirar coordenades explícites de coordenadesPlaces (plaça + ciutat)
  if (placa && ciutat) {
    const key = `${placa}, ${ciutat}`;
    if (coordenadesPlaces && coordenadesPlaces[key]) {
      return coordenadesPlaces[key];
    }
  }

  // Coordenada genèrica segons ciutat
  if (ciutat && coordenadesCiutats[ciutat]) {
    return coordenadesCiutats[ciutat];
  }

  // Si no hi ha res, no posar coordenada
  return null;
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
    const coords = obtenirCoordenades(d);
    if (!coords) return; // ⚠️ saltar si no hi ha coordenades

    const { lat, lon } = coords;
    const lloc = d.show?.place ?? d.city?.name ?? "Localització desconeguda";

    // Guardar al cache per altres actuacions (punt 2)
    if (d.show?.latitude && d.show?.longitude) {
      coordenadesCache[lloc] = { lat: d.show.latitude, lon: d.show.longitude };
    }

    // Agrupar per nom del lloc
    if (!grups[lloc]) {
      grups[lloc] = {
        lat,
        lon,
        lloc,
        estats: {}
      };
    }

    const estat = d.castell_result?.name || "Desconegut";
    grups[lloc].estats[estat] = (grups[lloc].estats[estat] || 0) + 1;
  });

  Object.values(grups).forEach(grup => {
    const { lat, lon, lloc, estats } = grup;

    let total = Object.values(estats).reduce((a, b) => a + b, 0);

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


