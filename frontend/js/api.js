const API_BASE = "http://127.0.0.1:8000";

export async function classifyIncident(text) {
    const res = await fetch(`${API_BASE}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });
    return res.json();
}
