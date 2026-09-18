from utils.redis import redis_settings
from utils.utils import settings
from workers.ai_chat_worker import generate_canvas
from service.ai_model_service import close_model_client


async def shutdown_worker(ctx: dict) -> None:
    await close_model_client()


class WorkerSettings:
    functions = [generate_canvas]
    redis_settings = redis_settings
    job_timeout = (settings.gemini_timeout_seconds or 120) + 60
    max_jobs = 4
    on_shutdown = shutdown_worker
