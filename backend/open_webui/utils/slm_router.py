"""
SLM Router - Enhanced version with conversation history management
Fixes token limit issues by implementing smart context window management
"""

import os
import json
import re
import time
import logging
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional
from groq import Groq

log = logging.getLogger(__name__)

# =============================
# CONFIGURATION
# =============================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable not set")

SELECTOR_MODEL_ID = "llama-3.1-8b-instant"
ENHANCER_MODEL_ID = "llama-3.1-8b-instant"

# Confidential data handling
CONFIDENTIAL_MODEL_ID = "groq/compound"          # Always route confidential queries here
CONFIDENTIAL_DETECTOR_MODEL_ID = "llama-3.1-8b-instant"  # Fast/cheap classifier

# Token management settings
MAX_HISTORY_TOKENS = 4000  # Reserve tokens for history
RESERVED_COMPLETION_TOKENS = 1500  # Reserve for response
TOKENS_PER_MESSAGE = 4  # Overhead per message
AVG_CHARS_PER_TOKEN = 4  # Approximate character to token ratio

# Anti-hallucination thresholds
MIN_QUERY_LENGTH_FOR_ENHANCEMENT = 10
MAX_ENHANCEMENT_RATIO = 3.0
MIN_SIMILARITY_THRESHOLD = 0.3

# Model-specific token limits (update based on your available models)
MODEL_TOKEN_LIMITS = {
    "llama-3.1-8b-instant": 8000,
    "llama-3.1-70b-versatile": 128000,
    "llama-3.3-70b-versatile": 128000,
    "mixtral-8x7b-32768": 32768,
    "gemma-7b-it": 8192,
    "default": 4096
}


# =============================
# TOKEN ESTIMATION
# =============================
def estimate_tokens(text: str) -> int:
    """
    Estimate token count for text.
    More accurate than simple character division.
    """
    if not text:
        return 0
    
    # Basic estimation: ~4 chars per token on average
    # But account for special tokens, formatting, etc.
    char_count = len(text)
    word_count = len(text.split())
    
    # Use a weighted approach
    estimated = max(
        char_count // AVG_CHARS_PER_TOKEN,
        word_count * 1.3  # Words are typically 1.3 tokens
    )
    
    return int(estimated)


def estimate_messages_tokens(messages: List[Dict[str, str]]) -> int:
    """
    Estimate total tokens for a list of messages.
    Includes message overhead.
    """
    total = 0
    
    for msg in messages:
        content = msg.get("content", "")
        total += estimate_tokens(content)
        total += TOKENS_PER_MESSAGE  # Overhead for role, formatting, etc.
    
    return total


def get_model_token_limit(model_id: str) -> int:
    """Get token limit for a specific model."""
    for key, limit in MODEL_TOKEN_LIMITS.items():
        if key in model_id.lower():
            return limit
    return MODEL_TOKEN_LIMITS["default"]


