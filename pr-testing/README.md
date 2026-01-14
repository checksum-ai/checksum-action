# Checksum PR Testing Action

AI-powered functional testing for pull requests. Automatically analyzes code changes, generates tests, runs them, and posts results as PR comments.

## Usage

```yaml
name: Checksum PR Testing

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  pr-testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Checksum PR Testing
        uses: checksum-ai/checksum-action/pr-testing@main
        with:
          checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `checksum_api_key` | Your Checksum API key | Yes | - |
| `extra_context` | Additional context for the reviewer | No | `""` |

## Setup

1. Get your API key from [Checksum](https://checksum.ai)
2. Add `CHECKSUM_API_KEY` as a repository secret (Settings → Secrets and variables → Actions)
3. Create the workflow file at `.github/workflows/checksum-pr-testing.yml`
4. Open a PR — Checksum will automatically run and post results

## Advanced Usage

### Add Extra Context

```yaml
- name: Run Checksum PR Testing
  uses: checksum-ai/checksum-action/pr-testing@main
  with:
    checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}
    extra_context: |
      This is a Python FastAPI project using pytest.
      Use existing test fixtures from tests/conftest.py.
```

### Run Only on Specific Branches

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
      - develop
```

### Run Only with a Label

```yaml
jobs:
  pr-testing:
    if: contains(github.event.pull_request.labels.*.name, 'needs-testing')
    runs-on: ubuntu-latest
    # ...
```

## Requirements

- GitHub Actions runner: `ubuntu-latest`
- Repository permissions: `contents: read`, `pull-requests: write`
- Full git history: `fetch-depth: 0` in checkout step
