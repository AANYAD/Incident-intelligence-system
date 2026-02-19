import { classifyIncident } from "./api.js";

window.handleReport = async function (e) {
    e.preventDefault();

    const desc = document.getElementById("desc").value.trim();
    const type = document.getElementById("incidentType").value;

    if (!desc) {
        alert("Please enter a description.");
        return;
    }

    // Get coordinates from location input, fallback to default
    let latitude = 28.569551;
    let longitude = 77.210648;
    const locationInput = document.getElementById("locationInput").value.trim();
    if (locationInput) {
        const parts = locationInput.split(",");
        if (parts.length === 2) {
            const parsedLat = parseFloat(parts[0]);
            const parsedLng = parseFloat(parts[1]);
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                latitude = parsedLat;
                longitude = parsedLng;
            }
        }
    }

    // Read image as base64 if uploaded
    let imageBase64 = null;
    const fileInput = document.getElementById("evidenceFile");
    if (fileInput && fileInput.files && fileInput.files[0]) {
        imageBase64 = await toBase64(fileInput.files[0]);
    }

    try {
        const btn = document.getElementById("submitBtn");
        const btnText = document.getElementById("btnText");
        btnText.innerText = "TRANSMITTING...";
        btn.style.backgroundColor = "#ff4d00";
        btn.style.color = "white";

        // Call AI classify — this saves the incident on backend too
        const ai = await classifyIncident(desc, latitude, longitude, imageBase64);

        // Store ref_id in localStorage for citizen tracking
        const trackedIncidents = JSON.parse(localStorage.getItem("myIncidents") || "[]");
        trackedIncidents.unshift({
            ref_id: ai.ref_id,
            description: desc,
            submitted_at: new Date().toLocaleString()
        });
        localStorage.setItem("myIncidents", JSON.stringify(trackedIncidents));

        btnText.innerText = "SENT ✓";
        btn.style.backgroundColor = "#00ff9d";
        btn.style.color = "black";

        setTimeout(() => {
            showDialog(
                "TRANSMISSION COMPLETE",
                `Incident filed successfully.\n\nYour Reference ID: ${ai.ref_id}\nSeverity: ${ai.severity}\nRouted to: ${ai.department}\nSLA: ${ai.sla_hours}h\n\nSave this ID to track your report.`,
                "success"
            );
            document.querySelector("form").reset();
            document.getElementById('dropZone').classList.remove('has-image');
            document.getElementById('previewImg').style.display = 'none';
            document.querySelector('.file-label-text').style.display = 'block';
            document.getElementById('locStatus').innerText = "WAITING FOR SATELLITE...";
            document.getElementById('locStatus').style.color = "#666";
            btnText.innerText = "Transmit Data";
            btn.style.backgroundColor = "white";
            btn.style.color = "black";

            // Refresh tracking panel
            renderTrackingPanel();
        }, 800);

    } catch (err) {
        console.error("Submission error:", err);
        alert("Error submitting report: " + err.message);
    }
};

// Convert file to base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ========================
// CITIZEN TRACKING PANEL
// ========================
function renderTrackingPanel() {
    const panel = document.getElementById("trackingPanel");
    if (!panel) return;

    const myIncidents = JSON.parse(localStorage.getItem("myIncidents") || "[]");

    if (myIncidents.length === 0) {
        panel.innerHTML = '<div class="mono" style="color:#555;font-size:0.8rem;">No reports submitted yet.</div>';
        return;
    }

    panel.innerHTML = myIncidents.map(i => `
        <div class="track-item" id="track-${i.ref_id}">
            <div class="mono" style="font-size:0.75rem;color:#888;">
                <b style="color:#e0e0e0;">${i.ref_id}</b><br>
                ${i.description.substring(0, 50)}${i.description.length > 50 ? '...' : ''}<br>
                <span style="color:#555;">${i.submitted_at}</span>
            </div>
            <button class="track-btn" onclick="checkStatus('${i.ref_id}')">CHECK STATUS</button>
            <div id="status-${i.ref_id}" class="track-status"></div>
        </div>
    `).join('');
}

window.checkStatus = async function(refId) {
    const el = document.getElementById(`status-${refId}`);
    el.innerHTML = '<span class="mono" style="font-size:0.7rem;color:#666;">CHECKING...</span>';

    try {
        const res = await fetch(`http://127.0.0.1:8000/track/${refId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        const statusColor = data.status === "RESOLVED" ? "#00ff9d" : "#ff4d00";
        const severityColor = data.severity === "HIGH" ? "#ff4d00" : data.severity === "MEDIUM" ? "#ffcc00" : "#00bfff";

        el.innerHTML = `
            <div style="margin-top:6px;padding:8px;background:#1a1a1a;border:1px solid #333;border-radius:4px;">
                <div class="mono" style="font-size:0.72rem;line-height:1.8;">
                    Status: <b style="color:${statusColor};">${data.status}</b><br>
                    Severity: <b style="color:${severityColor};">${data.severity}</b><br>
                    Dept: <b>${data.department}</b><br>
                    ${data.resolved_at ? `<span style="color:#00ff9d;">✓ Resolved</span>` : ''}
                </div>
            </div>
        `;
    } catch (err) {
        el.innerHTML = '<span class="mono" style="font-size:0.7rem;color:#ff4d00;">Could not fetch status.</span>';
    }
};

// Init on load
window.addEventListener("DOMContentLoaded", () => {
    renderTrackingPanel();
});