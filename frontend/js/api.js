const API_BASE = "http://127.0.0.1:8000";

export async function classifyIncident(text, latitude, longitude, imageBase64 = null) {
    // First classify to get severity, ref_id etc
    const res = await fetch(`${API_BASE}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, latitude, longitude })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err.detail));
    }

    const result = await res.json();

    // If image provided, attach it to the incident via update
    if (imageBase64 && result.ref_id) {
        // Find the incident by ref_id and attach image
        const allRes = await fetch(`${API_BASE}/incidents`);
        const all = await allRes.json();
        const incident = all.find(i => i.ref_id === result.ref_id);
        if (incident) {
            await fetch(`${API_BASE}/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: incident.id, status: incident.status, image: imageBase64 })
            });
        }
    }

    return result;
}

export async function saveIncident(data) {
    const res = await fetch(`${API_BASE}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err.detail));
    }
    return res.json();
}

export async function fetchIncidents() {
    const res = await fetch(`${API_BASE}/incidents`);
    return await res.json();
}