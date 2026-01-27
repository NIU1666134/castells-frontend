let markersLayer;

function normalitzarNom(nom) {
  if (!nom) return "";
  return nom
    .toLowerCase()
    .normalize("NFD")                  // separa accents
    .replace(/[\u0300-\u036f]/g, "")   // elimina accents
    .replace(/\bplaça\b|\bplaca\b|\bpl\b\.?/g, "") // treu plaça / pl.
    .replace(/\bdel\b|\bde\b|\bdels\b|\bles\b/g, "") // treu preposicions
    .replace(/[^a-z0-9 ]/g, "")        // fora símbols
    .replace(/\s+/g, " ")              // espais duplicats
    .trim();
}

// Construir cache de coordenades per lloc
function construirCoordenadesCache(dades) {
  coordenadesCache = {};

  dades.forEach(d => {
    const placa = d.show?.place ?? null;
    const ciutat = d.city?.name ?? null;
    const lat = d.show?.latitude;
    const lon = d.show?.longitude;

    if (!placa || !ciutat || !lat || !lon) return;

    const key = `${normalitzarNom(placa)}|${normalitzarNom(ciutat)}`;

    if (!coordenadesCache[key]) {
      coordenadesCache[key] = { lat, lon };
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

  // Aquesta actuació ja té coordenades
  if (d.show?.latitude && d.show?.longitude) {
    return { lat: d.show.latitude, lon: d.show.longitude };
  }

  // Clau normalitzada plaça + ciutat
  if (placa && ciutat) {
    const key = `${normalitzarNom(placa)}|${normalitzarNom(ciutat)}`;

    // Altres actuacions amb la mateixa plaça i ciutat
    if (coordenadesCache[key]) {
      return coordenadesCache[key];
    }

    // Coordenades explícites (fitxer coordenades.js)
    const originalKey = `${placa}, ${ciutat}`;
    if (coordenadesPlaces && coordenadesPlaces[originalKey]) {
      return coordenadesPlaces[originalKey];
    }
  }

  // Coordenada genèrica per ciutat
  if (ciutat && coordenadesCiutats[ciutat]) {
    return coordenadesCiutats[ciutat];
  }

  // Últim recurs (centre de Catalunya, no BCN)
  return { lat: 41.8, lon: 1.7 };
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

// Dibuixar mapa
function dibuixarMapa() {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  const grups = {};
  const dadesFiltrades = filtrarDadesMapa();

  dadesFiltrades.forEach(d => {
    const placa = d.show?.place ?? "Localització desconeguda";
    const ciutat = d.city?.name ?? "Ciutat desconeguda";

    const coords = obtenirCoordenades(d);
    if (!coords || coords.lat == null || coords.lon == null) return;

    const lat = Number(coords.lat);
    const lon = Number(coords.lon);
    if (isNaN(lat) || isNaN(lon)) return;

    const key = `${lat.toFixed(5)}|${lon.toFixed(5)}`;

    if (!grups[key]) {
      grups[key] = {
        lat,
        lon,
        placa,
        ciutat,
        estats: {}
      };
    }

    const estat = d.castell_result?.name || "Desconegut";
    grups[key].estats[estat] = (grups[key].estats[estat] || 0) + 1;
  });

  Object.values(grups).forEach(grup => {
    const { lat, lon, placa, ciutat, estats } = grup;

    const total = Object.values(estats).reduce((a, b) => a + b, 0);

    let popupHtml = `
      <b>${placa}</b><br>
      <i>${ciutat}</i><br>
      <b>Total castells:</b> ${total}<br>
      <ul>
    `;

    for (const [estat, count] of Object.entries(estats)) {
      popupHtml += `<li>${estat}: ${count}</li>`;
    }

    popupHtml += `</ul>`;

    L.marker([lat, lon])
      .addTo(markersLayer)
      .bindPopup(popupHtml);
  });
}

