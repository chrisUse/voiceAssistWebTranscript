from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "sqlite:///./data/docs.db"
    whisper_url: str = "http://whisper:8001"
    whisper_language: str = "de"


settings = Settings()
