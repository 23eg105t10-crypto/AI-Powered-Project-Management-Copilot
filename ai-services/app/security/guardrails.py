import re

INJECTION_PATTERNS = [
    "ignore previous instructions", "reveal system prompt", "developer message",
    "bypass", "jailbreak", "exfiltrate", "api key"
]

def mask_sensitive_data(text: str) -> str:
    text = re.sub(r"[\w\.-]+@[\w\.-]+", "[EMAIL_MASKED]", text)
    text = re.sub(r"\b\d{10}\b", "[PHONE_MASKED]", text)
    return text

def validate_prompt(text: str) -> dict:
    lowered = text.lower()
    threats = [p for p in INJECTION_PATTERNS if p in lowered]
    return {
        "isSafe": len(threats) == 0,
        "threatLevel": "High" if threats else "Low",
        "threatsFound": threats,
        "reason": "Prompt injection patterns detected." if threats else "No prompt injection pattern detected."
    }
