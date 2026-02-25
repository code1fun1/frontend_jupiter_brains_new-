import asyncio
import json
import logging
import re
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse
from uuid import uuid4

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

from open_webui.config import (
    ENABLE_VIDEO_GENERATION,
    OPENAI_API_BASE_URLS,
    OPENAI_API_KEYS,
    REPLICATE_API_KEY,
    VIDEO_GENERATION_MODEL,
)
from open_webui.constants import ERROR_MESSAGES
from open_webui.env import BASE_DIR
from open_webui.utils.auth import get_admin_user, get_verified_user
from open_webui.utils.models import get_all_models

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/video", tags=["video"])
GENERATED_VIDEO_DIR = BASE_DIR / "generated_video"
GENERATED_VIDEO_DIR.mkdir(parents=True, exist_ok=True)


def _first_config_value(config_obj) -> str:
    raw_value = getattr(config_obj, "value", config_obj)
    if isinstance(raw_value, list):
        return str(raw_value[0]).strip() if raw_value else ""
    if raw_value is None:
        return ""
    return str(raw_value).strip()


class VideoConfig(BaseModel):
    ENABLE_VIDEO_GENERATION: bool
    VIDEO_GENERATION_ENGINE: str
    VIDEO_GENERATION_MODEL: str
    REPLICATE_API_BASE_URL: str
    REPLICATE_API_KEY: Optional[str] = None
    OPENAI_VIDEO_API_BASE_URL: str
    OPENAI_VIDEO_API_KEY: Optional[str] = None
    OPENAI_VIDEO_API_VERSION: Optional[str] = None
    OPENAI_VIDEO_GENERATION_ENDPOINT: str
    VIDEO_POLL_INTERVAL_SECONDS: int
    VIDEO_TIMEOUT_SECONDS: int


class VideoConfigUpdateForm(BaseModel):
    ENABLE_VIDEO_GENERATION: bool
    VIDEO_GENERATION_ENGINE: str = "replicate"
    VIDEO_GENERATION_MODEL: str
    REPLICATE_API_BASE_URL: str = "https://api.replicate.com/v1"
    REPLICATE_API_KEY: Optional[str] = None
    OPENAI_VIDEO_API_BASE_URL: str = ""
    OPENAI_VIDEO_API_KEY: Optional[str] = None
    OPENAI_VIDEO_API_VERSION: Optional[str] = None
    OPENAI_VIDEO_GENERATION_ENDPOINT: str = "/video/generations"
    VIDEO_POLL_INTERVAL_SECONDS: int = 5
    VIDEO_TIMEOUT_SECONDS: int = 600


class GenerateVideoForm(BaseModel):
    prompt: str
    model: Optional[str] = None
    duration: Optional[int] = None
    aspect_ratio: Optional[str] = None


VIDEO_CONFIG = VideoConfig(
    ENABLE_VIDEO_GENERATION=ENABLE_VIDEO_GENERATION.value if hasattr(ENABLE_VIDEO_GENERATION, 'value') else ENABLE_VIDEO_GENERATION,
    VIDEO_GENERATION_ENGINE="replicate",
    VIDEO_GENERATION_MODEL=VIDEO_GENERATION_MODEL.value if hasattr(VIDEO_GENERATION_MODEL, 'value') else VIDEO_GENERATION_MODEL,
    REPLICATE_API_BASE_URL="https://api.replicate.com/v1",
    REPLICATE_API_KEY=REPLICATE_API_KEY.value if hasattr(REPLICATE_API_KEY, 'value') else REPLICATE_API_KEY,
    OPENAI_VIDEO_API_BASE_URL=_first_config_value(OPENAI_API_BASE_URLS).rstrip("/"),
    OPENAI_VIDEO_API_KEY=_first_config_value(OPENAI_API_KEYS),
    OPENAI_VIDEO_API_VERSION=None,
    OPENAI_VIDEO_GENERATION_ENDPOINT="/video/generations",
    VIDEO_POLL_INTERVAL_SECONDS=5,
    VIDEO_TIMEOUT_SECONDS=600,
)


