import re


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_email_format(email: str) -> bool:
    return bool(_EMAIL_RE.match(email or ""))