# =============================
# CONVERSATION HISTORY MANAGEMENT
# =============================
class ConversationManager:
    """
    Manages conversation history to fit within token limits.
    Implements multiple strategies for context reduction.
    """
    
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.token_limit = get_model_token_limit(model_id)
        self.max_history_tokens = min(
            MAX_HISTORY_TOKENS,
            self.token_limit - RESERVED_COMPLETION_TOKENS
        )
    
    def truncate_messages(
        self,
        messages: List[Dict[str, str]],
        strategy: str = "sliding_window"
    ) -> List[Dict[str, str]]:
        """
        Truncate messages to fit within token limit.
        
        Strategies:
        - sliding_window: Keep most recent messages
        - summarize_old: Summarize older messages (requires API call)
        - importance_based: Keep important messages (system, first, last)
        """
        
        if strategy == "sliding_window":
            return self._sliding_window_truncate(messages)
        elif strategy == "importance_based":
            return self._importance_based_truncate(messages)
        else:
            return self._sliding_window_truncate(messages)
    
    def _sliding_window_truncate(
        self,
        messages: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Keep most recent messages that fit within token limit.
        Always preserve system messages and the latest user message.
        """
        
        # Separate system messages from conversation
        system_messages = [m for m in messages if m.get("role") == "system"]
        conversation = [m for m in messages if m.get("role") != "system"]
        
        if not conversation:
            return messages
        
        # Calculate system message tokens
        system_tokens = estimate_messages_tokens(system_messages)
        available_tokens = self.max_history_tokens - system_tokens
        
        # Always keep the last user message
        last_user_msg = None
        for msg in reversed(conversation):
            if msg.get("role") == "user":
                last_user_msg = msg
                break
        
        if not last_user_msg:
            return system_messages + conversation
        
        # Build truncated conversation from end
        truncated = []
        current_tokens = estimate_messages_tokens([last_user_msg])
        truncated.append(last_user_msg)
        
        # Add messages from end, maintaining pairs when possible
        for msg in reversed(conversation[:-1]):  # Exclude last message
            msg_tokens = estimate_messages_tokens([msg])
            
            if current_tokens + msg_tokens <= available_tokens:
                truncated.insert(0, msg)
                current_tokens += msg_tokens
            else:
                log.info(f"[ConvManager] Truncated {len(conversation) - len(truncated)} older messages")
                break
        
        return system_messages + truncated
    
    def _importance_based_truncate(
        self,
        messages: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Keep important messages: system, first user message, recent context.
        Useful for maintaining conversation coherence.
        """
        
        system_messages = [m for m in messages if m.get("role") == "system"]
        conversation = [m for m in messages if m.get("role") != "system"]
        
        if len(conversation) <= 3:
            return messages
        
        # Priority messages to keep
        priority_messages = []
        
        # 1. First user message (sets context)
        first_user = next((m for m in conversation if m.get("role") == "user"), None)
        if first_user:
            priority_messages.append(first_user)
        
        # 2. Last 4 messages (recent context)
        recent_messages = conversation[-4:]
        
        # Calculate tokens
        system_tokens = estimate_messages_tokens(system_messages)
        priority_tokens = estimate_messages_tokens(priority_messages)
        recent_tokens = estimate_messages_tokens(recent_messages)
        
        available_tokens = self.max_history_tokens - system_tokens
        
        # Build final message list
        if priority_tokens + recent_tokens <= available_tokens:
            # Can fit first message + recent messages
            middle_gap = conversation[1:-4] if len(conversation) > 5 else []
            
            if middle_gap:
                # Add a marker that context was truncated
                truncation_marker = {
                    "role": "system",
                    "content": f"[{len(middle_gap)} messages truncated for context]"
                }
                return system_messages + [first_user] + [truncation_marker] + recent_messages
            else:
                return system_messages + conversation
        else:
            # Can't fit everything, just use recent messages
            log.info("[ConvManager] Using recent messages only")
            return system_messages + recent_messages
    
    def add_context_summary(
        self,
        messages: List[Dict[str, str]],
        summary: str
    ) -> List[Dict[str, str]]:
        """
        Add a summary of truncated context as a system message.
        """
        
        summary_msg = {
            "role": "system",
            "content": f"Context summary: {summary}"
        }
        
        # Insert after system messages but before conversation
        system_messages = [m for m in messages if m.get("role") == "system"]
        other_messages = [m for m in messages if m.get("role") != "system"]
        
        return system_messages + [summary_msg] + other_messages


# =============================
# ASYNC CONTEXT SUMMARIZATION
# =============================
async def summarize_old_context_async(
    messages: List[Dict[str, str]],
    max_summary_tokens: int = 200
) -> str:
    """
    Summarize older messages to preserve context while reducing tokens.
    Use this for long conversations where you want to maintain coherence.
    """
    
    if not messages:
        return ""
    
    # Extract content from messages
    context_parts = []
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        context_parts.append(f"{role}: {content}")
    
    context_text = "\n".join(context_parts)
    
    # Create summarization prompt
    summary_prompt = f"""Summarize this conversation history in {max_summary_tokens} tokens or less.
Focus on key topics, decisions, and context needed for future messages.
Be concise and factual.

Conversation:
{context_text}

Summary:"""
    
    client = Groq(api_key=GROQ_API_KEY)
    
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=SELECTOR_MODEL_ID,
            messages=[{"role": "user", "content": summary_prompt}],
            temperature=0.3,
            max_tokens=max_summary_tokens
        )
        
        summary = response.choices[0].message.content.strip()
        log.info(f"[SLM-Router] Context summarized: {len(messages)} messages -> {len(summary)} chars")
        
        return summary
    
    except Exception as e:
        log.error(f"[SLM-Router] Summarization failed: {e}")
        return "Previous conversation context (details truncated due to length)"