def set_video_config(config: dict):
    """Backward-compatible startup hook called from main.py."""
    global VIDEO_CONFIG

    VIDEO_CONFIG.ENABLE_VIDEO_GENERATION = config.get(
        "ENABLE_VIDEO_GENERATION",
        config.get("ENABLED", VIDEO_CONFIG.ENABLE_VIDEO_GENERATION),
    )
    VIDEO_CONFIG.VIDEO_GENERATION_ENGINE = config.get(
        "VIDEO_GENERATION_ENGINE", VIDEO_CONFIG.VIDEO_GENERATION_ENGINE
    )
    VIDEO_CONFIG.VIDEO_GENERATION_MODEL = config.get(
        "VIDEO_GENERATION_MODEL", VIDEO_CONFIG.VIDEO_GENERATION_MODEL
    )
    VIDEO_CONFIG.REPLICATE_API_BASE_URL = config.get(
        "REPLICATE_API_BASE_URL", VIDEO_CONFIG.REPLICATE_API_BASE_URL
    ).rstrip("/")
    VIDEO_CONFIG.REPLICATE_API_KEY = config.get(
        "REPLICATE_API_KEY", VIDEO_CONFIG.REPLICATE_API_KEY
    )
    VIDEO_CONFIG.OPENAI_VIDEO_API_BASE_URL = config.get(
        "OPENAI_VIDEO_API_BASE_URL", VIDEO_CONFIG.OPENAI_VIDEO_API_BASE_URL
    ).rstrip("/")
    VIDEO_CONFIG.OPENAI_VIDEO_API_KEY = config.get(
        "OPENAI_VIDEO_API_KEY", VIDEO_CONFIG.OPENAI_VIDEO_API_KEY
    )
    VIDEO_CONFIG.OPENAI_VIDEO_API_VERSION = config.get(
        "OPENAI_VIDEO_API_VERSION", VIDEO_CONFIG.OPENAI_VIDEO_API_VERSION
    )
    VIDEO_CONFIG.OPENAI_VIDEO_GENERATION_ENDPOINT = config.get(
        "OPENAI_VIDEO_GENERATION_ENDPOINT",
        VIDEO_CONFIG.OPENAI_VIDEO_GENERATION_ENDPOINT,
    )
    VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS = config.get(
        "VIDEO_POLL_INTERVAL_SECONDS", VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS
    )
    VIDEO_CONFIG.VIDEO_TIMEOUT_SECONDS = config.get(
        "VIDEO_TIMEOUT_SECONDS", VIDEO_CONFIG.VIDEO_TIMEOUT_SECONDS
    )

    log.info(
        "Video config updated: enabled=%s engine=%s model=%s",
        VIDEO_CONFIG.ENABLE_VIDEO_GENERATION,
        VIDEO_CONFIG.VIDEO_GENERATION_ENGINE,
        VIDEO_CONFIG.VIDEO_GENERATION_MODEL,
    )


def _get_video_config_payload() -> dict:
    return {
        "ENABLE_VIDEO_GENERATION": VIDEO_CONFIG.ENABLE_VIDEO_GENERATION,
        "VIDEO_GENERATION_ENGINE": VIDEO_CONFIG.VIDEO_GENERATION_ENGINE,
        "VIDEO_GENERATION_MODEL": VIDEO_CONFIG.VIDEO_GENERATION_MODEL,
        "REPLICATE_API_BASE_URL": VIDEO_CONFIG.REPLICATE_API_BASE_URL,
        "REPLICATE_API_KEY": VIDEO_CONFIG.REPLICATE_API_KEY,
        "OPENAI_VIDEO_API_BASE_URL": VIDEO_CONFIG.OPENAI_VIDEO_API_BASE_URL,
        "OPENAI_VIDEO_API_KEY": VIDEO_CONFIG.OPENAI_VIDEO_API_KEY,
        "OPENAI_VIDEO_API_VERSION": VIDEO_CONFIG.OPENAI_VIDEO_API_VERSION,
        "OPENAI_VIDEO_GENERATION_ENDPOINT": VIDEO_CONFIG.OPENAI_VIDEO_GENERATION_ENDPOINT,
        "VIDEO_POLL_INTERVAL_SECONDS": VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS,
        "VIDEO_TIMEOUT_SECONDS": VIDEO_CONFIG.VIDEO_TIMEOUT_SECONDS,
    }


