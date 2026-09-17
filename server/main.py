from fastapi import FastAPI

from routes.ai_route import router as ai_router
from routes.projects import router as projects_router

app = FastAPI()
app.include_router(projects_router)
app.include_router(ai_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
