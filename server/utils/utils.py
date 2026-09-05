from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    clerk_secret_key: str | None = None
    clerk_jwt_key: str | None = None
    clerk_authorized_parties: str | None = None
    



    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def clerk_authorized_party_list(self) -> list[str] | None:
        if not self.clerk_authorized_parties:
            return None

        parties = [
            party.strip()
            for party in self.clerk_authorized_parties.split(",")
            if party.strip()
        ]

        return parties or None

    @property
    def normalized_clerk_jwt_key(self) -> str | None:
        if not self.clerk_jwt_key:
            return None

        return self.clerk_jwt_key.replace("\\n", "\n").strip()

    @property
    def has_clerk_verification_key(self) -> bool:
        return bool(self.clerk_secret_key or self.normalized_clerk_jwt_key)


settings = Settings()
