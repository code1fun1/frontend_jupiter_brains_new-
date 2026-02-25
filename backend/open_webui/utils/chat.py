import time
import logging
import sys

from aiocache import cached
from typing import Any, Optional
import random
import json
import inspect
import uuid
import asyncio

from fastapi import Request, status
from starlette.responses import Response, StreamingResponse, JSONResponse


from open_webui.models.users import UserModel

from open_webui.socket.main import (
    sio,
    get_event_call,
    get_event_emitter,
)
from open_webui.functions import generate_function_chat_completion

from open_webui.routers.openai import (
    generate_chat_completion as generate_openai_chat_completion,
)

from open_webui.routers.ollama import (
    generate_chat_completion as generate_ollama_chat_completion,
)

from open_webui.routers.pipelines import (
    process_pipeline_inlet_filter,
    process_pipeline_outlet_filter,
)

from open_webui.models.functions import Functions
from open_webui.models.models import Models


from open_webui.utils.plugin import (
    load_function_module_by_id,
    get_function_module_from_cache,
)
from open_webui.utils.models import get_all_models, check_model_access
from open_webui.utils.payload import convert_payload_openai_to_ollama
from open_webui.utils.response import (
    convert_response_ollama_to_openai,
    convert_streaming_response_ollama_to_openai,
)
from open_webui.utils.filter import (
    get_sorted_filter_ids,
    process_filter_functions,
)
from open_webui.utils.slm_router import process_slm_routing

from open_webui.env import GLOBAL_LOG_LEVEL, BYPASS_MODEL_ACCESS_CONTROL


logging.basicConfig(stream=sys.stdout, level=GLOBAL_LOG_LEVEL)
log = logging.getLogger(__name__)


def log_function_entry(func_name, args=None):
    """Helper to log function entry with arguments"""
    log.debug(f"[ENTER] {func_name}")
    if args:
        log.debug(f"[ARGS] {func_name}: {json.dumps(args, default=str, indent=2)}")


def log_function_exit(func_name, result=None):
    """Helper to log function exit with return value"""
    log.debug(f"[EXIT] {func_name}")
    if result is not None:
        try:
            log.debug(f"[RETURN] {func_name}: {json.dumps(result, default=str, indent=2)[:500]}")
        except (TypeError, ValueError):
            log.debug(f"[RETURN] {func_name}: {type(result)}")


async def generate_direct_chat_completion(
    request: Request,
    form_data: dict,
    user: Any,
    models: dict,
):
    log.info("[CHAT-FLOW] generate_direct_chat_completion - ENTRY")
    log.debug(f"[CHAT-FLOW] User ID: {user.id if hasattr(user, 'id') else 'unknown'}")
    log.debug(f"[CHAT-FLOW] Models available: {list(models.keys())}")
    
    
    # Log incoming payload (sanitized)
    sanitized_payload = {
        **form_data,
        'messages_count': len(form_data.get('messages', [])),
        'model': form_data.get('model'),
        'stream': form_data.get('stream'),
    }
    log.debug(f"[CHAT-FLOW] Incoming form_data: {json.dumps(sanitized_payload, default=str)}")

    metadata = form_data.pop("metadata", {})

    user_id = metadata.get("user_id")
    session_id = metadata.get("session_id")
    request_id = str(uuid.uuid4())  # Generate a unique request ID

    event_caller = get_event_call(metadata)

    channel = f"{user_id}:{session_id}:{request_id}"
    logging.info(f"WebSocket channel: {channel}")

    if form_data.get("stream"):
        q = asyncio.Queue()

        async def message_listener(sid, data):
            """
            Handle received socket messages and push them into the queue.
            """
            await q.put(data)

        # Register the listener
        sio.on(channel, message_listener)

        # Start processing chat completion in background
        res = await event_caller(
            {
                "type": "request:chat:completion",
                "data": {
                    "form_data": form_data,
                    "model": models[form_data["model"]],
                    "channel": channel,
                    "session_id": session_id,
                },
            }
        )

        log.info(f"res: {res}")

        if res.get("status", False):
            # Define a generator to stream responses
            async def event_generator():
                nonlocal q
                try:
                    while True:
                        data = await q.get()  # Wait for new messages
                        if isinstance(data, dict):
                            if "done" in data and data["done"]:
                                break  # Stop streaming when 'done' is received

                            yield f"data: {json.dumps(data)}\n\n"
                        elif isinstance(data, str):
                            if "data:" in data:
                                yield f"{data}\n\n"
                            else:
                                yield f"data: {data}\n\n"
                except Exception as e:
                    log.debug(f"Error in event generator: {e}")
                    pass

            # Define a background task to run the event generator
            async def background():
                try:
                    del sio.handlers["/"][channel]
                except Exception as e:
                    pass

            # Return the streaming response
            return StreamingResponse(
                event_generator(), media_type="text/event-stream", background=background
            )
        else:
            raise Exception(str(res))
    else:
        res = await event_caller(
            {
                "type": "request:chat:completion",
                "data": {
                    "form_data": form_data,
                    "model": models[form_data["model"]],
                    "channel": channel,
                    "session_id": session_id,
                },
            }
        )

        if "error" in res and res["error"]:
            raise Exception(res["error"])

        return res


