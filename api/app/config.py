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

    # ---- Tally bridge (Phase 5) ----
    # Tally Prime's XML-over-HTTP gateway ("Enable ODBC/XML Server" in Tally),
    # reachable on the LAN. Point at a SANDBOX company file first.
    tally_url: str = "http://localhost:9000"
    # Company to import into; empty uses the company currently open in Tally.
    tally_company: str = ""
    # Ledger names must already exist in the Tally company file.
    tally_sales_ledger: str = "Sales"
    tally_party_ledger: str = "Website Customers"
    tally_timeout_seconds: float = 10.0
    # How often the bridge worker pushes confirmed orders / pulls payments.
    tally_sync_interval_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