def _build_replicate_headers() -> dict:
    if not VIDEO_CONFIG.REPLICATE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail=ERROR_MESSAGES.DEFAULT("Replicate API key not configured."),
        )
    return {
        "Authorization": f"Bearer {VIDEO_CONFIG.REPLICATE_API_KEY}",
        "Content-Type": "application/json",
    }

log.info("VIDEO_CONFIG: %s", VIDEO_CONFIG)
def _build_openai_headers(api_key: Optional[str] = None) -> dict:
    key = api_key or VIDEO_CONFIG.OPENAI_VIDEO_API_KEY
    if not key:
        raise HTTPException(
            status_code=500,
            detail=ERROR_MESSAGES.DEFAULT("OpenAI-compatible video API key not configured."),
        )
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _resolve_prediction_target(model: str) -> dict:
    normalized = (model or "").strip()
    if not normalized:
        raise HTTPException(
            status_code=400,
            detail=ERROR_MESSAGES.DEFAULT("Video model is required."),
        )
    if "/" in normalized and ":" in normalized:
        return {"version": normalized.rsplit(":", 1)[1]}
    if re.fullmatch(r"[0-9a-fA-F]{32,64}", normalized):
        return {"version": normalized}
    return {"model": normalized}


def _guess_video_extension(video_url: str) -> str:
    path = urlparse(video_url).path
    suffix = Path(path).suffix.lower()
    if suffix in {".mp4", ".mov", ".webm", ".m4v"}:
        return suffix
    return ".mp4"


def _download_video_to_generated_folder(video_url: str) -> str:
    filename = f"video_{int(time.time())}_{uuid4().hex[:8]}{_guess_video_extension(video_url)}"
    destination = GENERATED_VIDEO_DIR / filename

    with requests.get(video_url, stream=True, timeout=120) as response:
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=ERROR_MESSAGES.DEFAULT(
                    f"Failed to download generated video: {response.text}"
                ),
            )
        with destination.open("wb") as file_obj:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    file_obj.write(chunk)

    return filename


async def save_generated_video_from_url(video_url: str) -> str:
    if not video_url:
        raise HTTPException(
            status_code=400,
            detail=ERROR_MESSAGES.DEFAULT("Generated video URL is missing."),
        )
    return await asyncio.to_thread(_download_video_to_generated_folder, video_url)


# ---------------------------------------------------------------------------
# Provider detection helpers
# ---------------------------------------------------------------------------

def _is_minimax_url(base_url: str) -> bool:
    """Return True when the base URL points to a MiniMax endpoint."""
    return "minimax" in base_url.lower()


def _get_submission_endpoint(base_url: str, configured_endpoint: str) -> str:
    """
    Return the correct video-generation submission path for the given provider.

    MiniMax uses  POST /v1/video_generation
    Everything else uses the user-configured endpoint (default: /video/generations).
    """
    if _is_minimax_url(base_url):
        return "/v1/video_generation"
    endpoint = configured_endpoint or "/video/generations"
    if not endpoint.startswith("/"):
        endpoint = f"/{endpoint}"
    return endpoint


def _normalize_model_id_for_request(model_id: str, base_url: str) -> str:
    """
    Strip provider-prefix and version hash that Open WebUI appends to model IDs.

    "minimax/video-01:5aa835260ff7f40f4069c41185f72" → "video-01"

    Providers expect only the bare model name in the request body.
    """
    name = model_id.strip()
    # Drop version hash (everything after the last colon)
    if ":" in name:
        name = name.rsplit(":", 1)[0]
    # Drop provider prefix (everything before and including the last slash)
    if "/" in name:
        name = name.rsplit("/", 1)[1]
    return name


# ---------------------------------------------------------------------------
# Provider resolution: model id → urlIdx → (base_url, api_key)
# ---------------------------------------------------------------------------

