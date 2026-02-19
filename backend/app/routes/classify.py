from fastapi import APIRouter
from pydantic import BaseModel
from app.models.nlp import classify_text

router = APIRouter()

class TextIn(BaseModel):
    text: str

@router.post("/classify")
def classify(payload: TextIn):
    return classify_text(payload.text)
