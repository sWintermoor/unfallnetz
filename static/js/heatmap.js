// static/js/heatmap.js

const map = L.map('map').setView([53.5511, 9.9937], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap-Mitwirkende'
}).addTo(map);

fetch('/api/heatmap')
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(geojson => {
    const heatData = geojson.features.map(f => {
      const [lon, lat] = f.geometry.coordinates;
      // Intensität ggf. normalisieren: f.properties.gefahrenstufe / MAX
      const intensity = f.properties.gefahrenstufe || 1;
      return [lat, lon, intensity];
    });

    L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17
    }).addTo(map);
  })
  .catch(err => {
    console.error('Fehler beim Laden der Heatmap-Daten:', err);
  });
