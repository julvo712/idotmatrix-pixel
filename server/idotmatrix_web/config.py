from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "IDOTMATRIX_"}

    MAC_ADDRESS: str | None = None
    SCREEN_SIZE: int = 64
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    WEB_DIST_PATH: str = "../web/dist"
    LOG_LEVEL: str = "INFO"
    AUTO_RECONNECT: bool = True


settings = Settings()