# =============================
# CONFIDENTIAL DATA DETECTION
# =============================
def build_confidential_detector_prompt() -> str:
    """System prompt for the privacy/confidentiality classifier."""
    return """You are a privacy and data-security classifier.

Your only job is to detect whether the user query contains confidential or sensitive information.

Categories to check:
- PII: full names combined with ID numbers, social security numbers, passport numbers, national IDs, date-of-birth + name combos, home addresses
- CREDENTIALS: passwords, API keys, tokens, secret keys, private keys
- FINANCIAL: bank account numbers, credit/debit card numbers, CVVs, PINs, transaction details
- MEDICAL: health diagnoses, prescriptions, patient records, insurance details
- INTERNAL BUSINESS: unreleased product details, internal project codes, employee salary data, M&A information

IMPORTANT RULES:
- A query that ASKS ABOUT these topics (e.g. "what is an SSN?") is NOT confidential.
- A query that CONTAINS actual confidential values (e.g. "my SSN is 123-45-6789") IS confidential.
- General business questions, coding questions, and general knowledge are NOT confidential.
- Be conservative — only flag when you are highly confident actual sensitive data is present.

Respond ONLY with valid JSON, no explanation:
{
  "is_confidential": true/false,
  "confidence": 0-100,
  "categories": ["pii", "credentials", "financial", "medical", "internal_business"],
  "reason": "one-sentence human-readable explanation of what sensitive data was found, or why it is safe"
}"""


async def detect_confidential_async(query: str) -> dict:
    """
    Classify whether the query contains confidential / sensitive data.
    Returns: {is_confidential, confidence, categories, reason}
    Falls back gracefully on any error so routing is never blocked.
    """
    safe_fallback = {
        "is_confidential": False,
        "confidence": 0,
        "categories": [],
        "reason": "Detection unavailable — treated as non-confidential"
    }

    if not query or len(query.strip()) < 5:
        return safe_fallback

    client = Groq(api_key=GROQ_API_KEY)

    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=CONFIDENTIAL_DETECTOR_MODEL_ID,
            messages=[
                {"role": "system", "content": build_confidential_detector_prompt()},
                {"role": "user", "content": f"Classify this query:\n{query}"}
            ],
            temperature=0.0,
            max_tokens=200,
            response_format={"type": "json_object"}
        )

        raw = response.choices[0].message.content
        parsed = safe_json_parse(raw)

        result = {
            "is_confidential": bool(parsed.get("is_confidential", False)),
            "confidence": min(100, max(0, int(parsed.get("confidence", 0)))),
            "categories": parsed.get("categories", []),
            "reason": parsed.get("reason", "No details provided")
        }

        if result["is_confidential"]:
            log.warning(
                f"[SLM-Router] ⚠ Confidential data detected "
                f"(confidence={result['confidence']}%) "
                f"categories={result['categories']} — "
                f"routing to {CONFIDENTIAL_MODEL_ID}"
            )
        else:
            log.info(f"[SLM-Router] ✓ No confidential data detected (confidence={result['confidence']}%)")

        return result

    except Exception as e:
        log.error(f"[SLM-Router] Confidential detection failed: {e}")
        return safe_fallback


