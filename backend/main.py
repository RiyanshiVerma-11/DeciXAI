from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import career, finance, startup, policy, chatbot
from utils.app_logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

app = FastAPI(title='DecisionAI Engine', version='1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(career.router, prefix='/career', tags=['career'])
app.include_router(finance.router, prefix='/finance', tags=['finance'])
app.include_router(startup.router, prefix='/startup', tags=['startup'])
app.include_router(policy.router, prefix='/policy', tags=['policy'])
app.include_router(chatbot.router, prefix='/chatbot', tags=['chatbot'])


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception('Unhandled error on %s', request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            'detail': 'Internal server error',
            'path': request.url.path,
            'error_type': exc.__class__.__name__,
        },
    )


@app.get('/')
def root():
    return {'status': 'DecisionAI Engine running'}
