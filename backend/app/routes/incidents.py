from fastapi import APIRouter

router = APIRouter()

INCIDENTS = []

@router.post("/incident")
def create_incident(data: dict):
    INCIDENTS.append(data)
    return {"status": "stored", "data": data}

@router.get("/incident")
def get_incidents():
    return INCIDENTS
