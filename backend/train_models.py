from pathlib import Path
import json
import re

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ROOT = Path(__file__).resolve().parent
DATASETS_DIR = ROOT / 'datasets'
MODELS_DIR = ROOT / 'models'
MODELS_DIR.mkdir(exist_ok=True)


def safe_float(value, default=0.0):
    try:
        if pd.isna(value):
            return default
        if isinstance(value, str):
            cleaned = value.strip().replace(',', '')
            if not cleaned:
                return default
            return float(cleaned)
        return float(value)
    except Exception:
        return default


def split_items(text):
    if pd.isna(text):
        return []
    parts = re.split(r'[;,/]| and ', str(text))
    return [part.strip() for part in parts if part and part.strip()]


def map_interest(text):
    value = str(text).lower()
    if any(word in value for word in ['data', 'analytic', 'analysis', 'ai', 'cloud']):
        return 'data'
    if any(word in value for word in ['manage', 'business', 'leader', 'finance', 'sales', 'market']):
        return 'management'
    return 'technical'


def map_market(text):
    value = str(text).lower()
    if any(word in value for word in ['enterprise', 'saas', 'b2b', 'fintech', 'hrtech', 'deeptech']):
        return 'enterprise'
    return 'consumer'


def map_sector(text):
    value = str(text).lower()
    if any(word in value for word in ['health', 'medical', 'hospital', 'fisher', 'nutrition', 'jsy', 'mmr', 'imr']):
        return 'healthcare'
    if any(word in value for word in ['education', 'school', 'student', 'teacher', 'learning', 'aicte']):
        return 'education'
    return 'infrastructure'


def parse_money_to_usd(value):
    text = str(value).strip()
    if not text or text.lower() == 'nan':
        return np.nan
    cleaned = re.sub(r'[^0-9.]', '', text)
    if not cleaned:
        return np.nan
    return safe_float(cleaned, np.nan)


def parse_rupee_amount(text):
    value = str(text)
    match = re.search(r'₹\s*([0-9,]+(?:\.[0-9]+)?)', value)
    if not match:
        return np.nan
    return safe_float(match.group(1).replace(',', ''), np.nan)


def build_career_dataset():
    df = pd.read_csv(DATASETS_DIR / 'career' / 'career_recommender.csv')
    cgpa_col = 'What was the average CGPA or Percentage obtained in under graduation?'
    skills_col = 'What are your skills ? (Select multiple if necessary)'
    interest_col = 'What are your interests?'
    working_col = 'Are you working?'
    job_col = 'If yes, then what is/was your first Job title in your current field of work? If not applicable, write NA.               '
    masters_col = 'Have you done masters after undergraduation? If yes, mention your field of masters.(Eg; Masters in Mathematics)'
    cert_col = 'If yes, please specify your certificate course title.'

    out = pd.DataFrame()
    out['cgpa'] = df[cgpa_col].apply(lambda x: safe_float(x) / 10 if safe_float(x) > 10 else safe_float(x, 7.0)).clip(0, 10)
    out['skills_count'] = df[skills_col].apply(lambda x: len(split_items(x)))
    out['projects_count'] = (
        df[cert_col].apply(lambda x: len(split_items(x)))
        + df[working_col].fillna('').astype(str).str.lower().eq('yes').astype(int)
        + df[masters_col].notna().astype(int)
    )
    out['interest'] = df[interest_col].apply(map_interest)

    job_series = df[job_col].fillna('').astype(str).str.strip().str.lower()
    good_job = ~job_series.isin({'', 'na', 'nan', 'student (unemployed)', 'student'})
    out['target'] = (df[working_col].fillna('').astype(str).str.lower().eq('yes') & good_job).astype(int)
    return out.dropna()


