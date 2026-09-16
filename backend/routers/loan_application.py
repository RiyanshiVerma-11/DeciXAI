from __future__ import annotations

import re
import shutil
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from models.schemas import LoanApplicationPayload

router = APIRouter()

APPLICATIONS: dict[str, dict[str, Any]] = {}
UPLOAD_ROOT = Path(__file__).resolve().parents[1] / 'uploads'
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

PAN_PATTERN = re.compile(r'^[A-Z]{5}\d{4}[A-Z]$')
AADHAAR_PATTERN = re.compile(r'^\d{12}$')
MOBILE_PATTERN = re.compile(r'^\d{10}$')


def _sanitize_value(value: Any) -> Any:
    if isinstance(value, str):
        return re.sub(r'<[^>]+>', '', value).strip()
    if isinstance(value, list):
        return [_sanitize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _sanitize_value(item) for key, item in value.items()}
    return value


def _validate_payload(payload: dict[str, Any]) -> None:
    personal = payload.get('personalDetails') or {}
    pan = personal.get('panNumber')
    aadhaar = personal.get('aadhaarNumber')
    mobile = personal.get('mobileNumber')
    email = personal.get('email')

    if pan and not PAN_PATTERN.match(str(pan).upper()):
        raise HTTPException(status_code=400, detail='PAN format is invalid.')
    if aadhaar and not AADHAAR_PATTERN.match(str(aadhaar)):
        raise HTTPException(status_code=400, detail='Aadhaar must be 12 digits.')
    if mobile and not MOBILE_PATTERN.match(str(mobile)):
        raise HTTPException(status_code=400, detail='Mobile number must be 10 digits.')
    if email and '@' not in str(email):
        raise HTTPException(status_code=400, detail='Email format is invalid.')


