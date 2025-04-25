let startX = 0;
let isDragging = false;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Touch handling for sidebar
document.getElementById('sidebar').addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
});

document.getElementById('sidebar').addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    if (currentX - startX > 50) { // Swipe right to close
        toggleSidebar();
        isDragging = false;
    }
});

// Mouse drag handling for sidebar
document.getElementById('sidebar').addEventListener('mousedown', (e) => {
    startX = e.clientX;
    isDragging = true;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    if (e.clientX - startX > 50) { // Drag right to close
        toggleSidebar();
        isDragging = false;
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

mapboxgl.accessToken = 'euertoken';
const map = new mapboxgl.Map({
    container: 'map', // ID of the map container
    style: 'mapbox://styles/mapbox/streets-v11', // Mapbox style
    center: [9.993682, 53.551086], // Coordinates of Hamburg (longitude, latitude)
    zoom: 12 // Initial zoom level
});

// Add navigation controls to the map
map.addControl(new mapboxgl.NavigationControl());