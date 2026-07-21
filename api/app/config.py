from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://clawsw:clawsw@localhost:5432/clawsw"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 480

    # Initial owner account, created on first startup if no users exist.
    admin_name: str = "Owner"
    admin_email: str = "owner@clawsw.example"
    admin_password: str = "change-me"

    cors_origins: str = "http://localhost:8080,http://localhost:3000,http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
