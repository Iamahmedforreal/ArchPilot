DEFAULT_MODEL_REQUEST_TIMEOUT_SECONDS = 120
MODEL_REQUEST_ATTEMPTS = 3
MODEL_RETRY_DELAYS_SECONDS = (2, 4)
AI_RUN_PERSISTENCE_MARGIN_SECONDS = 60


def model_request_timeout_seconds(configured_timeout: int | None) -> int:
    return configured_timeout or DEFAULT_MODEL_REQUEST_TIMEOUT_SECONDS


def ai_job_timeout_seconds(configured_timeout: int | None) -> int:
    request_timeout = model_request_timeout_seconds(configured_timeout)
    return (
        MODEL_REQUEST_ATTEMPTS * request_timeout
        + sum(MODEL_RETRY_DELAYS_SECONDS)
        + AI_RUN_PERSISTENCE_MARGIN_SECONDS
    )
