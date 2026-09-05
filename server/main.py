from fastapi import FastAPI

from routes.projects import router as projects_router

app = FastAPI()
app.include_router(projects_router)

@app.get("/")
async def root():
    return {"message": "Hello World"}



@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
