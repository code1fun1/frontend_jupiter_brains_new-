from typing import Any, Dict, Optional


async def post_webhook(app_name: str, webhook_url: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
    _ = (app_name, webhook_url, message, payload)
    return None
