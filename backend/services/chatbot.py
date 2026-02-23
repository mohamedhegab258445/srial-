import os
import traceback
import httpx
from google import genai
from google.genai import types

# Define the persona/system prompt
SYSTEM_INSTRUCTION = """
أنت المساعد الذكي الخاص بشركة (مودرن هوم).
مهمتك هي مساعدة العملاء في الاستفسارات المتعلقة بـ:
- الأجهزة المنزلية (ثلاجات، غسالات، شاشات، مكيفات، إلخ).
- تفعيل الضمان.
- استعلامات التذاكر وطلبات الصيانة.
- الأسئلة الشائعة حول المنتجات.

يجب أن تتحدث دائمًا بلباقة واحترافية وباللغة العربية (مع إمكانية الرد بلغات أخرى إذا سألك المستخدم بها).
يجب أن تكون إجاباتك دقيقة وواضحة ومختصرة قدر الإمكان.
إذا سألك المستخدم عن رقم تسلسلي (Serial Number)، اطلب منه تزويدك بالرقم للتحقق منه في النظام.
"""

def generate_chat_response(messages: list, extra_context: str = "") -> str:
    """
    Generate a response from Alibaba Qwen (Primary) or Gemini (Fallback) based on the message history.
    Args:
        messages (list): A list of dictionaries `[{"role": "user" or "model", "parts": ["text"]}]`
        extra_context (str): Optional context injected into the system instruction
    Returns:
        str: The AI's response text.
    """
    # Combine system instructions with any DB lookups
    final_system_instruction = SYSTEM_INSTRUCTION
    if extra_context:
        final_system_instruction += extra_context

    # 1. Try Alibaba Qwen API First (Smarter Model)
    alibaba_key = os.getenv("ALIBABA_API_KEY")
    if alibaba_key:
        try:
            # Format messages for OpenAI/Alibaba compatible mode
            alibaba_messages = [{"role": "system", "content": final_system_instruction}]
            for msg in messages:
                role = "assistant" if msg["role"] == "model" else "user"
                alibaba_messages.append({"role": role, "content": msg["parts"][0]})

            response = httpx.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {alibaba_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "qwen-plus",
                    "messages": alibaba_messages,
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[Chatbot Alibaba Fallback]: {e}")
            traceback.print_exc()
            # If Qwen fails, it will continue to Gemini fallback below

    # 2. Fallback to Google Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "عذراً، نظام المحادثة غير مفعل حالياً لوجود مشكلة في إعدادات السيرفر (API Key مفقود)."

    try:
        # Initialize the new SDK client
        client = genai.Client(api_key=api_key)

        # Build contents from history
        contents = []
        for msg in messages:
            # Map "model" role if used, otherwise it uses exactly what came in
            role = "model" if msg["role"] == "model" else "user"
            contents.append(types.Content(
                role=role,
                parts=[{"text": msg["parts"][0]}]
            ))

        # Call the new API
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=final_system_instruction,
            ),
        )

        return response.text or "عذراً لم أفهم سؤالك، أعد صياغته."

    except Exception as e:
        print(f"[Chatbot RuntimeError]: {e}")
        traceback.print_exc()
        return "عذراً، نواجه ضغطاً في الوقت الحالي أو عطلاً مؤقتاً. يرجى المحاولة لاحقاً."
