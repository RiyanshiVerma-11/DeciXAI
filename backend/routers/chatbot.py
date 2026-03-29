from fastapi import APIRouter
from models.schemas import ChatbotInput
from services.chatbot_service import get_chatbot_response

router = APIRouter()


@router.post('/', response_model=dict)
def chat(input: ChatbotInput):
    return get_chatbot_response(input.message)