def _candidate_ids(model_id: str) -> list[str]:
    """
    Ranked candidate lookup keys for model_id.

    Open WebUI may store the model under various forms of its ID, so we
    try each variant in order until one matches OPENAI_MODELS.

      1. Full id as-is:              "minimax/video-01:5aa835..."
      2. Without hash:               "minimax/video-01"
      3. Without prefix:             "video-01:5aa835..."
      4. Without prefix or hash:     "video-01"
    """
    candidates: list[str] = [model_id]

    no_hash = model_id.rsplit(":", 1)[0] if ":" in model_id else model_id
    if no_hash not in candidates:
        candidates.append(no_hash)

    no_prefix = model_id.rsplit("/", 1)[1] if "/" in model_id else model_id
    if no_prefix not in candidates:
        candidates.append(no_prefix)

    no_both = no_hash.rsplit("/", 1)[1] if "/" in no_hash else no_hash
    if no_both not in candidates:
        candidates.append(no_both)

    return candidates


def _resolve_openai_provider_for_model(
    model_id: str, request: Optional[Request]
) -> tuple[str, str]:
    """
    Return (base_url, api_key) for the provider that owns *model_id*.

    Tries multiple candidate forms of the model ID because Open WebUI may
    store models differently from how the UI presents them.
    Falls back to VIDEO_CONFIG when the model cannot be located.
    """
    fallback_url = VIDEO_CONFIG.OPENAI_VIDEO_API_BASE_URL
    fallback_key = VIDEO_CONFIG.OPENAI_VIDEO_API_KEY or ""

    if request is None:
        return fallback_url, fallback_key

    try:
        openai_models: dict = getattr(request.app.state, "OPENAI_MODELS", {}) or {}
        cfg = request.app.state.config
        base_urls = cfg.OPENAI_API_BASE_URLS or []
        api_keys = cfg.OPENAI_API_KEYS or []

        for candidate in _candidate_ids(model_id):
            model_meta = openai_models.get(candidate)
            if model_meta is None:
                continue

            url_idx: int = model_meta.get("urlIdx", 0)

            if not isinstance(base_urls, list) or url_idx >= len(base_urls):
                log.warning(
                    "urlIdx=%d out of range for OPENAI_API_BASE_URLS (len=%d); using fallback",
                    url_idx,
                    len(base_urls) if isinstance(base_urls, list) else 0,
                )
                return fallback_url, fallback_key

            resolved_url = str(base_urls[url_idx]).rstrip("/")
            resolved_key = (
                str(api_keys[url_idx])
                if isinstance(api_keys, list) and url_idx < len(api_keys)
                else fallback_key
            )

            log.info(
                "Resolved provider for '%s' (via candidate '%s'): urlIdx=%d url='%s'",
                model_id,
                candidate,
                url_idx,
                resolved_url,
            )
            return resolved_url, resolved_key

        log.warning(
            "Model '%s' not found in OPENAI_MODELS (tried: %s); using VIDEO_CONFIG fallback",
            model_id,
            _candidate_ids(model_id),
        )
        return fallback_url, fallback_key

    except Exception:
        log.exception("_resolve_openai_provider_for_model: unexpected error, using fallback")
        return fallback_url, fallback_key


# ---------------------------------------------------------------------------
# MiniMax async task polling
# ---------------------------------------------------------------------------

