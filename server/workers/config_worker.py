from utils.redis import redis_settings
from utils.utils import settings
from workers.ai_chat_worker import WORKER_MAX_TRIES, generate_canvas
from service.ai_model_service import close_model_client
from service.ai_retry_config import ai_job_timeout_seconds


async def shutdown_worker(ctx: dict) -> None:
    await close_model_client()


class WorkerSettings:
    functions = [generate_canvas]
    redis_settings = redis_settings
    job_timeout = ai_job_timeout_seconds(settings.gemini_timeout_seconds)
    max_tries = WORKER_MAX_TRIES
    max_jobs = 1
    on_shutdown = shutdown_worker
