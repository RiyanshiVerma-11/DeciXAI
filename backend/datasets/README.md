## Dataset Storage Guide

Place your real training datasets in the domain folders inside this directory.

Recommended structure:

- `backend/datasets/career/`
- `backend/datasets/finance/`
- `backend/datasets/startup/`
- `backend/datasets/policy/`

You can keep 2 to 3 datasets in each folder.

Recommended file naming:

- `career_dataset_1.csv`
- `career_dataset_2.csv`
- `career_dataset_3.csv`
- `finance_dataset_1.csv`
- `finance_dataset_2.csv`
- `finance_dataset_3.csv`
- `startup_dataset_1.csv`
- `startup_dataset_2.csv`
- `startup_dataset_3.csv`
- `policy_dataset_1.csv`
- `policy_dataset_2.csv`
- `policy_dataset_3.csv`

Suggested target column by domain:

- Career: `decision_label` or `career_outcome`
- Finance: `risk_label` or `loan_approval`
- Startup: `success_label` or `funding_outcome`
- Policy: `feasibility_label` or `policy_outcome`

Suggested file format:

- Prefer `.csv`
- Keep column names simple and consistent
- Use one target column per dataset
- Keep missing values cleaned before training

Example:

- `backend/datasets/career/student_career_data.csv`
- `backend/datasets/finance/credit_risk_data.csv`
- `backend/datasets/startup/startup_success_data.csv`
- `backend/datasets/policy/policy_feasibility_data.csv`
