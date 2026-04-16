from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from database import Base


class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Phase 13: comma-separated CIDR notation, e.g. "10.0.0.0/8,192.168.1.0/24"
    ip_allowlist = Column(String, nullable=True)


class LicenseCache(Base):
    __tablename__ = "license_cache"
    id = Column(Integer, primary_key=True)
    license_key = Column(String, nullable=False, index=True)
    instance_id = Column(String, nullable=False)
    plan = Column(String, nullable=True)  # "starter", "growth", "enterprise"
    valid_until = Column(DateTime(timezone=True), nullable=True)
    last_checked = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ScriptDeployment(Base):
    __tablename__ = "script_deployments"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    script_name = Column(String, nullable=False)
    target = Column(String, nullable=False)  # "production" or "sandbox"
    deployed_at = Column(DateTime(timezone=True), server_default=func.now())
    license_key = Column(String, nullable=True)


class ScriptGeneration(Base):
    """Phase 22: Tracks SuiteScript generation events for free-tier quota (5/month on dev plan)."""
    __tablename__ = "script_generations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)          # maps to first_name + last_name from frontend
    first_name = Column(String, nullable=True)     # stored separately for login response
    last_name = Column(String, nullable=True)
    email = Column(String(collation="NOCASE"), unique=True, index=True, nullable=False)
    organization = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)   # set True when email verified (not enforced on login in Phase 1)
    failed_attempts = Column(Integer, default=0)   # for login lockout
    locked_until = Column(DateTime(timezone=True), nullable=True)  # None = not locked
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role = Column(String, nullable=False, default="user")   # "admin" or "user"
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    # Phase 14: GDPR erasure timestamp — set when user requests data erasure
    erased_at = Column(DateTime(timezone=True), nullable=True)
    # Phase 17: first-run onboarding completion flag
    onboarding_completed = Column(Boolean, default=False, nullable=False, server_default="0")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False)  # SHA-256 of raw token (never store raw)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TeamInvite(Base):
    __tablename__ = "team_invites"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    email = Column(String, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, unique=True, nullable=False)  # SHA-256 of raw token
    accepted = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False, default="New Chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)      # "user" or "assistant"
    content = Column(String, nullable=False)
    intent = Column(String, nullable=True)     # from AI classification
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    # Phase 12 expansion — new fields (nullable for migration safety)
    actor_email    = Column(String, nullable=True)   # string, not FK (survives account deletion)
    actor_role     = Column(String, nullable=True)   # "admin" | "user" at time of action
    action         = Column(String, nullable=False)  # dot-notation: "auth.login_failed"
    result         = Column(String, nullable=True)   # "success" | "failure"
    ip_address     = Column(String, nullable=True)
    target         = Column(String, nullable=True)   # user_id, email, or config key
    # Phase 10 legacy columns — kept nullable for backward compat with existing rows
    admin_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    detail         = Column(String, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    # Phase 14: immutable hash chain (SOC2 CC7.2 tamper-evidence)
    prev_hash      = Column(String, nullable=True)   # row_hash of previous row (None for first row)
    row_hash       = Column(String, nullable=True)   # sha256(prev_hash|action|actor_email|created_at)


class SystemConfig(Base):
    __tablename__ = "system_config"
    key = Column(String, primary_key=True)          # e.g. "max_chat_history"
    value = Column(String, nullable=False)           # stored as string, parsed by consumer
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)


class MFASecret(Base):
    """Phase 13: TOTP MFA secret per user. One active secret per user at a time."""
    __tablename__ = "mfa_secrets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Base32-encoded TOTP secret (stored as plain string — AES-at-rest handled by disk encryption)
    secret = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)  # True only after verify step completes
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class APIKey(Base):
    """Phase 16: API key for third-party integrations (Zapier, CI pipelines, customer scripts).
    Raw key is returned ONCE at creation and never stored — only the SHA-256 hash is kept.
    """
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key_hash = Column(String, unique=True, nullable=False)   # SHA-256 of the raw key (never stored raw)
    name = Column(String, nullable=False)                    # human label, e.g. "Zapier integration"
    is_active = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WebhookEndpoint(Base):
    """Phase 16: Webhook endpoint registered by a user for a named event.
    ArthaBuild POSTs a signed payload to url when the event fires.
    """
    __tablename__ = "webhook_endpoints"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event = Column(String, nullable=False)      # "chat.completed" | "script.deployed" | "user.registered"
    url = Column(String, nullable=False)        # target URL to POST to
    secret = Column(String, nullable=False)     # HMAC-SHA256 signing secret
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnalyticsEvent(Base):
    """Phase 19: Privacy-respecting analytics event (pageview, update, or custom event).
    No PII stored — session_id is a client-generated anonymous ID.
    """
    __tablename__ = "analytics_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String, nullable=False)           # "pageview" | "update" | "event"
    session_id = Column(String, nullable=False)     # anonymous session identifier
    page = Column(String, nullable=False)           # URL path
    referrer = Column(String, nullable=True)
    scroll_depth = Column(Integer, default=0)
    time_on_page = Column(Integer, default=0)
    utm_source = Column(String, nullable=True)
    utm_medium = Column(String, nullable=True)
    utm_campaign = Column(String, nullable=True)
    utm_term = Column(String, nullable=True)
    utm_content = Column(String, nullable=True)
    event_type = Column(String, nullable=True)      # for type="event": click, form_submit, etc.
    element = Column(String, nullable=True)         # CSS selector or element name
    value = Column(String, nullable=True)           # arbitrary string value for the event
    created_at = Column(DateTime(timezone=True), server_default=func.now())
