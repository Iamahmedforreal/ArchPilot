from utils.redis import redis_settings
from workers.ai_chat_worker import generate_canvas


class WorkerSettings:
    functions = [generate_canvas]
    redis_settings = redis_settings
    job_timeout = 300
    max_jobs = 4