async def generate_chat_completion(
    request: Request,
    form_data: dict,
    user: Any,
    bypass_filter: bool = False,
    bypass_system_prompt: bool = False,
):
    log.info("[CHAT-FLOW] ===== GENERATE CHAT COMPLETION =====")
    log.info("="*80)
    log.info("[CHAT-COMPLETION] 🚀 ENTRY")
    
    # Check for image_generation flag in metadata
    metadata = form_data.get("metadata", {})
    img_gen_flag = metadata.get("image_generation", False)
    log.info(f"[CHAT-COMPLETION] 🎨 Image generation flag: {img_gen_flag}")
    log.info(f"[CHAT-COMPLETION] Model: {form_data.get('model')}")
    log.info(f"[CHAT-COMPLETION] Stream: {form_data.get('stream')}")
    log.info(f"[CHAT-COMPLETION] Message count: {len(form_data.get('messages', []))}")
    # =============================
    # EXTRACT SLM SETTINGS FROM METADATA
    # =============================
    metadata = form_data.get("metadata", {})
    
    # Check if image generation is enabled - skip SLM routing entirely
    image_generation = metadata.get("image_generation", False)
    is_background_task = metadata.get("task") is not None  # Title/Tag/Follow-up generation
    features = metadata.get("features", {}) or {}
    params = form_data.get("params", {}) or {}
    video_generation_enabled = bool(features.get("video_generation", False))
    auto_select_param = form_data.pop("auto_select", params.get("auto_select", None))
    

    if image_generation:
        log.info("[CHAT-FLOW] ⏭️ Image generation enabled - skipping SLM routing")
    
    # if is_background_task:
    #     log.info(f"[CHAT-FLOW] ⏭️ Background task detected ({metadata.get('task')}) - skipping SLM routing")
    
    slm_enabled = metadata.get("slm_enabled", False)
    slm_decision = metadata.get("slm_decision")
    slm_processed = metadata.get("slm_processed", False)
    
    log.info(f"[CHAT-FLOW] SLM Settings:")
    log.info(f"[CHAT-FLOW]   slm_enabled={slm_enabled}")
    log.info(f"[CHAT-FLOW]   slm_decision={slm_decision}")
    log.info(f"[CHAT-FLOW]   slm_processed={slm_processed}")
    log.info(f"[CHAT-FLOW]   image_generation={image_generation}")
    log.info(f"[CHAT-FLOW]   model={form_data.get('model')}")
    
    # =============================
    # SLM ROUTING LOGIC
    # =============================
    
    # Skip SLM routing entirely when image generation or background task is active
    disable_slm_routing = image_generation or is_background_task or video_generation_enabled 
    if disable_slm_routing:
        reason = []
        if image_generation:
            reason.append("image_generation=true")
        if is_background_task:
            reason.append(f"background_task={metadata.get('task')}")
        if video_generation_enabled:
            reason.append("video_generation=true")

        
        log.info(f"[CHAT-FLOW] ⏭️ Skipping SLM routing ({', '.join(reason)}), keeping model: {form_data.get('model')}")
    else:
        # Handle user decision (accept/reject)
        if slm_decision is not None:
            log.info(f"[CHAT-FLOW] ⚡ User decision: {slm_decision}")
            
            try:
                if slm_decision == "accept":
                    log.info(f"[CHAT-FLOW] User ACCEPTED - Using model: {form_data.get('model')}")
                    
                elif slm_decision == "reject":
                    log.info(f"[CHAT-FLOW] User REJECTED - Using model: {form_data.get('model')}")
                
                # Enhance prompt for both cases
                slm_result = await process_slm_routing(
                    form_data=form_data,
                    user=user,
                    request=request,
                    show_recommendation=False,
                    enhancement_only=True
                )
                
                form_data = slm_result.get("enhanced_form_data", form_data)
                
                # Mark as processed and store SLM result
                if "metadata" not in form_data:
                    form_data["metadata"] = {}
                form_data["metadata"]["slm_processed"] = True
                
                # ✅ FIX: Avoid circular reference by removing enhanced_form_data from stored result
                slm_result_safe = slm_result.copy()
                slm_result_safe.pop("enhanced_form_data", None)
                form_data["metadata"]["slm_result"] = slm_result_safe
                
                log.info(f"[CHAT-FLOW] Enhancement complete, proceeding with model: {form_data.get('model')}")
                
            except Exception as e:
                log.error(f"[CHAT-FLOW] Enhancement error: {e}", exc_info=True)
                # Continue with original form_data
        
        # First request with toggle ON
        elif not slm_processed and slm_enabled:
            log.info("[CHAT-FLOW] First request with toggle ON - analyzing...")
            
            try:
                slm_result = await process_slm_routing(
                    form_data=form_data,
                    user=user,
                    request=request,
                    show_recommendation=True
                )
                
                if slm_result.get("should_switch") and slm_result.get("show_recommendation"):
                    log.info("[CHAT-FLOW] 🔄 Returning model recommendation to user")
                    
                    return JSONResponse(
                        status_code=200,
                        content={
                            "type": "model_recommendation",
                            "current_model": form_data.get("model"),
                            "recommended_model": slm_result["recommended_model"],
                            "reason": slm_result["selection_info"].get("reason"),
                            "intent": slm_result["selection_info"].get("intent"),
                            "complexity": slm_result["selection_info"].get("complexity"),
                            "confidence": slm_result["selection_info"].get("confidence"),
                            "alternatives": slm_result["alternatives"],
                            "is_confidential": slm_result.get("is_confidential", False),
                            "confidential_info": slm_result.get("confidential_info", {}),
                            "message": "We recommend a different model for better results."
                        }
                    )
                
                form_data = slm_result.get("enhanced_form_data", form_data)
                
                # Store SLM result in metadata
                if "metadata" not in form_data:
                    form_data["metadata"] = {}
                
                # ✅ FIX: Avoid circular reference
                slm_result_safe = slm_result.copy()
                slm_result_safe.pop("enhanced_form_data", None)
                form_data["metadata"]["slm_result"] = slm_result_safe
                
            except Exception as e:
                log.error(f"[CHAT-FLOW] SLM routing error: {e}", exc_info=True)
        
        # Toggle OFF - auto-route
        elif not slm_processed and not slm_enabled:
            log.info("[CHAT-FLOW] Toggle OFF - auto-routing...")
            
            try:
                slm_result = await process_slm_routing(
                    form_data=form_data,
                    user=user,
                    request=request,
                    show_recommendation=False
                )
                
                form_data = slm_result.get("enhanced_form_data", form_data)
                
                # Store SLM result in metadata
                if "metadata" not in form_data:
                    form_data["metadata"] = {}
                
                # ✅ FIX: Avoid circular reference
                slm_result_safe = slm_result.copy()
                slm_result_safe.pop("enhanced_form_data", None)
                form_data["metadata"]["slm_result"] = slm_result_safe
                
                log.info(f"[CHAT-FLOW] Auto-routed to: {form_data.get('model')}")
                
            except Exception as e:
                log.error(f"[CHAT-FLOW] Auto-routing error: {e}", exc_info=True)
        
        else:
            log.info("[CHAT-FLOW] ⏭️ Already processed, skipping SLM")
    
    # =============================
    # MERGE REQUEST STATE METADATA
    # =============================
    if hasattr(request.state, "metadata"):
        form_data["metadata"] = {
            **request.state.metadata,
            **form_data.get("metadata", {})
        }

    # =============================
    # VALIDATE MODEL EXISTS
    # =============================
    if BYPASS_MODEL_ACCESS_CONTROL:
        bypass_filter = True

    if getattr(request.state, "direct", False) and hasattr(request.state, "model"):
        models = {request.state.model["id"]: request.state.model}
    else:
        models = request.app.state.MODELS

    model_id = form_data["model"]
    
    # ✅ Better error handling for missing model
    if model_id not in models:
        log.error(f"[CHAT-FLOW] Model '{model_id}' not found in available models")
        log.error(f"[CHAT-FLOW] Available models: {list(models.keys())}")
        raise Exception(f"Model '{model_id}' not found. Available models: {', '.join(list(models.keys())[:5])}")

    model = models[model_id]
    
    log.info(f"[CHAT-FLOW] ✅ Using model: {model_id}")

    # =============================
    # EXECUTE CHAT COMPLETION
    # =============================
    if getattr(request.state, "direct", False):
        return await generate_direct_chat_completion(
            request, form_data, user=user, models=models
        )
    else:
        if not bypass_filter and user.role == "user":
            try:
                check_model_access(user, model)
            except Exception as e:
                log.error(f"[CHAT-FLOW] Access check failed: {e}")
                raise e

        if model.get("owned_by") == "arena":
            pass

        if model.get("pipe"):
            return await generate_function_chat_completion(
                request, form_data, user=user, models=models
            )
            
        if model.get("owned_by") == "ollama":
            form_data = convert_payload_openai_to_ollama(form_data)
            response = await generate_ollama_chat_completion(
                request=request,
                form_data=form_data,
                user=user,
                bypass_filter=bypass_filter,
                bypass_system_prompt=bypass_system_prompt,
            )
            if form_data.get("stream"):
                response.headers["content-type"] = "text/event-stream"
                return StreamingResponse(
                    convert_streaming_response_ollama_to_openai(response),
                    headers=dict(response.headers),
                    background=response.background,
                )
            else:
                return convert_response_ollama_to_openai(response)
        else:
            return await generate_openai_chat_completion(
                request=request,
                form_data=form_data,
                user=user,
                bypass_filter=bypass_filter,
                bypass_system_prompt=bypass_system_prompt,
            )