def build_finance_dataset():
    credit_df = pd.read_csv(DATASETS_DIR / 'finance' / 'credit_risk_dataset.csv')
    personal_df = pd.read_csv(DATASETS_DIR / 'finance' / 'synthetic_personal_finance_dataset.csv')

    grade_map = {'A': 790, 'B': 730, 'C': 680, 'D': 630, 'E': 580, 'F': 530, 'G': 480}
    credit_part = pd.DataFrame()
    credit_part['income'] = credit_df['person_income'].clip(lower=1)
    credit_part['loan'] = credit_df['loan_amnt'].clip(lower=0)
    credit_part['credit_score'] = (
        credit_df['loan_grade'].map(grade_map).fillna(650)
        - credit_df['cb_person_default_on_file'].eq('Y').astype(int) * 40
        + credit_df['cb_person_cred_hist_length'].fillna(5) * 3
        - credit_df['loan_int_rate'].fillna(10) * 2
    ).clip(300, 850)
    credit_part['target'] = (credit_df['loan_status'] == 0).astype(int)

    personal_part = pd.DataFrame()
    personal_part['income'] = personal_df['monthly_income_usd'].clip(lower=1) * 12
    personal_part['loan'] = personal_df['loan_amount_usd'].fillna(0).clip(lower=0)
    personal_part['credit_score'] = personal_df['credit_score'].clip(300, 850)
    personal_part['target'] = (
        (personal_df['debt_to_income_ratio'].fillna(0) < 0.45)
        & (personal_df['credit_score'].fillna(0) >= 640)
        & (personal_df['savings_to_income_ratio'].fillna(0) >= 0.4)
    ).astype(int)

    return pd.concat([credit_part, personal_part], ignore_index=True).dropna()


def build_startup_dataset():
    success_df = pd.read_csv(DATASETS_DIR / 'startup' / 'startup_success_dataset.csv')
    funding_df = pd.read_csv(DATASETS_DIR / 'startup' / 'startup_funding.csv')

    success_part = pd.DataFrame()
    success_part['funding'] = (success_df['funding_rounds'].fillna(0).clip(lower=0) * 1_000_000).astype(float)
    success_part['team_size'] = success_df['team_size'].fillna(success_df['team_size'].median()).clip(lower=1)
    success_part['market'] = success_df['sector'].apply(map_market)
    success_part['experience'] = success_df['founder_experience_years'].fillna(0).clip(lower=0)
    success_part['target'] = success_df['outcome'].isin(['IPO', 'Acquisition']).astype(int)

    funding_part = pd.DataFrame()
    funding_part['funding'] = funding_df['Amount in USD'].apply(parse_money_to_usd)
    funding_part['team_size'] = 8
    funding_part['market'] = funding_df['Industry Vertical'].apply(map_market)
    funding_part['experience'] = 5.0
    investment_type = funding_df['InvestmentnType'].fillna('').astype(str).str.lower()
    funding_part['target'] = (
        funding_part['funding'].fillna(0) >= funding_part['funding'].median(skipna=True)
    ) | investment_type.str.contains('series c|series d|series e|private equity|debt financing')
    funding_part['target'] = funding_part['target'].astype(int)

    combined = pd.concat([success_part, funding_part], ignore_index=True)
    combined['funding'] = combined['funding'].fillna(combined['funding'].median())
    return combined.dropna()


