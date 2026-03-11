import { classifyIncident } from "./api.js";

window.handleReport = async function (e) {
    e.preventDefault();

    const desc     = document.getElementById("desc").value.trim();
    const category = document.getElementById("incidentType").value;  // ← now passed to API

    if (!desc) {
        alert("Please enter a description.");
        return;
    }

    // Get coordinates from location input, fallback to Delhi default
    let latitude  = 28.569551;
    let longitude = 77.210648;
    const locationInput = document.getElementById("locationInput").value.trim();
    if (locationInput) {
        const parts = locationInput.split(",");
        if (parts.length === 2) {
            const parsedLat = parseFloat(parts[0]);
            const parsedLng = parseFloat(parts[1]);
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                latitude  = parsedLat;
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
        const btn     = document.getElementById("submitBtn");
        const btnText = document.getElementById("btnText");
        btnText.innerText          = "TRANSMITTING...";
        btn.style.backgroundColor  = "#ff4d00";
        btn.style.color            = "white";

        // Classify + save incident (description, category, coords, image all in one call)
        const ai = await classifyIncident(desc, category, latitude, longitude, imageBase64);

        // Store in localStorage for citizen tracking panel
        const tracked = JSON.parse(localStorage.getItem("myIncidents") || "[]");
        tracked.unshift({
            ref_id:       ai.ref_id,
            description:  desc,
            category:     category,
            submitted_at: new Date().toLocaleString()
        });
        localStorage.setItem("myIncidents", JSON.stringify(tracked));

        btnText.innerText = "SENT ✓";
        btn.style.backgroundColor = "#00ff9d";
        btn.style.color           = "black";

        setTimeout(() => {
            showDialog(
                "TRANSMISSION COMPLETE",
                `Incident filed successfully.\n\nReference ID: ${ai.ref_id}\nSeverity: ${ai.severity}\nRouted to: ${ai.department}\nSLA: ${ai.sla_hours}h\n\nSave this ID to track your report.`,
                "success"
            );
            // Reset form
            document.querySelector("form").reset();
            const dropZone = document.getElementById('dropZone');
            if (dropZone) dropZone.classList.remove('has-image');
            const preview = document.getElementById('previewImg');
            if (preview) preview.style.display = 'none';
            const fileLabel = document.querySelector('.file-label-text');
            if (fileLabel) fileLabel.style.display = 'block';
            const locStatus = document.getElementById('locStatus');
            if (locStatus) { locStatus.innerText = "WAITING FOR SATELLITE..."; locStatus.style.color = "#666"; }
            btnText.innerText             = "Transmit Data";
            btn.style.backgroundColor     = "white";
            btn.style.color               = "black";

            renderTrackingPanel();
        }, 800);

    } catch (err) {
        console.error("Submission error:", err);
        const btn     = document.getElementById("submitBtn");
        const btnText = document.getElementById("btnText");
        btnText.innerText             = "Transmit Data";
        btn.style.backgroundColor     = "white";
        btn.style.color               = "black";
        alert("Error submitting report: " + err.message);
    }
};

// Convert file to base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ── STATUS COLOR HELPER ───────────────────────────────────────────────
function statusColor(s) {
    if (s === "RESOLVED")    return "#00ff9d";
    if (s === "IN PROGRESS") return "#00aaff";
    if (s === "UNDER REVIEW")return "#ffcc00";
    return "#ff4d00"; // OPEN
}

// ── TRACKING PANEL ────────────────────────────────────────────────────
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
            <div class="mono" style="font-size:0.75rem;color:#888;line-height:1.7;">
                <b style="color:#e0e0e0;">${i.ref_id}</b>
                ${i.category ? `<span style="color:#444;font-size:0.65rem;"> · ${i.category}</span>` : ''}<br>
                ${i.description.substring(0, 60)}${i.description.length > 60 ? '...' : ''}<br>
                <span style="color:#444;">${i.submitted_at}</span>
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

        const sc  = statusColor(data.status);
        const sev = data.severity === "HIGH" ? "#ff4d00" : data.severity === "MEDIUM" ? "#ffcc00" : "#00bfff";

        // Build history timeline
        const historyHtml = (data.history || []).map(h => `
            <div style="display:flex;align-items:center;gap:6px;font-size:0.65rem;color:#555;margin-bottom:2px;">
                <span style="color:${statusColor(h.status)};font-size:0.6rem;">●</span>
                <b style="color:${statusColor(h.status)}">${h.status}</b>
                <span>· ${h.by}</span>
                <span style="color:#333;">${new Date(h.time).toLocaleString()}</span>
            </div>
        `).join('');

        // Build public comments thread
        const comments = data.comments || [];
        const commentsHtml = comments.length === 0 ? '' : `
            <div style="margin-top:8px;border-top:1px solid #1a1a1a;padding-top:6px;">
                <div class="mono" style="font-size:0.6rem;color:#333;margin-bottom:4px;letter-spacing:1px;">AUTHORITY REPLIES</div>
                ${comments.map(c => `
                    <div style="padding:5px 8px;margin-bottom:4px;background:#0a1e12;border-left:2px solid #00ff9d;font-size:0.7rem;font-family:monospace;">
                        <div style="font-size:0.6rem;color:#444;margin-bottom:2px;">${c.author} · ${new Date(c.time).toLocaleTimeString()}</div>
                        ${c.message}
                    </div>
                `).join('')}
            </div>
        `;

        el.innerHTML = `
            <div style="margin-top:8px;padding:10px 12px;background:#111;border:1px solid #222;border-radius:2px;">
                <div class="mono" style="font-size:0.72rem;line-height:2;">
                    Status: <b style="color:${sc};">${data.status}</b><br>
                    Severity: <b style="color:${sev};">${data.severity}</b><br>
                    Dept: <b style="color:#aaa;">${data.department}</b>
                    ${data.resolved_at ? `<br><span style="color:#00ff9d;font-size:0.68rem;">✓ Resolved ${new Date(data.resolved_at).toLocaleString()}</span>` : ''}
                </div>
                ${historyHtml ? `<div style="margin-top:8px;border-top:1px solid #1a1a1a;padding-top:6px;">${historyHtml}</div>` : ''}
                ${commentsHtml}
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