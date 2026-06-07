import edge_tts

class TTSService:
    @staticmethod
    async def generate_audio(text: str, voice: str, path: str) -> None:
        """
        Asynchronously generates an MP3 audio file from text using Edge TTS.
        """
        communicate = edge_tts.Communicate(text=text, voice=voice)
        await communicate.save(path)
