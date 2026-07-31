import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

# Automatically load environment variables from .env files
import re
try:
    from dotenv import load_dotenv
    _curr_dir = os.path.dirname(os.path.abspath(__file__))
    _backend_dir = os.path.dirname(os.path.dirname(_curr_dir))
    _root_dir = os.path.dirname(_backend_dir)
    # Load in priority order: backend > root > frontend (frontend is the canonical .env source)
    load_dotenv(os.path.join(_backend_dir, '.env'), override=False)
    load_dotenv(os.path.join(_root_dir, '.env'), override=False)
    load_dotenv(os.path.join(_root_dir, 'frontend', '.env'), override=True)
except Exception:
    pass

def _extract_json_text(raw: str) -> str:
    """Robustly extract JSON from a response that may contain markdown code fences or extra text."""
    if not raw:
        return "{}"
    # Strip markdown code fences: ```json ... ``` or ``` ... ```
    stripped = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.IGNORECASE)
    stripped = re.sub(r'\s*```$', '', stripped.strip())
    stripped = stripped.strip()
    # Try direct parse first
    try:
        json.loads(stripped)
        return stripped
    except json.JSONDecodeError:
        pass
    # Try to find the first {...} or [...] block
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = stripped.find(start_char)
        if start == -1:
            continue
        depth = 0
        in_string = False
        escape = False
        for i, ch in enumerate(stripped[start:], start=start):
            if escape:
                escape = False
                continue
            if ch == '\\' and in_string:
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if not in_string:
                if ch == start_char:
                    depth += 1
                elif ch == end_char:
                    depth -= 1
                    if depth == 0:
                        candidate = stripped[start:i + 1]
                        try:
                            json.loads(candidate)
                            return candidate
                        except json.JSONDecodeError:
                            break
    return stripped

DUMMY_KEYS = {"MY_GEMINI_API_KEY", "YOUR_API_KEY", "MY_APP_URL", "YOUR_GEMINI_API_KEY"}

def _clean_key(key_str: Optional[str]) -> str:
    if not key_str:
        return ""
    cleaned = key_str.strip()
    if cleaned in DUMMY_KEYS:
        return ""
    return cleaned

