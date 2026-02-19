import { classifyIncident } from "./api.js";

window.handleReport = async function (e) {
    e.preventDefault();

    const desc = document.getElementById("desc").value;
    const location = document.getElementById("locationInput").value;
    const type = document.getElementById("incidentType").value;

    // 🔥 LIVE AI CALL
    const ai = await classifyIncident(desc);

    const incident = {
        id: "INC-" + Math.floor(Math.random() * 9000),
        description: desc,
        location: location,
        type: type,
        severity: ai.severity,
        confidence: ai.confidence,
        timestamp: new Date().toLocaleString(),
        status: "OPEN"
    };

    // TEMP: store locally (backend storage later)
    const data = JSON.parse(localStorage.getItem("urbanPulseData")) || [];
    data.unshift(incident);
    localStorage.setItem("urbanPulseData", JSON.stringify(data));

    alert(`AI Severity: ${ai.severity} (${ai.confidence})`);
};
