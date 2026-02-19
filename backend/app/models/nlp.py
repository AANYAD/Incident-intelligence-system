from transformers import pipeline

classifier = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

def classify_text(text: str):
    result = classifier(text)[0]

    if result["label"] == "NEGATIVE" and result["score"] > 0.85:
        severity = "HIGH"
    elif result["label"] == "NEGATIVE":
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return {
        "severity": severity,
        "confidence": round(result["score"], 2)
    }
