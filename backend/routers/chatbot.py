from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import ChatbotInput, ChatbotResponse, DomainDetectionResponse
from services.chatbot_service import get_chatbot_response
from services.domain_classifier_service import classify_domain

router = APIRouter()


@router.post('', response_model=ChatbotResponse)
@router.post('/', response_model=ChatbotResponse)
async def chat(input: ChatbotInput):
    payload = input.model_dump()
    stream = payload.get('stream', True)
    try:
        result = get_chatbot_response(payload, stream=stream)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if stream:
        return StreamingResponse(result, media_type='text/plain')
    return result


@router.post('/detect-domain', response_model=DomainDetectionResponse)
async def detect_domain_route(input: ChatbotInput):
    message = input.message or ''
    if not message and input.messages:
        message = input.messages[-1].content
    return classify_domain(message)
