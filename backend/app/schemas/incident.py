from pydantic import BaseModel

class Incident(BaseModel):
    description: str
    location: str
    type: str
    severity: str
    confidence: float