chat_completion = generate_chat_completion


async def chat_completed(request: Request, form_data: dict, user: Any):
    if not request.app.state.MODELS:
        await get_all_models(request, user=user)

    if getattr(request.state, "direct", False) and hasattr(request.state, "model"):
        models = {
            request.state.model["id"]: request.state.model,
        }
    else:
        models = request.app.state.MODELS

    data = form_data
    model_id = data["model"]
    if model_id not in models:
        raise Exception("Model not found")

    model = models[model_id]

    try:
        data = await process_pipeline_outlet_filter(request, data, user, models)
    except Exception as e:
        raise Exception(f"Error: {e}")

    metadata = {
        "chat_id": data["chat_id"],
        "message_id": data["id"],
        "filter_ids": data.get("filter_ids", []),
        "session_id": data["session_id"],
        "user_id": user.id,
    }

    extra_params = {
        "__event_emitter__": get_event_emitter(metadata),
        "__event_call__": get_event_call(metadata),
        "__user__": user.model_dump() if isinstance(user, UserModel) else {},
        "__metadata__": metadata,
        "__request__": request,
        "__model__": model,
    }

    try:
        filter_functions = [
            Functions.get_function_by_id(filter_id)
            for filter_id in get_sorted_filter_ids(
                request, model, metadata.get("filter_ids", [])
            )
        ]

        result, _ = await process_filter_functions(
            request=request,
            filter_functions=filter_functions,
            filter_type="outlet",
            form_data=data,
            extra_params=extra_params,
        )
        return result
    except Exception as e:
        raise Exception(f"Error: {e}")


