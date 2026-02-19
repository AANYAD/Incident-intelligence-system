from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from datetime import datetime, timedelta
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

incidents = []

classifier = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

class Incident(BaseModel):
    text: str
    latitude: float
    longitude: float

# ========================
# KEYWORD LISTS
# ========================
low_keywords = [
    'small', 'minor', 'slight', 'little', 'tiny', 'minimal',
    'crack', 'flickering', 'fading', 'chipped', 'broken bench',
    'pothole near', 'one street', 'paint', 'garbage bin',
    'stray dog', 'overgrown', 'dirty wall', 'graffiti',
    'speed bump', 'faded marking', 'loose wire', 'dripping'
]

high_keywords = [
    'fire', 'explosion', 'collapsed', 'collapse', 'gas leak',
    'unconscious', 'electrocuted', 'flood', 'trapped', 'dead',
    'injury', 'injured', 'bleeding', 'accident', 'critical',
    'bridge broken', 'wall collapsed', 'building collapsed',
    'short circuit', 'transformer blast', 'main pipe burst',
    'sinkhole', 'road caved', 'electric shock',
    'sewage overflow', 'contaminated water', 'epidemic',
    'poisoning', 'chemical', 'smoke', 'toxic', 'fumes',
    'blast', 'cylinder', 'gas cylinder', 'bomb'
]

medium_keywords = [
    'pothole', 'waterlogging', 'no water', 'power cut',
    'outage', 'traffic jam', 'blocked drain', 'broken road',
    'streetlight not working', 'garbage not collected',
    'construction', 'encroachment', 'illegal parking',
    'water leakage', 'pipe leaking', 'signal not working'
]

# ========================
# DEPARTMENT ROUTING
# ========================
def get_department(text: str):
    t = text.lower()
    if any(k in t for k in ['fire', 'smoke', 'gas leak', 'explosion', 'blast', 'cylinder', 'gas cylinder', 'burning']):
        return 'Fire & Rescue'
    if any(k in t for k in ['water', 'sewer', 'sanitation', 'leak', 'pipe', 'drainage', 'flood']):
        return 'Water Dept'
    if any(k in t for k in ['power', 'electric', 'outage', 'transformer', 'electrocuted', 'light', 'current']):
        return 'Power & Energy'
    if any(k in t for k in ['road', 'pothole', 'traffic', 'bridge', 'construction', 'signal', 'footpath']):
        return 'Public Works'
    if any(k in t for k in ['garbage', 'waste', 'drain', 'stink', 'smell']):
        return 'Sanitation Dept'
    return 'General Services'

# ========================
# SLA HOURS PER TYPE
# ========================
def get_sla_hours(text: str, severity: str):
    t = text.lower()
    if any(k in t for k in ['fire', 'gas', 'explosion', 'blast', 'flood', 'collapsed']):
        hours = 4
    elif any(k in t for k in ['power', 'electric', 'outage', 'transformer']):
        hours = 12
    elif any(k in t for k in ['water', 'sewer', 'sanitation', 'leak']):
        hours = 24
    elif any(k in t for k in ['road', 'pothole', 'traffic', 'bridge']):
        hours = 48
    else:
        hours = 48
    if severity == "HIGH":
        hours = max(4, hours // 2)
    return hours

# ========================
# SEVERITY CLASSIFIER
# ========================
def classify_severity(text: str):
    text_lower = text.lower()
    for kw in low_keywords:
        if kw in text_lower:
            return "LOW", 0.5
    for kw in high_keywords:
        if kw in text_lower:
            return "HIGH", 0.99
    for kw in medium_keywords:
        if kw in text_lower:
            return "MEDIUM", 0.75
    result = classifier(text)[0]
    score = result["score"]
    if score > 0.90:
        severity = "HIGH"
    elif score > 0.75:
        severity = "MEDIUM"
    else:
        severity = "LOW"
    return severity, score


@app.post("/classify")
def classify_incident(data: Incident):
    severity, confidence = classify_severity(data.text)
    department = get_department(data.text)
    sla_hours = get_sla_hours(data.text, severity)
    created_at = datetime.now()
    sla_due = created_at + timedelta(hours=sla_hours)
    ref_id = "INC-" + str(uuid.uuid4())[:8].upper()

    incident = {
        "id": str(uuid.uuid4()),
        "ref_id": ref_id,
        "description": data.text,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "severity": severity,
        "confidence": round(confidence, 2),
        "category": "AI-Predicted",
        "status": "OPEN",
        "department": department,
        "sla_hours": sla_hours,
        "created_at": created_at.isoformat(),
        "sla_due": sla_due.isoformat(),
        "image": None
    }
    incidents.append(incident)
    return {
        "severity": severity,
        "confidence": round(confidence, 2),
        "category": "AI-Predicted",
        "department": department,
        "sla_hours": sla_hours,
        "ref_id": ref_id
    }


@app.get("/incidents")
def get_incidents():
    return incidents


# Citizen can track their incident by ref_id
@app.get("/track/{ref_id}")
def track_incident(ref_id: str):
    for i in incidents:
        if i.get("ref_id") == ref_id.upper():
            return {
                "ref_id": i["ref_id"],
                "description": i["description"],
                "status": i["status"],
                "severity": i["severity"],
                "department": i["department"],
                "created_at": i["created_at"],
                "resolved_at": i.get("resolved_at")
            }
    raise HTTPException(status_code=404, detail="Incident not found")


@app.post("/incidents")
def create_incident(data: dict):
    if "id" not in data or not data["id"]:
        data["id"] = str(uuid.uuid4())
    if "created_at" not in data:
        data["created_at"] = datetime.now().isoformat()
    incidents.append(data)
    return data


# Update incident — supports image upload too
@app.post("/update")
def update_incident(updated: dict):
    incident_id = updated.get("id")
    new_status = updated.get("status")
    if not incident_id:
        raise HTTPException(status_code=400, detail="Missing id")
    for i in incidents:
        if i["id"] == incident_id:
            i["status"] = new_status
            if new_status == "RESOLVED":
                i["resolved_at"] = datetime.now().isoformat()
            # Store image if provided
            if "image" in updated:
                i["image"] = updated["image"]
            return {"message": "updated", "id": incident_id, "status": new_status}
    raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")