def build_policy_dataset():
    schemes_df = pd.read_csv(DATASETS_DIR / 'policy' / 'Indian Government Schemes.csv')

    scheme_part = pd.DataFrame()
    sector_source = (
        schemes_df['schemeCategory'].fillna('')
        + ' '
        + schemes_df['tags'].fillna('')
        + ' '
        + schemes_df['details'].fillna('')
    )
    scheme_part['sector'] = sector_source.apply(map_sector)
    scheme_part['budget'] = (
        schemes_df['benefits'].apply(parse_rupee_amount).fillna(250000)
    ).clip(lower=10000)
    level = schemes_df['level'].fillna('State').astype(str).str.lower()
    population_map = {'central': 50000000, 'state': 7000000, 'union territory': 1000000}
    scheme_part['population'] = level.map(population_map).fillna(3000000)
    text_score = (
        schemes_df['eligibility'].fillna('').str.len()
        + schemes_df['application'].fillna('').str.len()
        + schemes_df['documents'].fillna('').str.len()
        + schemes_df['benefits'].fillna('').str.len()
    )
    scheme_part['target'] = ((text_score >= text_score.median()) & (scheme_part['budget'] > 0)).astype(int)

    historical_rows = []
    xlsx_path = DATASETS_DIR / 'policy' / 'India 20 year dataset.xlsx'
    if xlsx_path.exists():
        try:
            historical_df = pd.read_excel(xlsx_path, engine=None)
            historical_df = historical_df.sort_values('Year')
            estimated_population = np.linspace(1080000000, 1400000000, len(historical_df))
            infra_index = historical_df['Roads'] + historical_df['Houses'] * 1000 + historical_df['Water supply']
            health_index = historical_df['JSY'] * 1000 - historical_df['IMR'] * 10000 - historical_df['MMR'] * 2000
            for idx, (_, row) in enumerate(historical_df.iterrows()):
                pop_value = float(estimated_population[idx])
                historical_rows.append({
                    'sector': 'healthcare',
                    'budget': safe_float(row['JSY'], 0) * 1_000_000,
                    'population': pop_value,
                    'target': int(health_index.iloc[idx] >= health_index.median()),
                })
                historical_rows.append({
                    'sector': 'infrastructure',
                    'budget': max(10000.0, safe_float(row['Roads'], 0) * 1000 + safe_float(row['Water supply'], 0) * 100),
                    'population': pop_value,
                    'target': int(infra_index.iloc[idx] >= infra_index.median()),
                })
        except Exception:
            historical_rows = []

    history_part = pd.DataFrame(historical_rows)
    combined = pd.concat([scheme_part, history_part], ignore_index=True)
    combined['budget'] = combined['budget'].fillna(combined['budget'].median()).clip(lower=10000)
    combined['population'] = combined['population'].fillna(combined['population'].median()).clip(lower=1000)
    return combined.dropna()


def train_and_save(domain, dataset, numeric_features, categorical_features):
    X = dataset[numeric_features + categorical_features].copy()
    y = dataset['target'].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y if y.nunique() > 1 else None,
    )

    transformers = [
        ('num', Pipeline([('imputer', SimpleImputer(strategy='median'))]), numeric_features),
    ]
    if categorical_features:
        transformers.append((
            'cat',
            Pipeline([
                ('imputer', SimpleImputer(strategy='most_frequent')),
                ('onehot', OneHotEncoder(handle_unknown='ignore')),
            ]),
            categorical_features,
        ))

    preprocessor = ColumnTransformer(transformers=transformers)

    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced',
        )),
    ])

    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)
    metrics = {
        'accuracy': round(float(accuracy_score(y_test, predictions)), 4),
        'f1': round(float(f1_score(y_test, predictions, zero_division=0)), 4),
    }

    bundle = {
        'domain': domain,
        'pipeline': pipeline,
        'positive_class': 1,
        'metrics': metrics,
        'samples': int(len(dataset)),
        'features': {
            'numeric': numeric_features,
            'categorical': categorical_features,
        },
    }
    joblib.dump(bundle, MODELS_DIR / f'{domain}_model.joblib')
    return metrics


def main():
    summaries = {}

    career_df = build_career_dataset()
    summaries['career'] = train_and_save('career', career_df, ['cgpa', 'skills_count', 'projects_count'], ['interest'])

    finance_df = build_finance_dataset()
    summaries['finance'] = train_and_save('finance', finance_df, ['income', 'loan', 'credit_score'], [])

    startup_df = build_startup_dataset()
    summaries['startup'] = train_and_save('startup', startup_df, ['funding', 'team_size', 'experience'], ['market'])

    policy_df = build_policy_dataset()
    summaries['policy'] = train_and_save('policy', policy_df, ['budget', 'population'], ['sector'])

    summary_path = MODELS_DIR / 'training_summary.json'
    summary_path.write_text(json.dumps(summaries, indent=2), encoding='utf-8')

    print(json.dumps(summaries, indent=2))


if __name__ == '__main__':
    main()
