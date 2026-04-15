from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    organization: Optional[str] = None


class LoginRequest(BaseModel):
    username: str   # frontend sends 'username' field (email value)
    password: str


class CheckUserRequest(BaseModel):
    email: EmailStr


class CheckUserResponse(BaseModel):
    success: bool
    message: str
    # user_id intentionally omitted — exposing DB primary key to unauthenticated callers is an enumeration risk


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    first_name: str
    last_name: str
    email: str
    user_type: str = "User"
    role: str = "user"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class PatchUserRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class ResendVerificationRequest(BaseModel):
    email: str
