class ERROR_MESSAGES:
    ACCESS_PROHIBITED = "Access prohibited"
    INVALID_EMAIL_FORMAT = "Invalid email format"
    EMAIL_TAKEN = "Email already taken"
    CREATE_USER_ERROR = "Unable to create user"
    INVALID_CREDENTIALS = "Invalid email or password"


class WEBHOOK_MESSAGES:
    @staticmethod
    def USER_SIGNUP(name: str | None) -> str:
        return f"User signup: {name or 'unknown'}"
