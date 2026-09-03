from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from utils.utils import settings

db_url = settings.database_url
if not db_url:
    raise ValueError("Database URL is not set in the environment variables.")

# Create the async engine using the database URL from settings
engine = create_async_engine(db_url)


# Create a sessionmaker for the async engine
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# Dependency to get the database session
async def get_db():
    async with async_session() as session:
        yield session


