import { getIncidents } from "./api.js";

async function loadAdminData() {
    const incidents = await getIncidents();
    console.log("Admin incidents:", incidents);
}

function renderHeatmap(incidents) {
    if (!window.L || !window.L.heatLayer) return;

    const map = L.map("hotspotMap").setView([20.5937, 78.9629], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18
    }).addTo(map);

    const heatPoints = incidents
        .filter(i => i.location && i.location.includes(","))
        .map(i => {
            const [lat, lng] = i.location.split(",").map(Number);
            return [lat, lng, i.severity === "HIGH" ? 1 : 0.4];
        });

    L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 10
    }).addTo(map);
}
window.onload = function () {
    const incidents = JSON.parse(localStorage.getItem("urbanPulseData")) || [];
    renderHeatmap(incidents);
};


window.onload = loadAdminData;