async def _poll_minimax_task(task_id: str, base_url: str, api_key: str) -> dict:
    """
    Poll the MiniMax query endpoint until the video task is done.

    MiniMax poll:  GET {base_url}/v1/query/video_generation?task_id=<id>

    Terminal success response:
        {"task_id": "...", "status": "Success", "file_id": "...",
         "base_resp": {"status_code": 0, "status_msg": "success"}}

    Then retrieve the download URL via:
        GET {base_url}/v1/files/retrieve?file_id=<file_id>
        → {"file": {"download_url": "..."}}
    """
    poll_url = f"{base_url}/v1/query/video_generation"
    headers = _build_openai_headers(api_key)
    elapsed = 0

    while elapsed <= VIDEO_CONFIG.VIDEO_TIMEOUT_SECONDS:
        r = await asyncio.to_thread(
            requests.get,
            poll_url,
            headers=headers,
            params={"task_id": task_id},
            timeout=30,
        )

        if r.status_code != 200:
            log.warning("MiniMax poll HTTP %d: %s", r.status_code, r.text)
            await asyncio.sleep(VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS)
            elapsed += VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS
            continue

        data = r.json()
        status = data.get("status", "")
        base_resp = data.get("base_resp", {})
        status_code = base_resp.get("status_code", -1)

        log.debug("MiniMax poll task_id=%s status=%s", task_id, status)

        if status == "Success" and status_code == 0:
            file_id = data.get("file_id")
            if not file_id:
                raise HTTPException(
                    status_code=422,
                    detail=ERROR_MESSAGES.DEFAULT(
                        "MiniMax task succeeded but returned no file_id."
                    ),
                )
            video_url = await _fetch_minimax_file_url(file_id, base_url, api_key)
            return {"status": "succeeded", "video_url": video_url}

        if status in {"Fail", "Failed", "Canceled", "Cancelled"}:
            return {
                "status": "failed",
                "error": base_resp.get("status_msg", f"MiniMax task failed: {status}"),
            }

        # Still in progress ("Preparing", "Processing", "Queueing", etc.)
        await asyncio.sleep(VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS)
        elapsed += VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS

    return {
        "status": "timeout",
        "error": f"MiniMax video generation timed out after {VIDEO_CONFIG.VIDEO_TIMEOUT_SECONDS}s.",
    }


async def _fetch_minimax_file_url(file_id: str, base_url: str, api_key: str) -> str:
    """
    Retrieve the CDN download URL for a completed MiniMax-generated file.

    GET {base_url}/v1/files/retrieve?file_id=<file_id>
    Response: {"file": {"file_id": "...", "download_url": "...", ...}}
    """
    retrieve_url = f"{base_url}/v1/files/retrieve"
    headers = _build_openai_headers(api_key)

    r = await asyncio.to_thread(
        requests.get,
        retrieve_url,
        headers=headers,
        params={"file_id": file_id},
        timeout=30,
    )

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail=ERROR_MESSAGES.DEFAULT(
                f"Failed to retrieve MiniMax file {file_id}: {r.text}"
            ),
        )

    data = r.json()
    download_url = (
        data.get("file", {}).get("download_url")
        or data.get("download_url")
        or data.get("url")
    )

    if not download_url:
        raise HTTPException(
            status_code=422,
            detail=ERROR_MESSAGES.DEFAULT(
                f"MiniMax file retrieve response missing download_url. Got: {data}"
            ),
        )
    log.info("MiniMax file retrieve response: %s", data)
    return download_url


# ---------------------------------------------------------------------------
# Replicate
# ---------------------------------------------------------------------------

async def _create_replicate_prediction(form_data: GenerateVideoForm) -> dict:
    target_model = form_data.model or VIDEO_CONFIG.VIDEO_GENERATION_MODEL
    payload = {
        **_resolve_prediction_target(target_model),
        "input": {
            "prompt": form_data.prompt,
            **({"duration": form_data.duration} if form_data.duration is not None else {}),
            **(
                {"aspect_ratio": form_data.aspect_ratio}
                if form_data.aspect_ratio is not None
                else {}
            ),
        },
    }

    r = await asyncio.to_thread(
        requests.post,
        url=f"{VIDEO_CONFIG.REPLICATE_API_BASE_URL}/predictions",
        headers=_build_replicate_headers(),
        json=payload,
        timeout=30,
    )

    if r.status_code != 201:
        raise HTTPException(
            status_code=r.status_code,
            detail=ERROR_MESSAGES.DEFAULT(r.text),
        )

    return r.json()


async def _get_prediction_status(prediction_id: str) -> dict:
    r = await asyncio.to_thread(
        requests.get,
        url=f"{VIDEO_CONFIG.REPLICATE_API_BASE_URL}/predictions/{prediction_id}",
        headers=_build_replicate_headers(),
        timeout=30,
    )

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail=ERROR_MESSAGES.DEFAULT(r.text),
        )

    return r.json()


# ---------------------------------------------------------------------------
# Generic OpenAI-compatible video generation (MiniMax async + sync fallback)
# ---------------------------------------------------------------------------

