from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import career, finance, startup, policy, chatbot

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


@app.get('/')
def root():
    return {'status': 'DecisionAI Engine running'}
