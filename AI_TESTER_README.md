# CoreStay AI Tester (Playwright + OpenAI)

This is a local QA utility, not a feature running inside the public website. It opens the Hotel Budget page in Chromium, enters synthetic values into Step 1 and Master Payroll, checks selected payroll calculations, and asks an LLM to review visible results.

## Setup

Use Python 3.10+ from the repository root:

    python -m venv .venv
    # Windows: .venv\Scripts\activate
    # macOS/Linux: source .venv/bin/activate
    python -m pip install -r requirements-test.txt
    python -m playwright install chromium

Copy .env.example to .env and set OPENAI_API_KEY. Do not commit .env or expose the API key in client-side website code.

## Run

    python run_ai_tester.py

A Markdown report and screenshot are written to test-results/. Set CORESTAY_URL to a dedicated staging/test deployment when available. If the page requires login, use an authorized test session; the script does not collect or store credentials.

## Limits and safety

- Uses synthetic values and does not click Save, Reset, or final validation.
- Smoke-tests selected Step 1 fields and one Master Payroll row. It does not audit every account, monthly allocation, or the 10-year forecast.
- The LLM is a secondary reviewer, not a source of truth. Review evidence before treating a finding as a confirmed bug.
- Python Playwright runs on your computer/CI, not in Vercel's serverless website runtime. The OpenAI key remains separate from the public web app.