def _review_application(payload: dict[str, Any], loan_amount_override: float | None = None) -> dict[str, Any]:
    financial = payload.get('financialInfo') or {}
    loan_details = payload.get('loanDetails') or {}
    monthly_income = float(financial.get('monthlyIncome') or 0)
    monthly_expenses = float(financial.get('monthlyExpenses') or 0)
    existing_loans = financial.get('existingLoans') or []
    total_emi = sum(float(item.get('emiAmount') or 0) for item in existing_loans)
    loan_amount = float(loan_amount_override if loan_amount_override is not None else loan_details.get('loanAmountRequired') or 0)
    tenure = int(loan_details.get('preferredRepaymentTenure') or 0)
    credit_score = int(payload.get('creditScore') or financial.get('creditScore') or 0)
    disposable_income = monthly_income - monthly_expenses - total_emi
    debt_to_income = (monthly_expenses + total_emi) / monthly_income if monthly_income else 1
    repayment_capacity = disposable_income / max(loan_amount, 1) if monthly_income else 0
    reasons = []
    blocking_factors = []
    suggestions = []

    if credit_score < 600:
        reasons.append(f'Credit score {credit_score} is below the minimum 600 threshold.')
        blocking_factors.append('low_credit_score')
        suggestions.append('Improve your credit score by paying every bill on time and keeping credit utilization below 30%.')
    elif credit_score < 700:
        reasons.append(f'Credit score {credit_score} is acceptable but needs manual review.')
        suggestions.append('Build a stronger credit history before requesting a larger loan.')
    else:
        reasons.append(f'Credit score {credit_score} supports the application.')

    if debt_to_income >= 0.8:
        reasons.append(f'Debt-to-income ratio is {debt_to_income:.2f}, above the 0.80 limit.')
        blocking_factors.append('high_debt_to_income')
        suggestions.append('Reduce existing EMIs or monthly expenses before applying again.')
    elif debt_to_income >= 0.65:
        reasons.append(f'Debt-to-income ratio is {debt_to_income:.2f}, so repayment capacity needs review.')
        suggestions.append('Reduce the requested loan or clear an existing EMI to lower monthly pressure.')
    else:
        reasons.append(f'Debt-to-income ratio is {debt_to_income:.2f}, within the affordability range.')

    if disposable_income <= 0:
        reasons.append('Monthly expenses and existing EMIs leave no disposable income.')
        blocking_factors.append('no_disposable_income')
        suggestions.append('Lower monthly expenses or existing EMI commitments before applying.')
    elif repayment_capacity <= 0.001:
        reasons.append('The remaining monthly income is too small compared with the requested loan.')
        blocking_factors.append('weak_repayment_capacity')
        suggestions.append('Request a smaller loan amount or choose a longer tenure.')
    elif repayment_capacity <= 0.003:
        reasons.append('Repayment capacity is limited for the requested amount.')
        suggestions.append('A smaller loan amount would improve affordability.')
    else:
        reasons.append('The submitted income leaves a reasonable repayment cushion.')

    if loan_amount <= 0 or tenure <= 0:
        blocking_factors.append('missing_loan_terms')
        suggestions.append('Enter a positive loan amount and repayment tenure.')

    if blocking_factors:
        status = 'rejected'
        interest_rate = None
    elif credit_score >= 700 and debt_to_income < 0.65 and repayment_capacity > 0.003:
        status = 'approved'
        interest_rate = 10.5
    elif credit_score >= 600 and debt_to_income < 0.8 and repayment_capacity > 0.001:
        status = 'under_review'
        interest_rate = 13.5
    else:
        status = 'rejected'
        interest_rate = None

    approved_emi = None
    total_payable = None
    if interest_rate is not None and loan_amount > 0 and tenure > 0:
        principal = loan_amount
        monthly_rate = interest_rate / 100 / 12
        approved_emi = round(principal * monthly_rate / (1 - (1 + monthly_rate) ** (-tenure)))
        total_payable = approved_emi * tenure

    if not suggestions:
        suggestions.append('Keep expenses controlled and maintain on-time repayments.')

    return {
        'status': status,
        'creditScore': credit_score,
        'approvedInterestRate': interest_rate,
        'approvedEMI': approved_emi,
        'approvedTenure': tenure or None,
        'totalPayable': total_payable,
        'reviewSummary': ' '.join(reasons),
        'reasons': reasons,
        'blockingFactors': blocking_factors,
        'suggestions': suggestions,
        'metrics': {
            'monthlyIncome': round(monthly_income, 2),
            'monthlyExpenses': round(monthly_expenses, 2),
            'existingEmi': round(total_emi, 2),
            'disposableIncome': round(disposable_income, 2),
            'debtToIncome': round(debt_to_income, 4),
            'repaymentCapacity': round(repayment_capacity, 4),
            'loanAmount': round(loan_amount, 2),
        },
    }


@router.post('/save-draft')
async def save_draft(request: Request) -> dict[str, Any]:
    payload = await request.json()
    sanitized = _sanitize_value(payload)
    _validate_payload(sanitized)

    application_id = str(sanitized.get('_id') or uuid.uuid4())
    application = dict(sanitized)
    application['_id'] = application_id
    application['status'] = 'draft'
    APPLICATIONS[application_id] = application
    return {'success': True, 'application': application}


@router.get('/{application_id}')
async def get_application(application_id: str) -> dict[str, Any]:
    application = APPLICATIONS.get(application_id)
    if not application:
        raise HTTPException(status_code=404, detail='Application not found.')
    return {'success': True, 'application': application}


@router.post('/upload-document')
async def upload_document(applicationId: str = Form(...), documentType: str = Form('other'), file: UploadFile = File(...)) -> dict[str, Any]:
    if file.content_type not in {'application/pdf', 'image/jpeg', 'image/png', 'image/jpg'}:
        raise HTTPException(status_code=400, detail='Unsupported file type.')

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail='File is too large. Max size is 5MB.')

    application = APPLICATIONS.get(applicationId)
    if not application:
        raise HTTPException(status_code=404, detail='Application not found.')

    destination_dir = UPLOAD_ROOT / applicationId
    destination_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{uuid.uuid4().hex}-{file.filename}"
    destination_path = destination_dir / file_name
    destination_path.write_bytes(contents)

    application.setdefault('documents', []).append({
        'fileName': file_name,
        'fileType': documentType,
        'filePath': str(destination_path),
    })

    return {'success': True, 'document': application['documents'][-1]}