def _extract_video_url_from_openai_payload(payload: dict) -> Optional[str]:
    if not isinstance(payload, dict):
        return None

    data = payload.get("data")
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            for key in ("video_url", "url"):
                if isinstance(first.get(key), str) and first.get(key):
                    return first[key]

    for key in ("video_url", "url", "output_url"):
        if isinstance(payload.get(key), str) and payload.get(key):
            return payload[key]

    output = payload.get("output")
    if isinstance(output, list) and output and isinstance(output[0], str):
        return output[0]
    if isinstance(output, str) and output:
        return output

    return None


async def _create_openai_video_generation(
    form_data: GenerateVideoForm,
    request: Optional[Request] = None,
) -> dict:
    """
    Submit a video-generation request to the correct OpenAI-compatible provider.

    Handles:
      - Provider routing via OPENAI_MODELS registry (model → urlIdx → base_url)
      - MiniMax async task pattern: submit → poll → file retrieve
      - Generic synchronous OpenAI-style response (immediate video URL)
    """
    # model_id = form_data.model or VIDEO_CONFIG.VIDEO_GENERATION_MODEL
    model_id = VIDEO_CONFIG.VIDEO_GENERATION_MODEL
    # Resolve the correct provider for this model
    if request is not None:
        base_url, api_key = _resolve_openai_provider_for_model(model_id, request)
    else:
        base_url = VIDEO_CONFIG.OPENAI_VIDEO_API_BASE_URL
        api_key = VIDEO_CONFIG.OPENAI_VIDEO_API_KEY or ""

    if not base_url:
        raise HTTPException(
            status_code=500,
            detail=ERROR_MESSAGES.DEFAULT(
                "OpenAI-compatible video API base URL is not configured."
            ),
        )

    # Auto-detect endpoint path (MiniMax differs from generic OpenAI)
    endpoint = _get_submission_endpoint(base_url, VIDEO_CONFIG.OPENAI_VIDEO_GENERATION_ENDPOINT)
    url = f"{base_url}{endpoint}"
    if VIDEO_CONFIG.OPENAI_VIDEO_API_VERSION:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}api-version={VIDEO_CONFIG.OPENAI_VIDEO_API_VERSION}"

    # Normalize model name: strip prefix + hash before sending to provider API
    api_model_name = _normalize_model_id_for_request(model_id, base_url)

    payload: dict = {
        "model": api_model_name,
        "prompt": form_data.prompt,
    }
    if form_data.duration is not None:
        payload["duration"] = form_data.duration
    if form_data.aspect_ratio is not None:
        payload["aspect_ratio"] = form_data.aspect_ratio

    log.info(
        "Video generation → POST %s  model=%s (original id: %s)",
        url,
        api_model_name,
        model_id,
    )

    r = await asyncio.to_thread(
        requests.post,
        url=url,
        headers=_build_openai_headers(api_key),
        json=payload,
        timeout=60,
    )

    if r.status_code not in {200, 201}:
        raise HTTPException(
            status_code=r.status_code,
            detail=ERROR_MESSAGES.DEFAULT(
                f"Video generation request failed (HTTP {r.status_code}): {r.text}"
            ),
        )

    res = r.json()
    log.debug("Video generation submit response: %s", res)

    # --- MiniMax async path: response is {task_id, base_resp}, not a video URL ---
    if _is_minimax_url(base_url):
        task_id = res.get("task_id")
        base_resp = res.get("base_resp", {})
        status_code = base_resp.get("status_code", -1)

        if not task_id:
            raise HTTPException(
                status_code=422,
                detail=ERROR_MESSAGES.DEFAULT(
                    f"MiniMax did not return a task_id. Response: {res}"
                ),
            )

        if status_code != 0:
            raise HTTPException(
                status_code=422,
                detail=ERROR_MESSAGES.DEFAULT(
                    f"MiniMax rejected the request: {base_resp.get('status_msg', res)}"
                ),
            )

        log.info("MiniMax task submitted, polling task_id=%s", task_id)
        return await _poll_minimax_task(task_id, base_url, api_key)

    # --- Generic synchronous path: expect an immediate video URL ---
    video_url = _extract_video_url_from_openai_payload(res)
    if not video_url:
        raise HTTPException(
            status_code=422,
            detail=ERROR_MESSAGES.DEFAULT(
                f"Video URL not found in provider response. Got: {res}"
            ),
        )

    return {"status": "succeeded", "video_url": video_url}


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@router.get("/config", response_model=VideoConfig)
async def get_video_config(user=Depends(get_admin_user)):
    return _get_video_config_payload()


