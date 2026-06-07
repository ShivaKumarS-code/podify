import google.generativeai as genai
from groq import Groq
from app.core.config import settings

class LLMService:
    @staticmethod
    def generate_text(prompt: str, response_json: bool = False) -> str:
        """
        Generates text using Groq (llama-3.3-70b-versatile) if GROQ_API_KEY is set,
        otherwise falls back to Gemini (gemini-3.5-flash).
        """
        if settings.GROQ_API_KEY:
            # Try multiple models on Groq to handle model-specific rate limits
            for model_name in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-8b-8192"]:
                try:
                    client = Groq(api_key=settings.GROQ_API_KEY)
                    response_format = {"type": "json_object"} if response_json else None
                    
                    chat_completion = client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=model_name,
                        response_format=response_format,
                        temperature=0.7
                    )
                    return chat_completion.choices[0].message.content.strip()
                except Exception as e:
                    print(f"Groq API error for model {model_name}, trying next fallback: {e}")
                
        if settings.CEREBRAS_API_KEY:
            # Try Cerebras Cloud inference
            for model_name in ["gpt-oss-120b", "zai-glm-4.7"]:
                try:
                    from cerebras.cloud.sdk import Cerebras
                    client = Cerebras(api_key=settings.CEREBRAS_API_KEY)
                    response_format = {"type": "json_object"} if response_json else None
                    
                    chat_completion = client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=model_name,
                        response_format=response_format,
                        temperature=0.7
                    )
                    return chat_completion.choices[0].message.content.strip()
                except Exception as e:
                    print(f"Cerebras API error for model {model_name}, trying next fallback: {e}")

        # Gemini Fallback
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("models/gemini-3.5-flash")
        generation_config = {"response_mime_type": "application/json"} if response_json else None
        response = model.generate_content(prompt, generation_config=generation_config)
        return response.text.strip()
