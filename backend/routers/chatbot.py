from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import ChatbotInput
from services.chatbot_service import get_chatbot_response

router = APIRouter()


@router.post('/')
async def chat(input: ChatbotInput):
    payload = input.dict()
    stream = payload.get('stream', True)
    result = get_chatbot_response(payload, stream=stream)
    if stream:
        return StreamingResponse(result, media_type='text/plain')
    return result
