from uuid import UUID

from arq.connections import ArqRedis
from arq.jobs import Job


async def enqueue_ai_run(redis: ArqRedis, run_id: UUID) -> Job | None:
    return await redis.enqueue_job(
        "generate_canvas",
        str(run_id),
        _job_id=f"ai-run:{run_id}",
    )


async def enqueue_ai_spec_run(redis: ArqRedis, run_id: UUID) -> Job | None:
    return await redis.enqueue_job(
        "generate_spec",
        str(run_id),
        _job_id=f"spec-run:{run_id}",
    )
