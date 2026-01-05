window.addEventListener('DOMContentLoaded', () => {
  const startMap = (lat, lng, accuracy) => {
    const map = L.map('map').setView([lat, lng], 18);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">My awesome website</a>'
    }).addTo(map);

    L.marker([lat, lng]).addTo(map);

    L.circle([lat, lng], {
      color: 'green',
      fillColor: 'rgba(62, 240, 62, 1)',
      fillOpacity: 0.5,
      radius: accuracy
    }).addTo(map);
  };

  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    startMap(lat, lng, accuracy);
  });
});
