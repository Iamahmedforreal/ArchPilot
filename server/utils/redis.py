from arq.connections import RedisSettings

from utils.utils import settings


redis_settings = RedisSettings.from_dsn(settings.redis_url)
