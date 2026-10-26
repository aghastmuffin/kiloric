"""
Auth router — register, login, logout, refresh, password reset, delete account.
"""
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import RefreshToken, User
from app.schemas import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_reset_token,
    make_reset_token,
    verify_password,
)

router = APIRouter(prefix="/v1/auth", tags=["auth"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _build_token_response(user: User, db: Session) -> TokenResponse:
    access = create_access_token(user.id)
    raw_refresh, refresh_hash, expires_at = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=expires_at))
    db.commit()
    return TokenResponse(
        access_token=access,
        refresh_token=raw_refresh,
        user=UserResponse.from_orm_user(user),
    )


# ── register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="Email already registered.")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username already taken.")

    user = User(
        email=body.email.lower(),
        username=body.username,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_token_response(user, db)


# ── login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    identity = body.identity.strip()
    # Allow login with email or username
    if "@" in identity:
        user = db.query(User).filter(User.email == identity.lower()).first()
    else:
        user = db.query(User).filter(User.username == identity).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if user.is_blocked:
        raise HTTPException(status_code=403, detail="Account suspended.")

    user.last_login = datetime.now(timezone.utc).isoformat()
    return _build_token_response(user, db)


# ── refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if not record or record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid.")

    user = db.get(User, record.user_id)
    if not user or user.is_blocked:
        raise HTTPException(status_code=401, detail="User not found.")

    db.delete(record)  # rotate refresh token
    return _build_token_response(user, db)


# ── logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=204)
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if record:
        db.delete(record)
        db.commit()


# ── password reset ────────────────────────────────────────────────────────────

@router.post("/reset-password-request", status_code=204)
def request_password_reset(body: PasswordResetRequest, db: Session = Depends(get_db)):
    from app.config import settings
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user:
        return  # don't reveal whether email exists

    raw, hashed, expires_at = make_reset_token()
    user.reset_token_hash = hashed
    user.reset_token_expires = expires_at
    db.commit()

    # Send email if SMTP is configured
    if settings.SMTP_HOST:
        _send_reset_email(body.email, raw)


@router.post("/reset-password-confirm", status_code=204)
def confirm_password_reset(body: PasswordResetConfirm, db: Session = Depends(get_db)):
    hashed = hash_reset_token(body.token)
    user = db.query(User).filter(User.reset_token_hash == hashed).first()
    if (
        not user
        or not user.reset_token_expires
        or user.reset_token_expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="Reset token invalid or expired.")

    user.password_hash = hash_password(body.new_password)
    user.reset_token_hash = None
    user.reset_token_expires = None
    # Invalidate all refresh tokens
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    db.commit()


def _send_reset_email(to_email: str, raw_token: str):
    """Best-effort SMTP send (non-blocking)."""
    import smtplib
    from email.message import EmailMessage
    from app.config import settings

    reset_link = f"{settings.APP_RESET_URL}?token={raw_token}"
    msg = EmailMessage()
    msg["Subject"] = "Kiloric — Password Reset"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.set_content(
        f"Tap the link below to reset your Kiloric password (expires in 1 hour):\n\n{reset_link}\n\n"
        "If you didn't request this, ignore this email."
    )
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.starttls()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            smtp.send_message(msg)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Failed to send reset email: %s", exc)