@router.post('/send-otp')
async def send_otp(request: Request) -> dict[str, Any]:
    payload = await request.json()
    application_id = payload.get('applicationId')
    application = APPLICATIONS.get(application_id)
    if not application:
        raise HTTPException(status_code=404, detail='Application not found.')

    otp_code = str(100000 + (uuid.uuid4().int % 900000))
    application.setdefault('verification', {})['otpCode'] = otp_code
    return {'success': True, 'message': 'OTP sent successfully.', 'otpCode': otp_code}


@router.post('/verify-otp')
async def verify_otp(request: Request) -> dict[str, Any]:
    payload = await request.json()
    application = APPLICATIONS.get(payload.get('applicationId'))
    if not application:
        raise HTTPException(status_code=404, detail='Application not found.')

    stored_code = (application.get('verification') or {}).get('otpCode')
    if str(payload.get('otpCode')) != str(stored_code):
        raise HTTPException(status_code=400, detail='OTP verification failed.')

    application.setdefault('verification', {})['otpVerified'] = True
    return {'success': True, 'message': 'OTP verified successfully.'}


@router.post('/submit')
async def submit_application(request: Request) -> dict[str, Any]:
    payload = await request.json()
    sanitized = _sanitize_value(payload)
    _validate_payload(sanitized)

    financial = sanitized.get('financialInfo') or {}
    loan_details = sanitized.get('loanDetails') or {}
    required = {
        'monthly income': financial.get('monthlyIncome'),
        'monthly expenses': financial.get('monthlyExpenses'),
        'credit score': sanitized.get('creditScore') or financial.get('creditScore'),
        'loan amount': loan_details.get('loanAmountRequired'),
        'repayment tenure': loan_details.get('preferredRepaymentTenure'),
    }
    missing = [label for label, value in required.items() if value in (None, '')]
    if missing:
        raise HTTPException(status_code=422, detail=f'Missing required decision information: {", ".join(missing)}.')
    sanitized['creditScore'] = int(sanitized.get('creditScore') or financial.get('creditScore'))

    application_id = str(sanitized.get('_id') or uuid.uuid4())
    application = dict(sanitized)
    application['_id'] = application_id
    review = _review_application(application)

    application.update({
        'status': review['status'],
        'creditScore': review['creditScore'],
        'approvedInterestRate': review['approvedInterestRate'],
        'approvedEMI': review['approvedEMI'],
        'approvedTenure': review['approvedTenure'],
        'totalPayable': review['totalPayable'],
        'reviewSummary': review['reviewSummary'],
        'reasons': review['reasons'],
        'blockingFactors': review['blockingFactors'],
        'suggestions': review['suggestions'],
        'metrics': review['metrics'],
    })
    APPLICATIONS[application_id] = application
    return {'success': True, 'application': application}


@router.post('/what-if')
async def what_if_application(request: Request) -> dict[str, Any]:
    payload = _sanitize_value(await request.json())
    try:
        loan_amount = float(payload.pop('whatIfLoanAmount'))
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=422, detail='A valid what-if loan amount is required.')
    if loan_amount <= 0:
        raise HTTPException(status_code=422, detail='What-if loan amount must be greater than zero.')
    return {'success': True, 'review': _review_application(payload, loan_amount_override=loan_amount)}


@router.get('/status/{application_id}')
async def get_status(application_id: str) -> dict[str, Any]:
    application = APPLICATIONS.get(application_id)
    if not application:
        raise HTTPException(status_code=404, detail='Application not found.')
    return {'success': True, 'status': application.get('status', 'draft'), 'application': application}
