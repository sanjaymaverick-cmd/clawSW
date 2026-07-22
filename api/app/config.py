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

    # ---- Mock/demo dataset (Phase 8) ----
    # Off by default so seed_demo.py never runs against a real deployment.
    # Set SEED_DEMO_DATA=true only on a rehearsal/demo instance; it fills the
    # database with fictional items, warehouses, machinery, service jobs,
    # website orders, demo bookings, and one login per non-owner role.
    seed_demo_data: bool = False
    # Shared password for every seeded demo login (rehearsal fixture only).
    seed_demo_password: str = "demo-password"

    cors_origins: str = "http://localhost:8080,http://localhost:3000,http://localhost:5173"

    # ---- Login rate limiting (Phase 9) ----
    # Brute-force lockout on /auth/login, keyed by (email, client IP). After
    # this many consecutive failures the pair is locked out for the window
    # below. State lives in the login_attempts table so it survives restarts
    # and is shared across API workers.
    login_max_attempts: int = 5
    login_lockout_minutes: int = 15

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

    # ---- AI query layer (Phase 7) ----
    # Server-side only: read from the environment here and used inside
    # app/ai_query.py exclusively — never returned by any endpoint, so it
    # cannot reach the dashboard or website bundles. Empty = AI disabled.
    anthropic_api_key: str = ""
    # Pinned per the current model docs; adjust via env var as models evolve.
    anthropic_model: str = "claude-opus-4-8"
    anthropic_max_tokens: int = 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
