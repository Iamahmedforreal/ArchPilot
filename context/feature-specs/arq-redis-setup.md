## Implement Redis and ARQ configuration for background AI generation.

Use the existing FastAPI project structure and settings system.

Requirements:
1. Add ARQ as a dependency.
2. Add REDIS_URL to environment settings 
3. Add a Redis service to the development Docker Compose setup.
   - If Redis already exists, reuse it.
   - Use localhost when running Python on the host.
   - Use the Redis service name when running Python inside Docker.
4. Create shared RedisSettings configuration from REDIS_URL.
5. During FastAPI lifespan startup:
   - Create an ARQ Redis pool with create_pool().
   - Store it on app.state.
6. During FastAPI lifespan shutdown:
   - Close the pool.
7. Preserve any existing lifespan setup and cleanup.
8. Create a worker module containing:
   - async generate_canvas(ctx, run_id)
   - WorkerSettings with functions = [generate_canvas]
   - The shared Redis configuration.
   - Explicit job timeout and concurrency settings.
9. For now, generate_canvas should only log the received run_id.
   Do not implement model calling yet.
10. Document how to start Redis, FastAPI, and the worker separately.
    Include the correct command:
    arq <worker_module>.WorkerSettings

Do not add idempotency keys, request hashes, outbox delivery,
worker leases, or custom retries in this step.

## Acceptance:
- FastAPI and the worker connect to the same Redis instance.
- The worker starts successfully.
- A manually enqueued generate_canvas job logs its run_id.
- FastAPI closes its Redis connection during shutdown.