async def chat_action(request: Request, action_id: str, form_data: dict, user: Any):
    if "." in action_id:
        action_id, sub_action_id = action_id.split(".")
    else:
        sub_action_id = None

    action = Functions.get_function_by_id(action_id)
    if not action:
        raise Exception(f"Action not found: {action_id}")

    if not request.app.state.MODELS:
        await get_all_models(request, user=user)

    if getattr(request.state, "direct", False) and hasattr(request.state, "model"):
        models = {
            request.state.model["id"]: request.state.model,
        }
    else:
        models = request.app.state.MODELS

    data = form_data
    model_id = data["model"]

    if model_id not in models:
        raise Exception("Model not found")
    model = models[model_id]

    __event_emitter__ = get_event_emitter(
        {
            "chat_id": data["chat_id"],
            "message_id": data["id"],
            "session_id": data["session_id"],
            "user_id": user.id,
        }
    )
    __event_call__ = get_event_call(
        {
            "chat_id": data["chat_id"],
            "message_id": data["id"],
            "session_id": data["session_id"],
            "user_id": user.id,
        }
    )

    function_module, _, _ = get_function_module_from_cache(request, action_id)

    if hasattr(function_module, "valves") and hasattr(function_module, "Valves"):
        valves = Functions.get_function_valves_by_id(action_id)
        function_module.valves = function_module.Valves(**(valves if valves else {}))

    if hasattr(function_module, "action"):
        try:
            action = function_module.action

            # Get the signature of the function
            sig = inspect.signature(action)
            params = {"body": data}

            # Extra parameters to be passed to the function
            extra_params = {
                "__model__": model,
                "__id__": sub_action_id if sub_action_id is not None else action_id,
                "__event_emitter__": __event_emitter__,
                "__event_call__": __event_call__,
                "__request__": request,
            }

            # Add extra params in contained in function signature
            for key, value in extra_params.items():
                if key in sig.parameters:
                    params[key] = value

            if "__user__" in sig.parameters:
                __user__ = user.model_dump() if isinstance(user, UserModel) else {}

                try:
                    if hasattr(function_module, "UserValves"):
                        __user__["valves"] = function_module.UserValves(
                            **Functions.get_user_valves_by_id_and_user_id(
                                action_id, user.id
                            )
                        )
                except Exception as e:
                    log.exception(f"Failed to get user values: {e}")

                params = {**params, "__user__": __user__}

            if inspect.iscoroutinefunction(action):
                data = await action(**params)
            else:
                data = action(**params)

        except Exception as e:
            raise Exception(f"Error: {e}")

    return data