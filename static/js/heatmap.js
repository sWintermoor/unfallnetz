document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([53.5511, 9.9937], 12);
  
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
  
    fetch('/api/heatmap')
      .then(res => res.json())
      .then(json => {
        const points = json.features.map(f => {
          const [lon, lat] = f.geometry.coordinates;
          const stufe = f.properties.gefahrenstufe;
          const w = stufe === 2 ? 1 : stufe === 1 ? 0.5 : 0;
          return [lat, lon, w];
        });
        L.heatLayer(points, {
          radius: 25,
          gradient: { 0.0: 'green', 0.5: 'yellow', 1.0: 'red' }
        }).addTo(map);
      })
      .catch(console.error);
  });
  