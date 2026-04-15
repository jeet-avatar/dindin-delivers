"""
SuiteScript and SDF project deployment endpoints.

Requires active NetSuite TBA session (POST /api/netsuite/authenticate first).
Uses session credentials from session_store.py — NEVER reads from disk or env vars.
"""
import subprocess
import json
import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from auth_utils import get_current_user_id
from session_store import get_session_creds
from database import AsyncSessionLocal
from email_utils import send_script_deployed_email
from sqlalchemy import select
from models import User

router = APIRouter(prefix="/api/deploy", tags=["deploy"])

SCRIPT_TYPES = {
    "suitelet",
    "userEventScript",
    "scheduledScript",
    "clientScript",
    "mapReduceScript",
    "restlet",
}


class DeploySuiteScriptRequest(BaseModel):
    script_content: str
    script_name: str       # e.g. "my_workflow_helper"
    script_type: str       # one of SCRIPT_TYPES
    deploy_to: Optional[str] = None  # optional record type for userEvent scripts


class DeployResponse(BaseModel):
    success: bool
    deploy_log: str
    netsuite_url: Optional[str] = None
    error: Optional[str] = None


def _require_netsuite_session(user_id: int):
    """Raise 401 if user has no active NetSuite TBA session."""
    creds = get_session_creds(user_id)
    if creds is None:
        raise HTTPException(
            status_code=401,
            detail="NetSuite session not authenticated. POST /api/netsuite/authenticate first.",
        )
    return creds


def _build_temp_sdf_project(
    script_name: str, script_type: str, script_content: str, tmpdir: str
) -> str:
    """
    Create minimal SDF project structure in tmpdir.
    Returns path to project root.
    """
    project_root = os.path.join(tmpdir, "sdf_project")
    scripts_dir = os.path.join(
        project_root, "FileCabinet", "SuiteScripts", "CustomScripts"
    )
    os.makedirs(scripts_dir, exist_ok=True)

    # Write the SuiteScript file
    script_filename = f"{script_name}.js"
    with open(os.path.join(scripts_dir, script_filename), "w") as f:
        f.write(script_content)

    # Write minimal manifest.xml
    manifest = f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest projecttype="ACCOUNTCUSTOMIZATION">
  <projectname>{script_name}</projectname>
  <frameworkversion>1.0</frameworkversion>
</manifest>"""
    with open(os.path.join(project_root, "manifest.xml"), "w") as f:
        f.write(manifest)

    return project_root


def _write_temp_auth(creds, tmpdir: str) -> dict:
    """Write TBA auth config to tmpdir. Returns env dict with HOME=tmpdir."""
    auth_config = {
        "defaultAuthId": "deploy_session",
        "accounts": {
            "deploy_session": {
                "accountId": creds.account_id,
                "tokenId": creds.token_key,
                "tokenSecret": creds.token_secret,
                "consumerKey": creds.consumer_key,
                "consumerSecret": creds.consumer_secret,
            }
        },
    }
    suitecloud_dir = os.path.join(tmpdir, ".suitecloud")
    os.makedirs(suitecloud_dir, exist_ok=True)
    with open(os.path.join(suitecloud_dir, "authfile.json"), "w") as f:
        json.dump(auth_config, f)
    return {**os.environ, "HOME": tmpdir}


@router.post("/suitescript", response_model=DeployResponse)
async def deploy_suitescript(
    request: DeploySuiteScriptRequest,
    user_id: int = Depends(get_current_user_id),
):
    """
    Deploy a generated SuiteScript to NetSuite via SuiteCloud CLI.
    Requires active NetSuite TBA session.
    Returns 401 if no TBA session is active.
    Returns 402 if production deploy quota is exceeded.
    """
    if request.script_type not in SCRIPT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"script_type must be one of: {sorted(SCRIPT_TYPES)}",
        )

    creds = _require_netsuite_session(user_id)

    # Check production deploy quota (sandbox deploys are always allowed)
    deploy_target = request.deploy_to or "sandbox"
    if deploy_target == "production":
        try:
            from routers import license as license_module
            # Get current license plan from rawapi globals (or fall back to validating)
            import rawapi as _rawapi
            plan = getattr(_rawapi, "_license_plan", "starter")
            async with AsyncSessionLocal() as db:
                quota = await license_module.check_deploy_quota(db, user_id, plan)
            if not quota["allowed"]:
                raise HTTPException(
                    status_code=402,
                    detail=f"Production script limit reached ({quota['used']}/{quota['limit']}). Contact {license_module.SALES_EMAIL} to upgrade."
                )
        except HTTPException:
            raise
        except Exception as _quota_err:
            import logging
            logging.getLogger(__name__).warning(f"Quota check failed (non-fatal): {_quota_err}")

    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = _build_temp_sdf_project(
            request.script_name,
            request.script_type,
            request.script_content,
            tmpdir,
        )
        env = _write_temp_auth(creds, tmpdir)

        try:
            result = subprocess.run(
                ["suitecloud", "project:deploy", "--no-preview"],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=project_root,
                env=env,
            )
            success = result.returncode == 0
            deploy_log = result.stdout + (
                "\n" + result.stderr if result.stderr else ""
            )
            # Record production deploy for quota tracking
            if success and deploy_target == "production":
                try:
                    from routers import license as license_module
                    async with AsyncSessionLocal() as db:
                        await license_module.record_deploy(db, user_id, request.script_name, deploy_target)
                except Exception as _rec_err:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to record deploy (non-fatal): {_rec_err}")

            # Phase 16: Dispatch script.deployed webhook on success only (fire-and-forget)
            if success:
                import asyncio as _asyncio
                from webhook_worker import dispatch_webhook as _dispatch_webhook
                from sqlalchemy.ext.asyncio import async_sessionmaker as _async_sessionmaker
                from database import engine as _deploy_engine

                async def _fire_deploy_webhook():
                    try:
                        _sess_factory = _async_sessionmaker(_deploy_engine, expire_on_commit=False)
                        async with _sess_factory() as _db:
                            await _dispatch_webhook(_db, "script.deployed", {
                                "script_name": request.script_name,
                                "script_type": request.script_type,
                                "deploy_target": deploy_target,
                                "deploy_log": deploy_log.strip(),
                            })
                    except Exception as _whe:
                        import logging as _log
                        _log.getLogger(__name__).debug(f"script.deployed webhook failed (non-fatal): {_whe}")
                    # Send script deployed notification email (fire-and-forget)
                    try:
                        _sess_factory = _async_sessionmaker(_deploy_engine, expire_on_commit=False)
                        async with _sess_factory() as _email_db:
                            _user_result = await _email_db.execute(select(User).where(User.id == user_id))
                            _user = _user_result.scalar_one_or_none()
                        if _user:
                            import asyncio as _aio
                            _aio.create_task(send_script_deployed_email(
                                _user.email,
                                _user.first_name or "there",
                                request.script_name,
                                deploy_target,
                            ))
                    except Exception as _email_err:
                        import logging as _log
                        _log.getLogger(__name__).debug(f"script deployed email failed (non-fatal): {_email_err}")

                _asyncio.create_task(_fire_deploy_webhook())

            return DeployResponse(
                success=success,
                deploy_log=deploy_log.strip(),
                error=None if success else result.stderr.strip(),
            )
        except subprocess.TimeoutExpired:
            return DeployResponse(
                success=False,
                deploy_log="",
                error="Deploy timed out after 120s",
            )
        except FileNotFoundError:
            raise HTTPException(
                status_code=503,
                detail="SuiteCloud CLI not installed. Run: npm install -g @oracle/suitecloud-cli",
            )