# =============================
# HELPERS (from original)
# =============================
def safe_json_parse(text: str) -> dict:
    """Extract and parse JSON from text with strict validation and normalization."""
    text = text.strip()

    def normalize(parsed):
        # If model returns list of objects, take first one
        if isinstance(parsed, list):
            if len(parsed) > 0 and isinstance(parsed[0], dict):
                return parsed[0]
            return {}
        if isinstance(parsed, dict):
            return parsed
        return {}

    try:
        return normalize(json.loads(text))
    except json.JSONDecodeError:
        pass

    code_block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if code_block_match:
        try:
            return normalize(json.loads(code_block_match.group(1)))
        except json.JSONDecodeError:
            pass

    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text)
    if json_match:
        try:
            return normalize(json.loads(json_match.group()))
        except json.JSONDecodeError:
            pass

    # Instead of crashing entire router
    return {}



def calculate_keyword_similarity(text1: str, text2: str) -> float:
    """Calculate simple keyword-based similarity between two texts."""
    words1 = set(re.findall(r'\w+', text1.lower()))
    words2 = set(re.findall(r'\w+', text2.lower()))
    
    stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being'}
    words1 = words1 - stopwords
    words2 = words2 - stopwords
    
    if not words1 or not words2:
        return 0.0
    
    intersection = len(words1 & words2)
    union = len(words1 | words2)
    
    return intersection / union if union > 0 else 0.0