@router.post("/config/update", response_model=VideoConfig)
async def update_video_config(
    request: Request,
    form_data: VideoConfigUpdateForm,
    user=Depends(get_admin_user),
):
    if form_data.VIDEO_POLL_INTERVAL_SECONDS <= 0:
        raise HTTPException(
            status_code=400,
            detail=ERROR_MESSAGES.INCORRECT_FORMAT("  (poll interval must be > 0)."),
        )

    if form_data.VIDEO_TIMEOUT_SECONDS <= 0:
        raise HTTPException(
            status_code=400,
            detail=ERROR_MESSAGES.INCORRECT_FORMAT("  (timeout must be > 0)."),
        )

    # Update app.state.config to trigger auto-save to database (like images)
    request.app.state.config.ENABLE_VIDEO_GENERATION = form_data.ENABLE_VIDEO_GENERATION
    request.app.state.config.VIDEO_GENERATION_MODEL = form_data.VIDEO_GENERATION_MODEL
    request.app.state.config.REPLICATE_API_KEY = form_data.REPLICATE_API_KEY

    set_video_config(form_data.model_dump())
    return _get_video_config_payload()


@router.get("/models")
async def get_video_models(request: Request, user=Depends(get_verified_user)):
    try:
        all_models = await get_all_models(request, refresh=False, user=user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=ERROR_MESSAGES.DEFAULT(e))

    def _normalize_bool(value) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "y", "on"}
        if isinstance(value, (int, float)):
            return value != 0
        return False

    def _normalize_task(value) -> str:
        return value.strip().lower() if isinstance(value, str) else ""

    def _extract_tag_names(*tag_sources) -> list[str]:
        names = []
        for source in tag_sources:
            if not source:
                continue
            if not isinstance(source, (list, tuple, set)):
                source = [source]
            for item in source:
                if isinstance(item, dict):
                    name = item.get("name") or item.get("id") or item.get("label")
                else:
                    name = item
                if name is None:
                    continue
                name_str = str(name).strip().lower()
                if name_str:
                    names.append(name_str)
        return names

    models = []
    for model in all_models:
        info = model.get("info", {}) or {}
        meta = info.get("meta", {}) or {}
        capabilities = meta.get("capabilities", {}) or {}
        tag_names = _extract_tag_names(
            model.get("tags", []),
            info.get("tags", []),
            meta.get("tags", []),
        )

        is_video = (
            _normalize_bool(capabilities.get("video"))
            or _normalize_bool(capabilities.get("video_generation"))
            or _normalize_task(meta.get("task")) in {"video", "video_generation"}
            or "video" in tag_names
            or "video_generation" in tag_names
        )

        if not is_video:
            continue

        models.append(
            {
                "id": model["id"],
                "name": model.get("name", model["id"]),
                "description": meta.get("description") or f"Video model: {model['id']}",
                "provider": model.get("owned_by", meta.get("provider", "unknown")),
            }
        )

    if not models:
        models = [
            {
                "id": VIDEO_CONFIG.VIDEO_GENERATION_MODEL,
                "name": VIDEO_CONFIG.VIDEO_GENERATION_MODEL,
                "description": f"Video model: {VIDEO_CONFIG.VIDEO_GENERATION_MODEL}",
                "provider": "replicate",
            }
        ]

    return {"models": models}


