from pydantic import BaseModel, EmailStr, Field


class LoginRequestDTO(BaseModel):
    email: EmailStr
    password: str


class TokenResponseDTO(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


LoginResponseDTO = TokenResponseDTO


class AuthUserResponseDTO(BaseModel):
    id: int | str
    name: str
    email: str
    status: str = "ACTIVE"
    avatar_url: str | None = None
    role_names: list[str] = Field(default_factory=list)


class LogoutResponseDTO(BaseModel):
    is_success: bool = True
    message: str = "Đăng xuất thành công."
