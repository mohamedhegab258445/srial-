import os
import google.generativeai as genai

# Configure the API key
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

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

def generate_chat_response(messages: list) -> str:
    """
    Generate a response from Gemini based on the message history.
    Args:
        messages (list): A list of dictionaries `[{"role": "user" or "model", "parts": ["text"]}]`
    Returns:
        str: The AI's response text.
    """
    if not API_KEY:
        return "عذراً، نظام المحادثة غير مفعل حالياً لوجود مشكلة في إعدادات السيرفر (API Key مفقود)."

    try:
        # Define model setup
        # Using gemini-1.5-flash as it supports system instructions and is fast/cost-effective
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_INSTRUCTION
        )

        # Extract only the history for chat session
        # Format the messages for GenAI package
        formatted_history = []
        for msg in messages[:-1]: # exclude the very last user message for the `send_message` call
           formatted_history.append({
               "role": msg["role"],
               "parts": [msg["parts"][0]]
           })
           
        user_message = messages[-1]["parts"][0]
        
        chat_session = model.start_chat(history=formatted_history)
        
        response = chat_session.send_message(user_message)
        return response.text

    except Exception as e:
        print(f"[Chatbot Error]: {e}")
        return "عذراً، نواجه ضغطاً في الوقت الحالي أو عطلاً مؤقتاً. يرجى المحاولة لاحقاً."
