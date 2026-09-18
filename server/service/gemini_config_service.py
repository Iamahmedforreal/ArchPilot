from utils.utils import Settings, settings


class GeminiCredentialsNotConfiguredError(Exception):
    pass


def require_gemini_api_key(config: Settings = settings) -> str:
    api_key = config.google_gemini_api_key
    if api_key is None:
        raise GeminiCredentialsNotConfiguredError(
            "Gemini credentials are not configured"
        )

    return api_key