class GeminiService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        provider_type: Optional[str] = None
    ):
        self.provider_type = provider_type or os.environ.get("AI_PROVIDER_TYPE") or "gemini"
        
        gemini_env = _clean_key(os.environ.get("GEMINI_API_KEY"))
        ai_env = _clean_key(os.environ.get("AI_API_KEY"))

        if self.provider_type == "openai_compatible":
            default_key = ai_env or gemini_env
        else:
            default_key = gemini_env or ai_env

        self.api_key = _clean_key(api_key) or default_key
        self.base_url = (
            base_url or 
            os.environ.get("AI_BASE_URL") or 
            os.environ.get("GEMINI_BASE_URL") or 
            "https://generativelanguage.googleapis.com/v1beta"
        ).rstrip("/")
        self.model = model or os.environ.get("AI_MODEL") or os.environ.get("GEMINI_MODEL") or "gemini-2.5-flash"

    def configure(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        provider_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Cấu hình lại provider tùy chỉnh"""
        if provider_type is not None:
            self.provider_type = provider_type.strip().lower()
        if api_key is not None:
            self.api_key = api_key.strip()
        if base_url is not None:
            self.base_url = base_url.strip().rstrip("/")
        if model is not None:
            self.model = model.strip()

        return self.get_config()

    def get_config(self) -> Dict[str, Any]:
        """Lấy thông tin cấu hình provider hiện tại (ẩn một phần API Key)"""
        masked_key = ""
        if self.api_key:
            if len(self.api_key) > 8:
                masked_key = self.api_key[:4] + "..." + self.api_key[-4:]
            else:
                masked_key = "***"

        return {
            "configured": self.is_configured(),
            "provider_type": self.provider_type,
            "base_url": self.base_url,
            "model": self.model,
            "api_key_masked": masked_key
        }

    def is_configured(self) -> bool:
        return bool(_clean_key(self.api_key))

    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        json_mode: bool = False,
        custom_model: Optional[str] = None,
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "success": False,
                "error": "GEMINI_API_KEY / AI_API_KEY chưa được thiết lập trong biến môi trường hoặc cấu hình provider."
            }

        active_model = custom_model or self.model

        if self.provider_type == "openai_compatible":
            return self._call_openai_compatible(prompt, system_instruction, json_mode, active_model, temperature)
        else:
            return self._call_gemini_native(prompt, system_instruction, json_mode, active_model, temperature)

    def _call_gemini_native(
        self,
        prompt: str,
        system_instruction: Optional[str],
        json_mode: bool,
        model: str,
        temperature: float
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/models/{model}:generateContent?key={self.api_key}"

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
            }
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result_json = json.loads(response.read().decode("utf-8"))
                text = ""
                candidates = result_json.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")

                return {
                    "success": True,
                    "text": text,
                    "provider": f"Gemini Native ({model})"
                }
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            return {
                "success": False,
                "error": f"Lỗi Gemini API HTTP {e.code}: {error_body}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Lỗi kết nối Gemini API Provider: {str(e)}"
            }

    def _parse_openai_response(self, raw_body: str) -> Optional[Dict[str, Any]]:
        """Parse OpenAI-compatible response, handling JSON, SSE streaming, NDJSON,
        and concatenated JSON objects (the most common cause of 'non-whitespace after JSON')."""
        import sys
        raw_body = raw_body.strip()
        if not raw_body:
            return None

        # 1. Try direct JSON parse first (normal non-streaming response)
        try:
            return json.loads(raw_body)
        except json.JSONDecodeError as _first_err:
            print(f"[GeminiService DEBUG] Direct JSON parse failed: {_first_err}", file=sys.stderr)
            print(f"[GeminiService DEBUG] Raw body first 300 chars: {repr(raw_body[:300])}", file=sys.stderr)
            print(f"[GeminiService DEBUG] Raw body around error pos: {repr(raw_body[max(0,_first_err.pos-50):_first_err.pos+50])}", file=sys.stderr)

        # 2. Handle concatenated JSON objects: {obj1}{obj2}... — take the LAST complete object
        # This is the most common issue with local proxy aggregators that stream then flush.
        decoder = json.JSONDecoder()
        all_objects = []
        pos = 0
        while pos < len(raw_body):
            raw_body_from = raw_body[pos:].lstrip()
            if not raw_body_from:
                break
            skip = len(raw_body[pos:]) - len(raw_body_from)
            pos += skip
            if not raw_body_from or raw_body_from[0] not in ('{', '['):
                break
            try:
                obj, end_pos = decoder.raw_decode(raw_body, pos)
                if isinstance(obj, dict):
                    all_objects.append(obj)
                pos = end_pos
            except json.JSONDecodeError:
                break
        if all_objects:
            # Return last object (most complete in streaming aggregator responses)
            last = all_objects[-1]
            # If it looks like an OpenAI response, return it directly
            if "choices" in last:
                return last
            # Otherwise return last valid object
            return last

        # 3. Handle SSE streaming format: lines starting with "data: "
        sse_results = []
        for line in raw_body.splitlines():
            line = line.strip()
            if line.startswith("data:"):
                data_str = line[5:].strip()
                if data_str == "[DONE]":
                    continue
                try:
                    obj = json.loads(data_str)
                    sse_results.append(obj)
                except json.JSONDecodeError:
                    pass
        if sse_results:
            full_text = ""
            base_obj = sse_results[0]
            for chunk in sse_results:
                choices = chunk.get("choices", [])
                if choices:
                    delta = choices[0].get("delta", {})
                    full_text += delta.get("content", "") or ""
            if "choices" not in base_obj or not base_obj["choices"]:
                base_obj["choices"] = [{}]
            base_obj["choices"][0]["message"] = {"role": "assistant", "content": full_text}
            return base_obj

        # 4. Handle NDJSON: multiple JSON objects on separate lines — use last valid one
        last_valid = None
        for line in raw_body.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if isinstance(obj, dict):
                    last_valid = obj
            except json.JSONDecodeError:
                pass
        if last_valid is not None:
            return last_valid

        # 5. Try extracting first valid JSON object/array from the raw body
        extracted = _extract_json_text(raw_body)
        try:
            return json.loads(extracted)
        except json.JSONDecodeError:
            pass

        return None

    def _call_openai_compatible(
        self,
        prompt: str,
        system_instruction: Optional[str],
        json_mode: bool,
        model: str,
        temperature: float
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": False,  # Explicitly request non-streaming response
        }

        # Only send response_format if the provider is expected to support it.
        # Many local/custom proxies don't support this field and may return errors
        # or malformed JSON. We handle JSON extraction robustly on our side instead.
        # Uncomment the block below if your provider supports response_format:
        # if json_mode:
        #     payload["response_format"] = {"type": "json_object"}

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                raw_body = response.read().decode("utf-8")

            result_json = self._parse_openai_response(raw_body)
            if result_json is None:
                return {
                    "success": False,
                    "error": f"Không thể parse response từ Provider. Raw (500 chars): {raw_body[:500]}"
                }

            choices = result_json.get("choices", [])
            text = ""
            if choices:
                msg = choices[0].get("message", {})
                text = msg.get("content", "") or ""

            # When json_mode is requested, strip markdown code fences and
            # extract the pure JSON block from the response text.
            if json_mode and text:
                text = _extract_json_text(text)

            return {
                "success": True,
                "text": text,
                "provider": f"OpenAI Compatible ({model})"
            }
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            return {
                "success": False,
                "error": f"Lỗi Provider HTTP {e.code}: {error_body}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Lỗi kết nối Custom Provider: {str(e)}"
            }

gemini_service = GeminiService()

