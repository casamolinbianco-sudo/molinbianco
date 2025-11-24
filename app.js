/* app.js - carica data.json, genera Leaflet map, filtri e popup con distanza */
(async function(){
  // Casa Molin Bianco (convertite da DMS fornite)
  const CASA = { lat: 43 + 27/60 + 5.9/3600, lon: 11 + 50/60 + 43.0/3600 };

  // simple haversine (km)
  function haversine(lat1, lon1, lat2, lon2){
    const R = 6371;
    const toRad = v => v * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // color mapping for marker types (matching the 'Tipo' strings in data.json)
  const colorFor = (tipo)=>{
    tipo = (tipo||'').toLowerCase();
    if(tipo.includes('multipiano')) return '#005eff';
    if(tipo.includes('raso') || tipo.includes('parcheggio a raso') || tipo.includes('strisce') || tipo.includes('superficie')) return '#009d37';
    if(tipo.includes('autorimessa') || tipo.includes('privata')) return '#d90000';
    if(tipo.includes('stazione')) return '#ff7f0e';
    return '#6b7280';
  };

  // create map
  const map = L.map('map', { zoomControl: true }).setView([CASA.lat, CASA.lon], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // marker layer group
  const markersGroup = L.layerGroup().addTo(map);
  let allMarkers = [];

  // load data.json (must be at repo root)
  let data;
  try{
    const resp = await fetch('data.json');
    data = await resp.json();
  }catch(err){
    console.error('Errore caricamento data.json', err);
    alert('Impossibile caricare data.json. Controlla che il file esista nella root del repo.');
    return;
  }

  // build markers
  data.forEach(item=>{
    if(item.lat == null || item.lon == null) return;
    const dist = (typeof item.distanza_km === 'number' && item.distanza_km >= 0)
                ? item.distanza_km
                : haversine(CASA.lat, CASA.lon, item.lat, item.lon);
    const color = colorFor(item.tipo);
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<span style="display:inline-block;width:18px;height:18px;background:${color};border-radius:4px;border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.2)"></span>`,
      iconSize: [18,18],
      iconAnchor: [9,9]
    });
    const marker = L.marker([item.lat, item.lon], { icon });
    const popupHtml = `
      <div style="font-size:13px;line-height:1.2">
        <strong>${item.name}</strong><br/>
        <em>${item.tipo}</em><br/>
        ${item.address ? item.address + '<br/>' : ''}
        <strong>Orari/Tariffe:</strong> ${item.orari || 'N/D'}<br/>
        <strong>Distanza:</strong> ${dist.toFixed(2)} km<br/>
        ${item.sito ? `<a href="${item.sito}" target="_blank" rel="noopener">Fonte</a><br/>` : ''}
      </div>
    `;
    marker.bindPopup(popupHtml);
    marker.item = item;
    marker.item._computed_distance = dist;
    markersGroup.addLayer(marker);
    allMarkers.push(marker);
  });

  // add Casa marker
  const casaIcon = L.divIcon({ html: '<span style="font-size:20px">★</span>', className:'casa-icon', iconSize:[24,24], iconAnchor:[12,12]});
  const casaMarker = L.marker([CASA.lat, CASA.lon], { icon: casaIcon }).addTo(map);
  casaMarker.bindPopup('<strong>Casa Molin Bianco</strong><br>Via Arturo Chiari 4');

  // fit bounds
  const group = L.featureGroup(allMarkers.concat([casaMarker]));
  if(allMarkers.length) map.fitBounds(group.getBounds().pad(0.12));

  // build sidebar listings (optional: we'll append a small list)
  const listContainer = document.createElement('div');
  listContainer.style.marginTop = '10px';
  // create collapsible quick-list
  const quickList = document.createElement('div');
  quickList.style.display = 'flex';
  quickList.style.flexDirection = 'column';
  quickList.style.gap = '6px';
  quickList.style.maxHeight = '220px';
  quickList.style.overflow = 'auto';
  // append to sidebar after filters
  const sidebar = document.getElementById('sidebar');
  sidebar.appendChild(quickList);

  function refreshList(visibleMarkers){
    quickList.innerHTML = '';
    visibleMarkers.slice(0,200).forEach(m=>{
      const btn = document.createElement('button');
      btn.className = 'list-item-btn';
      btn.style.border = '1px solid #eee';
      btn.style.background = '#fff';
      btn.style.padding = '8px';
      btn.style.borderRadius = '8px';
      btn.style.textAlign = 'left';
      btn.style.cursor = 'pointer';
      btn.textContent = `${m.item.name} — ${m.item.tipo} — ${m.item._computed_distance.toFixed(2)} km`;
      btn.onclick = ()=> { map.setView(m.getLatLng(), 17); m.openPopup(); };
      quickList.appendChild(btn);
    });
    if(visibleMarkers.length === 0){
      quickList.innerHTML = '<div style="color:var(--muted);font-size:13px">Nessun parcheggio visibile con i filtri selezionati.</div>';
    }
  }

  // filter logic mapping: checkbox values -> match criteria
  function matchesFilter(marker, filters){
    const tipo = (marker.item.tipo || '').toLowerCase();
    // multipiano check
    const wantMultipiano = filters.multipiano;
    const wantSuperficie = filters.superficie;
    const wantPrivato = filters.privato;
    // decide matches
    if(wantMultipiano && tipo.includes('multipiano')) return true;
    if(wantSuperficie && (tipo.includes('raso') || tipo.includes('parcheggio a raso') || tipo.includes('strisce') || tipo.includes('superficie'))) return true;
    if(wantPrivato && (tipo.includes('privat') || tipo.includes('autorimessa') || tipo.includes('park'))) return true;
    return false;
  }

  // apply current checkboxes
  function applyFilters(){
    const multipiano = !!document.querySelector('input.filter[value="multipiano"]').checked;
    const superficie = !!document.querySelector('input.filter[value="superficie"]').checked;
    const privato = !!document.querySelector('input.filter[value="privato"]').checked;
    const filters = { multipiano, superficie, privato };
    markersGroup.clearLayers();
    const visible = [];
    allMarkers.forEach(m=>{
      if(matchesFilter(m, filters)){
        markersGroup.addLayer(m);
        visible.push(m);
      }
    });
    // fit bounds to visible + casa
    if(visible.length > 0){
      const groupVis = L.featureGroup(visible.concat([casaMarker]));
      map.fitBounds(groupVis.getBounds().pad(0.12));
    } else {
      // if none visible, center on casa
      map.setView([CASA.lat, CASA.lon], 13);
    }
    refreshList(visible);
  }

  // attach listeners to checkboxes
  document.querySelectorAll('input.filter').forEach(cb=>{
    cb.addEventListener('change', applyFilters);
  });

  // initial list refresh
  applyFilters();

  // small legend box (inserted into DOM)
  const legend = document.createElement('div');
  legend.className = 'legend-compact';
  legend.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px">Legenda</div>
    <div class="legend-row"><span class="legend-swatch" style="background:#005eff"></span> Multipiano</div>
    <div class="legend-row"><span class="legend-swatch" style="background:#009d37"></span> Superficie / Strisce</div>
    <div class="legend-row"><span class="legend-swatch" style="background:#d90000"></span> Privato / Autorimessa</div>
    <div class="legend-row"><span style="font-size:16px">★</span> Casa Molin Bianco</div>
  `;
  document.body.appendChild(legend);

})();
