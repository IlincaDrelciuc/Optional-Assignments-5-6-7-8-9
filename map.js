window.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const toastEl = document.getElementById('toast');

  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const clearSearchBtn = document.getElementById('clearSearch');
  const locateBtn = document.getElementById('locateBtn');
  const searchResultsEl = document.getElementById('searchResults');

  const toolDistance = document.getElementById('toolDistance');
  const toolRoute = document.getElementById('toolRoute');
  const clearRouteBtn = document.getElementById('clearRoute');
  const clearMeasuresBtn = document.getElementById('clearMeasures');
  const toolInfo = document.getElementById('toolInfo');

  const nearbyRadius = document.getElementById('nearbyRadius');
  const nearbyValue = document.getElementById('nearbyValue');
  const showNearbyBtn = document.getElementById('showNearby');
  const clearNearbyBtn = document.getElementById('clearNearby');

  const fenceListEl = document.getElementById('fenceList');

  const baseLayerSelect = document.getElementById('baseLayerSelect');
  const applyBaseBtn = document.getElementById('applyBase');

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.display = 'none'; }, 2600);
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function fmtMeters(m) {
    if (!Number.isFinite(m)) return '—';
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${Math.round(m)} m`;
  }

  function metersToMiles(m) {
    return m / 1609.344;
  }

  function fmtMiles(m) {
    const mi = metersToMiles(m);
    if (mi >= 1) return `${mi.toFixed(2)} mi`;
    return `${(mi * 5280).toFixed(0)} ft`;
  }

  const markerSvgs = {
    home: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M32 2C20 2 10 12 10 24c0 18 22 38 22 38s22-20 22-38C54 12 44 2 32 2z" fill="#3be47a"/><path d="M22 28l10-10 10 10v12H22V28z" fill="#0b2b17"/><path d="M27 40v-7h10v7" fill="none" stroke="#0b2b17" stroke-width="3"/></svg>`),
    work: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M32 2C20 2 10 12 10 24c0 18 22 38 22 38s22-20 22-38C54 12 44 2 32 2z" fill="#4aa3ff"/><rect x="20" y="20" width="24" height="24" rx="3" fill="#081a33"/><path d="M24 24h4v4h-4zM30 24h4v4h-4zM36 24h4v4h-4zM24 30h4v4h-4zM30 30h4v4h-4zM36 30h4v4h-4zM28 36h8v8h-8z" fill="#4aa3ff"/></svg>`),
    fav: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M32 2C20 2 10 12 10 24c0 18 22 38 22 38s22-20 22-38C54 12 44 2 32 2z" fill="#ff4db8"/><path d="M32 43l-2.2-2C22 34.2 18 30.6 18 25.9 18 22 21 19 25 19c2.2 0 4.3 1.1 5.5 2.8C31.7 20.1 33.8 19 36 19c4 0 7 3 7 6.9 0 4.7-4 8.3-11.8 15.1L32 43z" fill="#2b0016"/></svg>`)
  };

  function iconFromType(t) {
    return L.icon({ iconUrl: markerSvgs[t] || markerSvgs.fav, iconSize: [36, 36], iconAnchor: [18, 34], popupAnchor: [0, -28] });
  }

  const categoryIcons = {
    restaurant: L.divIcon({ className: '', html: `<div style="width:14px;height:14px;border-radius:50%;background:#ffb703;border:2px solid rgba(0,0,0,.35)"></div>`, iconSize: [14,14], iconAnchor: [7,7] }),
    park: L.divIcon({ className: '', html: `<div style="width:14px;height:14px;border-radius:50%;background:#3be47a;border:2px solid rgba(0,0,0,.35)"></div>`, iconSize: [14,14], iconAnchor: [7,7] }),
    landmark: L.divIcon({ className: '', html: `<div style="width:14px;height:14px;border-radius:50%;background:#4aa3ff;border:2px solid rgba(0,0,0,.35)"></div>`, iconSize: [14,14], iconAnchor: [7,7] }),
    shop: L.divIcon({ className: '', html: `<div style="width:14px;height:14px;border-radius:50%;background:#ff4b4b;border:2px solid rgba(0,0,0,.35)"></div>`, iconSize: [14,14], iconAnchor: [7,7] })
  };

  const places = [
    { id: 'p1', name: 'Central Park', category: 'park', lat: 40.7829, lng: -73.9654, desc: 'Large city park with paths and lakes.', url: 'https://www.nycgovparks.org/parks/central-park' },
    { id: 'p2', name: 'Eiffel Tower', category: 'landmark', lat: 48.8584, lng: 2.2945, desc: 'Famous iron tower in Paris.', url: 'https://www.toureiffel.paris/' },
    { id: 'p3', name: 'Colosseum', category: 'landmark', lat: 41.8902, lng: 12.4922, desc: 'Ancient Roman amphitheatre.', url: 'https://parcocolosseo.it/' },
    { id: 'p4', name: 'Coffee Spot', category: 'restaurant', lat: 40.73061, lng: -73.935242, desc: 'Example cafe entry you can edit.', url: 'https://www.openstreetmap.org/' },
    { id: 'p5', name: 'Local Shop', category: 'shop', lat: 40.741895, lng: -73.989308, desc: 'Example shop entry you can edit.', url: 'https://www.openstreetmap.org/' }
  ];

  const baseLayers = {
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: '&copy; OpenStreetMap &copy; CARTO' }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '&copy; OpenStreetMap contributors, &copy; OpenTopoMap' }),
    terrain: L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', { maxZoom: 18, attribution: '&copy; Stamen, &copy; OpenStreetMap contributors' }),
    sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '&copy; Esri' })
  };

  let map = null;
  let currentBaseKey = 'osm';
  let userPos = null;
  let userMarker = null;
  let accuracyCircle = null;

  const overlays = {
    placesRestaurants: L.layerGroup(),
    placesParks: L.layerGroup(),
    placesLandmarks: L.layerGroup(),
    placesShops: L.layerGroup(),
    userMarkers: L.layerGroup(),
    measurements: L.layerGroup(),
    route: L.layerGroup(),
    nearby: L.layerGroup(),
    geofences: L.layerGroup()
  };

  const overlayLabels = {
    placesRestaurants: 'Restaurants',
    placesParks: 'Parks',
    placesLandmarks: 'Landmarks',
    placesShops: 'Shops',
    userMarkers: 'Your Markers',
    measurements: 'Measurements',
    route: 'Route',
    nearby: 'Nearby Places',
    geofences: 'Geofences'
  };

  function popupHtml({ name, desc, lat, lng, url }) {
    const gmaps = `https://www.google.com/maps?q=${lat},${lng}`;
    const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    return `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;min-width:220px">
        <div style="font-weight:900;font-size:14px;margin-bottom:6px">${name}</div>
        <div style="font-size:12px;opacity:.85;margin-bottom:8px">${desc || ''}</div>
        <div style="font-size:12px;margin-bottom:8px"><b>Coords:</b> ${coords}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a href="${gmaps}" target="_blank" rel="noopener noreferrer">Google Maps</a>
          ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
        </div>
      </div>
    `;
  }

  function addPlacesToLayers() {
    overlays.placesRestaurants.clearLayers();
    overlays.placesParks.clearLayers();
    overlays.placesLandmarks.clearLayers();
    overlays.placesShops.clearLayers();

    for (const p of places) {
      const icon = categoryIcons[p.category] || categoryIcons.landmark;
      const marker = L.marker([p.lat, p.lng], { icon });
      marker.bindPopup(popupHtml({ name: p.name, desc: p.desc, lat: p.lat, lng: p.lng, url: p.url }));
      if (p.category === 'restaurant') overlays.placesRestaurants.addLayer(marker);
      else if (p.category === 'park') overlays.placesParks.addLayer(marker);
      else if (p.category === 'landmark') overlays.placesLandmarks.addLayer(marker);
      else if (p.category === 'shop') overlays.placesShops.addLayer(marker);
    }
  }

  addPlacesToLayers();

  const geofences = [
    { id: 'f1', name: 'Fence A', lat: 48.8584, lng: 2.2945, radius: 350 },
    { id: 'f2', name: 'Fence B', lat: 41.8902, lng: 12.4922, radius: 500 }
  ];

  const fenceState = new Map();

  function renderFenceList() {
    fenceListEl.innerHTML = '';
    for (const f of geofences) {
      const div = document.createElement('div');
      div.className = 'resultItem';
      div.innerHTML = `<div class="name">${f.name}</div><div class="meta">${fmtMeters(f.radius)} radius</div><div class="actions"><button data-fly="${f.id}" type="button">Fly to</button></div>`;
      div.querySelector('button').addEventListener('click', () => {
        if (!map) return;
        map.flyTo([f.lat, f.lng], 16);
      });
      fenceListEl.appendChild(div);
    }
  }

  renderFenceList();

  function setupGeofencesOnMap() {
    overlays.geofences.clearLayers();
    for (const f of geofences) {
      const circle = L.circle([f.lat, f.lng], { radius: f.radius, color: '#ff4db8', fillColor: 'rgba(255,77,184,0.25)', fillOpacity: 0.6, weight: 2 });
      circle.bindPopup(popupHtml({ name: f.name, desc: `Geofence area (${fmtMeters(f.radius)})`, lat: f.lat, lng: f.lng, url: null }));
      overlays.geofences.addLayer(circle);
      fenceState.set(f.id, { inside: false });
    }
  }

  function handleFenceChecks(latlng) {
    if (!map) return;
    for (const f of geofences) {
      const d = map.distance([latlng.lat, latlng.lng], [f.lat, f.lng]);
      const inside = d <= f.radius;
      const state = fenceState.get(f.id) || { inside: false };
      if (inside !== state.inside) {
        state.inside = inside;
        fenceState.set(f.id, state);
        if (inside) {
          toast(`Entered ${f.name}`);
          alert(`Entered ${f.name}`);
        } else {
          toast(`Exited ${f.name}`);
          alert(`Exited ${f.name}`);
        }
      }
    }
  }

  let routePoints = [];
  let routeLine = null;
  let routeDistanceLabel = null;

  function clearRoute() {
    routePoints = [];
    overlays.route.clearLayers();
    routeLine = null;
    routeDistanceLabel = null;
    toast('Route cleared');
  }

  function updateRouteVisual() {
    overlays.route.clearLayers();
    if (routePoints.length === 0) return;

    routeLine = L.polyline(routePoints, { color: '#3be47a', weight: 4, opacity: 0.9 });
    overlays.route.addLayer(routeLine);

    let total = 0;
    for (let i = 1; i < routePoints.length; i++) {
      total += map.distance(routePoints[i - 1], routePoints[i]);
    }

    const last = routePoints[routePoints.length - 1];
    const html = `<div style="font-weight:900">Route</div><div>${fmtMeters(total)} (${fmtMiles(total)})</div>`;
    routeDistanceLabel = L.marker(last, { icon: L.divIcon({ className: '', html: `<div style="padding:6px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.7);color:#fff;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;font-size:12px">${html}</div>` }) });
    overlays.route.addLayer(routeDistanceLabel);
  }

  let measureMarkers = [];

  function clearMeasures() {
    overlays.measurements.clearLayers();
    measureMarkers = [];
    toast('Measurements cleared');
  }

  function doMeasure(latlng) {
    if (!userPos) {
      toast('No user location yet.');
      return;
    }
    const d = map.distance([userPos.lat, userPos.lng], [latlng.lat, latlng.lng]);
    const line = L.polyline([[userPos.lat, userPos.lng], [latlng.lat, latlng.lng]], { color: '#4aa3ff', weight: 3, opacity: 0.9, dashArray: '6 6' });
    overlays.measurements.addLayer(line);

    const label = L.marker(latlng, {
      icon: L.divIcon({
        className: '',
        html: `<div style="padding:6px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.7);color:#fff;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;font-size:12px">
          <div style="font-weight:900">Distance</div>
          <div>${fmtMeters(d)} (${fmtMiles(d)})</div>
        </div>`,
        iconAnchor: [0, 0]
      })
    });

    overlays.measurements.addLayer(label);
    measureMarkers.push({ line, label });
    toast(`Distance: ${fmtMeters(d)} / ${fmtMiles(d)}`);
  }

  function selectedMarkerType() {
    const el = document.querySelector('input[name="markerType"]:checked');
    return el ? el.value : 'fav';
  }

  function addUserMarker(latlng) {
    const t = selectedMarkerType();
    const icon = iconFromType(t);
    const name = t === 'home' ? 'Home' : t === 'work' ? 'Work' : 'Favorite';
    const desc = `User marker (${t})`;
    const marker = L.marker([latlng.lat, latlng.lng], { icon });
    marker.bindPopup(popupHtml({ name, desc, lat: latlng.lat, lng: latlng.lng, url: null }));
    overlays.userMarkers.addLayer(marker);
    toast(`Added ${name} marker`);
  }

  function makeOverlaysForControl() {
    const out = {};
    out[overlayLabels.placesRestaurants] = overlays.placesRestaurants;
    out[overlayLabels.placesParks] = overlays.placesParks;
    out[overlayLabels.placesLandmarks] = overlays.placesLandmarks;
    out[overlayLabels.placesShops] = overlays.placesShops;
    out[overlayLabels.userMarkers] = overlays.userMarkers;
    out[overlayLabels.nearby] = overlays.nearby;
    out[overlayLabels.route] = overlays.route;
    out[overlayLabels.measurements] = overlays.measurements;
    out[overlayLabels.geofences] = overlays.geofences;
    return out;
  }

  function applyBaseLayer(key) {
    if (!map) return;
    if (!baseLayers[key]) return;
    map.eachLayer((l) => {
      for (const k in baseLayers) {
        if (baseLayers[k] === l) map.removeLayer(l);
      }
    });
    baseLayers[key].addTo(map);
    currentBaseKey = key;
    toast(`Base layer: ${key}`);
  }

  function initMap(centerLatLng) {
    map = L.map('map', { zoomControl: true }).setView([centerLatLng.lat, centerLatLng.lng], 15);

    baseLayers[currentBaseKey].addTo(map);

    overlays.placesRestaurants.addTo(map);
    overlays.placesParks.addTo(map);
    overlays.placesLandmarks.addTo(map);
    overlays.placesShops.addTo(map);

    overlays.userMarkers.addTo(map);
    overlays.route.addTo(map);
    overlays.measurements.addTo(map);
    overlays.nearby.addTo(map);
    overlays.geofences.addTo(map);

    setupGeofencesOnMap();
    setupLayerControl();

    map.on('click', (e) => {
      if (toolDistance.checked) {
        doMeasure(e.latlng);
        return;
      }
      if (toolRoute.checked) {
        routePoints.push([e.latlng.lat, e.latlng.lng]);
        updateRouteVisual();
        return;
      }
      addUserMarker(e.latlng);
    });
  }

  let layerControl = null;
  function setupLayerControl() {
    if (!map) return;
    if (layerControl) layerControl.remove();
    const base = {
      OpenStreetMap: baseLayers.osm,
      Dark: baseLayers.dark,
      Topographic: baseLayers.topo,
      Terrain: baseLayers.terrain,
      Satellite: baseLayers.sat
    };
    layerControl = L.control.layers(base, makeOverlaysForControl(), { collapsed: true }).addTo(map);
  }

  function showSearchResults(items, title) {
    searchResultsEl.innerHTML = '';
    const t = document.createElement('div');
    t.className = 'resultItem';
    t.innerHTML = `<div class="name">${title}</div><div class="meta">${items.length} result(s)</div>`;
    searchResultsEl.appendChild(t);

    for (const it of items) {
      const div = document.createElement('div');
      div.className = 'resultItem';
      div.innerHTML = `
        <div class="name">${it.name}</div>
        <div class="meta">${it.meta}</div>
        <div class="actions">
          <button type="button" data-fly="${it.id}">Fly</button>
          <button type="button" data-open="${it.id}">Open popup</button>
        </div>
      `;
      div.querySelector('[data-fly]').addEventListener('click', () => {
        if (!map) return;
        map.flyTo([it.lat, it.lng], 17);
      });
      div.querySelector('[data-open]').addEventListener('click', () => {
        it._marker?.openPopup();
      });
      searchResultsEl.appendChild(div);
    }
  }

  function clearSearchUI() {
    searchInput.value = '';
    searchResultsEl.innerHTML = '';
  }

  function searchPlacesByName(q) {
    const qq = q.trim().toLowerCase();
    if (!qq) return [];
    const result = [];
    const all = [
      ...overlays.placesRestaurants.getLayers(),
      ...overlays.placesParks.getLayers(),
      ...overlays.placesLandmarks.getLayers(),
      ...overlays.placesShops.getLayers()
    ];
    for (const p of places) {
      if (!p.name.toLowerCase().includes(qq)) continue;
      const marker = all.find(m => {
        const ll = m.getLatLng();
        return Math.abs(ll.lat - p.lat) < 1e-9 && Math.abs(ll.lng - p.lng) < 1e-9;
      });
      result.push({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        meta: `${p.category} • ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
        _marker: marker
      });
    }
    return result;
  }

  async function geocodeNominatim(q) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    return data.map((d, i) => ({
      id: `g${i}`,
      name: d.display_name,
      lat: Number(d.lat),
      lng: Number(d.lon),
      meta: `Geocoded result`,
      _marker: null
    }));
  }

  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) return;
    const local = searchPlacesByName(q);
    let geo = [];
    try {
      geo = await geocodeNominatim(q);
    } catch {
      geo = [];
    }

    const items = [...local];
    for (const g of geo) {
      const marker = L.marker([g.lat, g.lng], { icon: categoryIcons.landmark });
      marker.bindPopup(popupHtml({ name: g.name, desc: 'Geocoding result', lat: g.lat, lng: g.lng, url: null }));
      overlays.nearby.addLayer(marker);
      g._marker = marker;
      items.push(g);
    }

    showSearchResults(items, `Search: "${q}"`);
    if (items[0] && map) map.flyTo([items[0].lat, items[0].lng], 16);
  }

  searchBtn.addEventListener('click', () => { doSearch(); });
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  clearSearchBtn.addEventListener('click', () => { clearSearchUI(); });

  toolDistance.addEventListener('change', () => {
    if (toolDistance.checked) toolRoute.checked = false;
    toolInfo.textContent = toolDistance.checked ? 'Measure is ON. Click the map to measure from your location.' : toolRoute.checked ? 'Route is ON. Click to add route points.' : 'Turn on Measure or Route, then click the map.';
  });

  toolRoute.addEventListener('change', () => {
    if (toolRoute.checked) toolDistance.checked = false;
    toolInfo.textContent = toolRoute.checked ? 'Route is ON. Click to add route points.' : toolDistance.checked ? 'Measure is ON. Click the map to measure from your location.' : 'Turn on Measure or Route, then click the map.';
  });

  clearRouteBtn.addEventListener('click', clearRoute);
  clearMeasuresBtn.addEventListener('click', clearMeasures);

  function updateNearbyLabel() {
    nearbyValue.textContent = `${nearbyRadius.value} m`;
  }

  updateNearbyLabel();
  nearbyRadius.addEventListener('input', updateNearbyLabel);

  function clearNearby() {
    overlays.nearby.clearLayers();
    toast('Nearby cleared');
  }

  clearNearbyBtn.addEventListener('click', clearNearby);

  function showNearby() {
    if (!map || !userPos) {
      toast('No user location yet.');
      return;
    }
    overlays.nearby.clearLayers();
    const r = Number(nearbyRadius.value);
    const center = L.latLng(userPos.lat, userPos.lng);

    const allPlaces = [];
    for (const p of places) allPlaces.push(p);

    const nearby = [];
    for (const p of allPlaces) {
      const d = center.distanceTo([p.lat, p.lng]);
      if (d <= r) nearby.push({ p, d });
    }

    for (const { p, d } of nearby) {
      const icon = categoryIcons[p.category] || categoryIcons.landmark;
      const marker = L.marker([p.lat, p.lng], { icon });
      marker.bindPopup(popupHtml({ name: p.name, desc: `${p.desc} • ${fmtMeters(d)} away`, lat: p.lat, lng: p.lng, url: p.url }));
      overlays.nearby.addLayer(marker);
    }

    const circle = L.circle([userPos.lat, userPos.lng], { radius: r, color: '#ffb703', fillColor: 'rgba(255,183,3,0.18)', fillOpacity: 0.6, weight: 2 });
    overlays.nearby.addLayer(circle);

    toast(`${nearby.length} place(s) within ${fmtMeters(r)}`);
  }

  showNearbyBtn.addEventListener('click', showNearby);

  applyBaseBtn.addEventListener('click', () => {
    applyBaseLayer(baseLayerSelect.value);
  });

  function setUserLocation(lat, lng, accuracy) {
    userPos = { lat, lng, accuracy };

    if (!map) initMap({ lat, lng });

    if (!userMarker) {
      userMarker = L.marker([lat, lng]).addTo(map);
    } else {
      userMarker.setLatLng([lat, lng]);
    }

    if (!accuracyCircle) {
      accuracyCircle = L.circle([lat, lng], { color: 'green', fillColor: 'rgba(62, 240, 62, 1)', fillOpacity: 0.5, radius: accuracy }).addTo(map);
    } else {
      accuracyCircle.setLatLng([lat, lng]);
      accuracyCircle.setRadius(accuracy);
    }

    handleFenceChecks({ lat, lng });
  }

  function geolocationError(err) {
    if (err && err.code === 1) setStatus('Permission denied. Please allow location access.');
    else if (err && err.code === 2) setStatus('Position unavailable.');
    else if (err && err.code === 3) setStatus('Location request timed out.');
    else setStatus('Geolocation error.');
    toast(statusEl.textContent);
  }

  function requestLocationOnce() {
    if (!('geolocation' in navigator)) {
      setStatus('Geolocation is not supported by your browser.');
      toast('Geolocation not supported');
      return;
    }

    setStatus('Requesting location…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        setStatus(`Location: ${lat.toFixed(5)}, ${lng.toFixed(5)} • accuracy ${fmtMeters(acc)}`);
        setUserLocation(lat, lng, acc);
        if (map) map.setView([lat, lng], 17);
      },
      geolocationError,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  let watchId = null;

  function startWatch() {
    if (!('geolocation' in navigator)) return;
    if (watchId != null) return;

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        setStatus(`Tracking: ${lat.toFixed(5)}, ${lng.toFixed(5)} • accuracy ${fmtMeters(acc)}`);
        setUserLocation(lat, lng, acc);
      },
      geolocationError,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  locateBtn.addEventListener('click', () => {
    requestLocationOnce();
    startWatch();
    toast('Locating…');
  });

  requestLocationOnce();
  startWatch();
});