@router.post("/generate")
async def generate_video(
    request: Request,
    form_data: GenerateVideoForm,
    user=Depends(get_verified_user),
):
    if not VIDEO_CONFIG.ENABLE_VIDEO_GENERATION:
        raise HTTPException(
            status_code=400,
            detail=ERROR_MESSAGES.DEFAULT("Video generation is disabled."),
        )

    if VIDEO_CONFIG.VIDEO_GENERATION_ENGINE == "openai":
        res = await _create_openai_video_generation(form_data, request=request)
        return {
            "status": res.get("status", "succeeded"),
            "prediction_id": None,
            "video_url": res.get("video_url"),
            "error": res.get("error"),
        }

    # Replicate path
    log.info("Entering into replicate path")
    prediction = await _create_replicate_prediction(form_data)
    prediction_id = prediction["id"]

    elapsed = 0
    while elapsed <= VIDEO_CONFIG.VIDEO_TIMEOUT_SECONDS:
        status = await _get_prediction_status(prediction_id)

        if status["status"] == "succeeded":
            output = status.get("output")
            video_url = output[0] if isinstance(output, list) and output else output
            log.info("Video URL: %s", video_url)
            return {
                "status": "succeeded",
                "prediction_id": prediction_id,
                "video_url": video_url,
            }

        if status["status"] in {"failed", "canceled"}:
            return {
                "status": status["status"],
                "prediction_id": prediction_id,
                "error": status.get("error"),
            }

        await asyncio.sleep(VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS)
        elapsed += VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS

    return {
        "status": "timeout",
        "prediction_id": prediction_id,
        "error": "Video generation timed out.",
    }


@router.post("/generate/stream")
async def generate_video_stream(
    form_data: GenerateVideoForm,
    user=Depends(get_verified_user),
):
    if not VIDEO_CONFIG.ENABLE_VIDEO_GENERATION:
        raise HTTPException(
            status_code=400,
            detail=ERROR_MESSAGES.DEFAULT("Video generation is disabled."),
        )

    async def _event_stream():
        try:
            yield f"data: {json.dumps({'status': 'starting'})}\n\n"

            prediction = await _create_replicate_prediction(form_data)
            prediction_id = prediction["id"]
            yield f"data: {json.dumps({'status': 'processing', 'prediction_id': prediction_id})}\n\n"

            elapsed = 0
            while elapsed <= VIDEO_CONFIG.VIDEO_TIMEOUT_SECONDS:
                status = await _get_prediction_status(prediction_id)
                state = status["status"]

                if state == "succeeded":
                    output = status.get("output")
                    video_url = output[0] if isinstance(output, list) and output else output
                    yield f"data: {json.dumps({'status': 'succeeded', 'prediction_id': prediction_id, 'video_url': video_url})}\n\n"
                    return

                if state in {"failed", "canceled"}:
                    yield f"data: {json.dumps({'status': state, 'prediction_id': prediction_id, 'error': status.get('error')})}\n\n"
                    return

                yield f"data: {json.dumps({'status': 'processing', 'prediction_id': prediction_id, 'elapsed_seconds': elapsed})}\n\n"
                await asyncio.sleep(VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS)
                elapsed += VIDEO_CONFIG.VIDEO_POLL_INTERVAL_SECONDS

            yield f"data: {json.dumps({'status': 'timeout', 'prediction_id': prediction_id, 'error': 'Video generation timed out.'})}\n\n"

        except Exception as e:
            log.exception(e)
            yield f"data: {json.dumps({'status': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(_event_stream(), media_type="text/event-stream")


@router.get("/files/{filename}")
async def get_generated_video_file(filename: str):
    safe_filename = Path(filename).name
    file_path = GENERATED_VIDEO_DIR / safe_filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=ERROR_MESSAGES.DEFAULT("Generated video file not found."),
        )
    log.info("Generated video file: %s", file_path)
    return FileResponse(file_path, media_type="video/mp4", filename=safe_filename)


# Legacy compatibility endpoints.
@router.get("/legacy/config")
async def get_video_config_legacy(user=Depends(get_verified_user)):
    return JSONResponse(
        content={
            "enabled": VIDEO_CONFIG.ENABLE_VIDEO_GENERATION,
            "has_api_key": bool(VIDEO_CONFIG.REPLICATE_API_KEY),
        }
    )


@router.post("/legacy/config")
async def update_video_config_legacy(config: dict, user=Depends(get_admin_user)):
    set_video_config(config)
    return JSONResponse(content={"status": "success"})