def should_skip_enhancement(query: str) -> tuple[bool, str]:
    """Determine if query should skip enhancement to prevent hallucinations."""
    query_lower = query.lower().strip()
    
    if len(query) < MIN_QUERY_LENGTH_FOR_ENHANCEMENT:
        return True, "Query too short"
    
    greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 
                 'good evening', 'whats up', "what's up", 'sup']
    if query_lower in greetings or len(query_lower.split()) <= 2:
        return True, "Greeting or very short message"
    
    if query_lower.startswith(('yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'thank you')):
        return True, "Acknowledgment or simple response"
    
    if len(query) > 500:
        return True, "Query already detailed"
    
    return False, ""


# =============================
# MODEL FETCHER (from original)
# =============================
async def fetch_available_models(request) -> List[Dict[str, Any]]:
    """Fetch models from OpenWebUI API endpoint."""
    try:
        base_url = str(request.base_url).rstrip('/')
        api_url = f"{base_url}/api/models"
        
        headers = {
            "Authorization": request.headers.get("Authorization", ""),
            "Content-Type": "application/json"
        }
        
        log.info(f"[SLM-Router] Fetching models from: {api_url}")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(api_url, headers=headers) as response:
                if response.status != 200:
                    log.error(f"[SLM-Router] API returned status {response.status}")
                    return []
                
                data = await response.json()
                models = data.get("data", [])
                
                active_models = [
                    {
                        "id": model["id"],
                        "name": model.get("name", model["id"]),
                        "owned_by": model.get("owned_by", "unknown"),
                        "context_window": model.get("context_window", get_model_token_limit(model["id"])),
                        "is_active": model.get("info", {}).get("is_active", True),
                        "capabilities": model.get("info", {}).get("meta", {}).get("capabilities", {})
                    }
                    for model in models
                    if model.get("info", {}).get("is_active", True)
                ]
                
                log.info(f"[SLM-Router] Found {len(active_models)} active models")
                
                return active_models
                
    except Exception as e:
        log.error(f"[SLM-Router] Failed to fetch models: {e}", exc_info=True)
        return []


# =============================
# PROMPTS (from original)
# =============================
def build_selector_prompt(available_models: List[Dict[str, Any]]) -> str:
    """Build concise selector prompt with strict JSON output."""
    
    model_list = "\n".join([
        f"  - {m['id']}: {m['name']} (context: {m.get('context_window', 'N/A')})"
        for m in available_models
    ])
    
    return f"""You are an intelligent model selection engine.

AVAILABLE MODELS:
{model_list}

YOUR TASK:
Analyze the user's query and recommend the BEST model from the available list above.

SELECTION CRITERIA:
1. **Code generation/debugging**: Prefer models with larger context windows and strong reasoning
2. **Creative writing**: Prefer models with good language understanding
3. **Simple questions**: Use faster, smaller models
4. **Complex reasoning/analysis**: Use larger, more capable models
5. **Translation/multilingual**: Prefer models trained on multiple languages
6. **Math/logic**: Prefer models with strong reasoning capabilities

IMPORTANT RULES:
- Only recommend models from the AVAILABLE MODELS list above
- Consider context window requirements for long conversations
- Balance performance vs speed based on complexity
- If user selected model is already optimal, keep it

Return ONLY valid JSON in this exact format:
{{
  "recommended_model": "exact-model-id-from-list",
  "intent": "code_generation|creative_writing|question_answering|analysis|translation|math",
  "complexity": "simple|medium|complex",
  "reason": "brief explanation why this model is best",
  "confidence": 0-100
}}"""




def build_enhancer_prompt() -> str:
    """Build concise enhancer prompt with anti-hallucination rules."""
    
    return """You are a prompt enhancer. Improve clarity WITHOUT changing intent.

STRICT RULES:
1. Keep the EXACT same request/question
2. Add specificity and structure ONLY
3. DO NOT add new requirements or topics
4. DO NOT make assumptions about context
5. Keep length under 2x original
6. If query is already clear, return it unchanged

CRITICAL: Respond ONLY with valid JSON. No explanation, no markdown, just JSON.

{
  "enhanced_prompt": "improved version",
  "changes": ["change1", "change2"],
  "should_enhance": true/false
}

If query is a greeting, simple question, or already clear, set should_enhance=false."""


# =============================
# MODEL SELECTION (from original)
# =============================
async def select_model_async(
    query: str,
    user_selected_model: str,
    available_models: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Select optimal model based on query analysis."""
    log.info(f"[SLM-Router] Analyzing query: {query[:100]}...")

    if not available_models:
        log.warning("[SLM-Router] No models available")
        return {
            "recommended_model": user_selected_model,
            "intent": "unknown",
            "complexity": "medium",
            "reason": "No alternatives available",
            "confidence": 50,
            "should_switch": False
        }

    available_ids = {m["id"] for m in available_models}
    selector_prompt = build_selector_prompt(available_models)

    messages = [
        {"role": "system", "content": selector_prompt},
        {"role": "user", "content": f"Query: {query}\nCurrent model: {user_selected_model}"}
    ]

    client = Groq(api_key=GROQ_API_KEY)

    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=SELECTOR_MODEL_ID,
            messages=messages,
            temperature=0.0,
            max_tokens=300,
            response_format={"type": "json_object"}
        )

        raw_output = response.choices[0].message.content
        log.debug(f"[SLM-Router] Selector raw output: {raw_output}")
        
        parsed = safe_json_parse(raw_output)
        recommended = parsed.get("recommended_model", user_selected_model)

        if recommended not in available_ids:
            log.warning(f"[SLM-Router] Invalid recommendation '{recommended}', using user selection")
            recommended = user_selected_model

        result = {
            "recommended_model": recommended,
            "complexity": parsed.get("complexity", "medium"),
            "intent": parsed.get("intent", "unknown"),
            "reason": parsed.get("reason", "Auto-selected"),
            "confidence": min(100, max(0, parsed.get("confidence", 70))),
            "should_switch": recommended != user_selected_model
        }
        
        log.info(f"[SLM-Router] Recommendation: {recommended} (confidence: {result['confidence']}%)")
        
        return result

    except Exception as e:
        log.error(f"[SLM-Router] Selection failed: {e}", exc_info=True)
        
        return {
            "recommended_model": user_selected_model,
            "intent": "unknown",
            "complexity": "medium",
            "reason": f"Error: {str(e)}",
            "confidence": 50,
            "should_switch": False
        }


# =============================
# PROMPT ENHANCER (from original)
# =============================
async def enhance_prompt_async(
    query: str,
    intent: str,
    complexity: str,
    model_id: str
) -> Dict[str, Any]:
    """Enhance prompt with strict anti-hallucination validation."""
    
    should_skip, skip_reason = should_skip_enhancement(query)
    
    if should_skip:
        log.info(f"[SLM-Router] Enhancement skipped: {skip_reason}")
        return {
            "enhanced_prompt": query,
            "changes": [],
            "should_enhance": False,
            "reason": skip_reason,
            "similarity": 1.0
        }

    enhancer_prompt = build_enhancer_prompt()

    messages = [
        {"role": "system", "content": enhancer_prompt},
        {"role": "user", "content": f"Original query: {query}\nIntent: {intent}\nComplexity: {complexity}"}
    ]

    client = Groq(api_key=GROQ_API_KEY)

    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=ENHANCER_MODEL_ID,
            messages=messages,
            temperature=0.2,
            max_tokens=400,
            response_format={"type": "json_object"}
        )

        raw_output = response.choices[0].message.content
        log.debug(f"[SLM-Router] Enhancer raw output: {raw_output}")

        parsed = safe_json_parse(raw_output)
        
        enhanced_prompt = parsed.get("enhanced_prompt", query)
        should_enhance = parsed.get("should_enhance", True)
        changes = parsed.get("changes", [])

        # ANTI-HALLUCINATION VALIDATION
        
        if not should_enhance:
            log.info("[SLM-Router] Model recommends no enhancement")
            return {
                "enhanced_prompt": query,
                "changes": [],
                "should_enhance": False,
                "reason": "Model determined enhancement unnecessary",
                "similarity": 1.0
            }
        
        length_ratio = len(enhanced_prompt) / max(len(query), 1)
        if length_ratio > MAX_ENHANCEMENT_RATIO:
            log.warning(f"[SLM-Router] Enhancement too long ({length_ratio:.1f}x), rejecting")
            return {
                "enhanced_prompt": query,
                "changes": [],
                "should_enhance": False,
                "reason": f"Enhancement exceeded length limit ({length_ratio:.1f}x)",
                "similarity": 0.0
            }
        
        similarity = calculate_keyword_similarity(query, enhanced_prompt)
        if similarity < MIN_SIMILARITY_THRESHOLD:
            log.warning(f"[SLM-Router] Low similarity ({similarity:.2f}), rejecting enhancement")
            return {
                "enhanced_prompt": query,
                "changes": [],
                "should_enhance": False,
                "reason": f"Enhancement changed topic (similarity: {similarity:.2f})",
                "similarity": similarity
            }
        
        if not enhanced_prompt or len(enhanced_prompt) < len(query) * 0.8:
            log.warning("[SLM-Router] Enhanced prompt too short, rejecting")
            return {
                "enhanced_prompt": query,
                "changes": [],
                "should_enhance": False,
                "reason": "Enhanced version weaker than original",
                "similarity": 0.0
            }
        log.info(f"[SLM-Router] Original Query: {query}")
        log.info(f"[SLM-Router] Enhanced Prompt: {enhanced_prompt}")
        log.info(f"[SLM-Router] ✓ Enhancement validated (similarity: {similarity:.2f})")

        return {
            "enhanced_prompt": enhanced_prompt,
            "changes": changes,
            "should_enhance": True,
            "reason": "Successfully enhanced",
            "similarity": similarity
        }

    except Exception as e:
        log.error(f"[SLM-Router] Enhancement failed: {e}", exc_info=True)
        
        return {
            "enhanced_prompt": query,
            "changes": [],
            "should_enhance": False,
            "reason": f"Error: {str(e)}",
            "similarity": 0.0
        }


# =============================
# MAIN ENTRY POINT WITH TOKEN MANAGEMENT
# =============================
async def process_slm_routing(
    form_data: dict,
    user: Any,
    request=None,
    show_recommendation: bool = True,
    enhancement_only: bool = False,
    truncation_strategy: str = "sliding_window",
    enable_summarization: bool = False
) -> Dict[str, Any]:
    """
    Main SLM routing function with conversation management.
    
    Args:
        truncation_strategy: "sliding_window" or "importance_based"
        enable_summarization: Whether to summarize truncated context (requires extra API call)
    """
    log.info("[SLM-Router] ===== STARTING SLM ROUTING =====")

    messages = form_data.get("messages", [])
    user_messages = [m for m in messages if m.get("role") == "user"]

    if not user_messages:
        log.warning("[SLM-Router] No user messages found")
        return {
            "should_switch": False,
            "recommended_model": form_data.get("model"),
            "enhanced_form_data": form_data,
            "selection_info": {},
            "alternatives": [],
            "is_confidential": False,
            "confidential_info": {}
        }

    latest_query = user_messages[-1]["content"]
    selected_model = form_data.get("model")
    metadata = form_data.setdefault("metadata", {})

    # Prevent infinite loops
    if metadata.get("slm_processed"):
        log.info("[SLM-Router] Already processed, skipping")
        return {
            "should_switch": False,
            "recommended_model": selected_model,
            "enhanced_form_data": form_data,
            "selection_info": {},
            "alternatives": [],
            "is_confidential": False,
            "confidential_info": {}
        }

    if request is None:
        log.error("[SLM-Router] No request object provided")
        return {
            "should_switch": False,
            "recommended_model": selected_model,
            "enhanced_form_data": form_data,
            "selection_info": {"reason": "Request object missing"},
            "alternatives": [],
            "is_confidential": False,
            "confidential_info": {}
        }

    # Model selection
    if enhancement_only:
        # Enhancement-only mode — run confidential detection only, skip model fetch
        log.info("[SLM-Router] Enhancement-only mode — running confidential detection only")
        confidential_info = await detect_confidential_async(latest_query)
        selection = {
            "recommended_model": selected_model,
            "intent": "confidential" if confidential_info["is_confidential"] else "unknown",
            "complexity": "medium",
            "confidence": 100,
            "should_switch": False
        }
        available_models = []
    else:
        # Run confidential detection AND model fetching in parallel — zero added latency
        confidential_info, available_models = await asyncio.gather(
            detect_confidential_async(latest_query),
            fetch_available_models(request)
        )

        if not available_models:
            log.warning("[SLM-Router] No models available")
            return {
                "should_switch": False,
                "recommended_model": selected_model,
                "enhanced_form_data": form_data,
                "selection_info": {"reason": "No models available"},
                "alternatives": [],
                "is_confidential": confidential_info["is_confidential"],
                "confidential_info": confidential_info
            }

        if confidential_info["is_confidential"]:
            # ===== CONFIDENTIAL OVERRIDE =====
            # Always route confidential queries to the designated model regardless of SLM selection
            log.info(f"[SLM-Router] 🔒 Confidential override → {CONFIDENTIAL_MODEL_ID}")
            selection = {
                "recommended_model": CONFIDENTIAL_MODEL_ID,
                "intent": "confidential",
                "complexity": "medium",
                "reason": confidential_info["reason"],
                "confidence": confidential_info["confidence"],
                "should_switch": CONFIDENTIAL_MODEL_ID != selected_model
            }
        else:
            selection = await select_model_async(
                latest_query,
                selected_model,
                available_models
            )

    # Extract is_confidential flag for return paths
    is_confidential = confidential_info["is_confidential"]

    # Get final model (may have switched)
    final_model = selection["recommended_model"] if selection["should_switch"] and not show_recommendation else selected_model

    # ===== TOKEN MANAGEMENT =====
    log.info(f"[SLM-Router] Managing conversation history for model: {final_model}")
    
    conv_manager = ConversationManager(final_model)
    original_token_count = estimate_messages_tokens(messages)
    log.info(f"[SLM-Router] Original history: {len(messages)} messages, ~{original_token_count} tokens")
    
    # Truncate messages
    truncated_messages = conv_manager.truncate_messages(messages, strategy=truncation_strategy)
    truncated_token_count = estimate_messages_tokens(truncated_messages)
    
    log.info(f"[SLM-Router] Truncated history: {len(truncated_messages)} messages, ~{truncated_token_count} tokens")
    log.info(f"[SLM-Router] Removed {len(messages) - len(truncated_messages)} messages, saved ~{original_token_count - truncated_token_count} tokens")
    
    # Optional: Add summary of truncated context
    if enable_summarization and len(messages) > len(truncated_messages) + 3:
        truncated_part = messages[:len(messages) - len(truncated_messages)]
        summary = await summarize_old_context_async(truncated_part)
        truncated_messages = conv_manager.add_context_summary(truncated_messages, summary)
    
    # Update messages in form_data
    messages = truncated_messages

    # MODE 1: Show recommendation
    # For confidential queries, always show recommendation when toggle is ON
    if show_recommendation and selection["should_switch"] and not enhancement_only:
        log.info(f"[SLM-Router] Showing recommendation: {selection['recommended_model']}")
        
        return {
            "should_switch": True,
            "show_recommendation": True,
            "recommended_model": selection["recommended_model"],
            "enhanced_form_data": form_data,
            "selection_info": selection,
            "alternatives": get_top_alternatives(selection, available_models),
            "is_confidential": is_confidential,
            "confidential_info": confidential_info
        }

    # MODE 2: Auto-route or enhance
    if not show_recommendation and selection["should_switch"] and not enhancement_only:
        log.info(f"[SLM-Router] Auto-switching to: {selection['recommended_model']}")
        form_data["model"] = selection["recommended_model"]
    
    # Enhance prompt
    enhancement = await enhance_prompt_async(
        latest_query,
        selection["intent"],
        selection["complexity"],
        selection["recommended_model"]
    )

    final_prompt = latest_query
    
    if enhancement.get("should_enhance", False):
        final_prompt = enhancement["enhanced_prompt"]
        log.info(f"[SLM-Router] ✓ Enhancement applied (similarity: {enhancement.get('similarity', 0):.2f})")
    else:
        log.info(f"[SLM-Router] ✗ Enhancement rejected: {enhancement.get('reason', 'unknown')}")

    # Update messages with enhanced prompt
    new_messages = messages.copy()
    for i in range(len(new_messages) - 1, -1, -1):
        if new_messages[i].get("role") == "user":
            new_messages[i] = {
                **new_messages[i],
                "content": final_prompt
            }
            break

    enhanced_form_data = {
        **form_data,
        "messages": new_messages,
        "metadata": {
            **metadata,
            "slm_processed": True,
            "slm_intent": selection["intent"],
            "slm_complexity": selection["complexity"],
            "slm_enhanced": enhancement.get("should_enhance", False),
            "slm_similarity": enhancement.get("similarity", 0.0),
            "slm_original_tokens": original_token_count,
            "slm_truncated_tokens": truncated_token_count,
            "slm_messages_removed": len(messages) - len(truncated_messages)
        }
    }

    log.info("[SLM-Router] ===== ROUTING COMPLETE =====")

    return {
        "should_switch": False,
        "show_recommendation": False,
        "recommended_model": selection["recommended_model"],
        "enhanced_form_data": enhanced_form_data,
        "selection_info": {**selection, **enhancement},
        "alternatives": [],
        "is_confidential": is_confidential,
        "confidential_info": confidential_info
    }


def get_top_alternatives(
    selection: dict,
    available_models: List[Dict],
    top_n: int = 2
) -> List[Dict]:
    """Get top alternative models based on intent."""
    
    intent = selection.get("intent", "unknown")
    recommended = selection.get("recommended_model")
    
    scored_models = []
    
    for model in available_models:
        if model["id"] == recommended:
            continue
        
        score = 50
        model_id_lower = model["id"].lower()
        
        if intent == "code":
            if "qwen" in model_id_lower or "code" in model_id_lower:
                score += 30
        elif intent == "creative":
            if "llama" in model_id_lower and "70b" in model_id_lower:
                score += 30
        elif intent == "qa":
            if "8b" in model_id_lower or "instant" in model_id_lower:
                score += 30
        elif intent == "analysis":
            if "70b" in model_id_lower:
                score += 30
        
        if model.get("context_window", 0) > 100000:
            score += 10
        
        scored_models.append({
            "id": model["id"],
            "name": model["name"],
            "score": score
        })
    
    scored_models.sort(key=lambda x: x["score"], reverse=True)
    
    return [
        {
            "id": m["id"],
            "name": m["name"],
            "recommended_for": intent
        }
        for m in scored_models[:top_n]
    ]