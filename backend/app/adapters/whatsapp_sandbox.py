def build_broadcast(phones: list[str], message: str, pay_link: str) -> dict:
    """Sandbox stand-in for the Meta Cloud API send call."""
    return {
        "messaging_product": "whatsapp",
        "type": "text",
        "recipient_count": len(phones),
        "recipients": phones,
        "text": {"body": f"{message}\n{pay_link}"},
    }
