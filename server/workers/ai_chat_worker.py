import logging
from typing import Any
from uuid import UUID

from model.ai import AIRun, AIRunStatus
from model.db import async_session

logger = logging.getLogger("arq.worker")
TERMINAL_STATUSES = {
    AIRunStatus.SUCCEEDED.value,
    AIRunStatus.FAILED.value,
    "CANCELLED",
}


async def generate_canvas(ctx: dict[str, Any], run_id: str) -> None:
    logger.info("Received canvas generation run_id=%s", run_id)

    try:
        parsed_run_id = UUID(run_id)
    except ValueError:
        logger.warning("Ignoring invalid AI run_id=%s", run_id)
        return

    async with async_session() as session:
        run = await session.get(AIRun, parsed_run_id)

    if run is None:
        logger.warning("AI run no longer exists run_id=%s", run_id)
        return

    if run.status.value in TERMINAL_STATUSES:
        logger.info(
            "Skipping terminal AI run run_id=%s status=%s",
            run_id,
            run.status.value,
        )
        return

    logger.info("Loaded pending AI run run_id=%s status=%s", run_id, run.status.value)
