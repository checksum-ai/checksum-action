# Checksum CI Guard

AI-powered code review for pull requests. Automatically analyzes code changes, generates tests, runs them, and posts results as PR comments.

## Usage

```yaml
name: Checksum CI Guard

on:
  pull_request:
    types: [opened, reopened]
  issue_comment:
    types: [created]
  workflow_dispatch: {}

permissions:
  contents: read
  pull-requests: write

jobs:
  ci-guard:
    runs-on: ubuntu-latest
    if: |
      (github.event_name == 'pull_request') ||
      (github.event_name == 'issue_comment' &&
       github.event.issue.pull_request &&
       contains(github.event.comment.body, '@checksum-ai')) ||
      (github.event_name == 'workflow_dispatch')
    steps:
      - name: Get PR details
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            let pr;
            if (context.eventName === 'pull_request') {
              pr = context.payload.pull_request;
            } else {
              const { data } = await github.rest.pulls.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.issue.number
              });
              pr = data;
            }
            core.setOutput('number', pr.number);
            core.setOutput('title', pr.title);
            core.setOutput('url', pr.html_url);
            core.setOutput('base_sha', pr.base.sha);
            core.setOutput('head_sha', pr.head.sha);
            core.setOutput('body', pr.body || '');

      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ steps.pr.outputs.head_sha }}

      # ⚠️ IMPORTANT: Install your project's runtime and dependencies
      # The agent needs these to run tests. Uncomment the relevant lines:
      # - name: Setup Node.js
      #   uses: actions/setup-node@v4
      #   with:
      #     node-version: '20'
      # - name: Setup Python
      #   uses: actions/setup-python@v5
      #   with:
      #     python-version: '3.12'

      # - name: Install dependencies
      #   run: npm ci                         # Node.js
      #   run: pip install -r requirements.txt  # Python

      - name: Run Checksum CI Guard
        uses: checksum-ai/checksum-action/ci-guard@main
        with:
          checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}
          pr_number: ${{ steps.pr.outputs.number }}
          pr_title: ${{ steps.pr.outputs.title }}
          pr_url: ${{ steps.pr.outputs.url }}
          base_sha: ${{ steps.pr.outputs.base_sha }}
          head_sha: ${{ steps.pr.outputs.head_sha }}
          pr_body: ${{ steps.pr.outputs.body }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `checksum_api_key` | Your Checksum API key | Yes | - |
| `pr_number` | Pull request number | Yes | - |
| `pr_title` | Pull request title | Yes | - |
| `pr_url` | Pull request URL | Yes | - |
| `base_sha` | Base commit SHA | Yes | - |
| `head_sha` | Head commit SHA | Yes | - |
| `pr_body` | Pull request body/description | No | `""` |
| `extra_context` | Additional context for the reviewer | No | `""` |

## Setup

1. Get your API key from [Checksum](https://checksum.ai)
2. Add `CHECKSUM_API_KEY` as a repository secret (Settings -> Secrets and variables -> Actions)
3. Create the workflow file at `.github/workflows/checksum-ci-guard.yml`
4. Open a PR or comment `@checksum-ai` on an existing PR to trigger

## Advanced Usage

### Add Extra Context

```yaml
- name: Run Checksum CI Guard
  uses: checksum-ai/checksum-action/ci-guard@main
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
    types: [opened, reopened]
    branches:
      - main
      - develop
```

### Run Only with a Label

```yaml
jobs:
  ci-guard:
    if: contains(github.event.pull_request.labels.*.name, 'needs-testing')
    runs-on: ubuntu-latest
    # ...
```

### Custom Runtime Environment

The agent needs your project's test dependencies installed (e.g., Node.js, Python, etc.) to run tests. Add setup steps before running CI Guard.

This example shows the runtime setup portion. Include these steps in the full workflow shown above (after "Checkout" and before "Run Checksum CI Guard"):

```yaml
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'

  - name: Install dependencies
    run: npm ci
```

## Requirements

- GitHub Actions runner: `ubuntu-latest`
- Repository permissions: `contents: read`, `pull-requests: write`
- Full git history: `fetch-depth: 0` in checkout step
- **Runtime environment**: The runner must have your project's test dependencies installed (e.g., Node.js, Python, etc.). Use setup actions like `actions/setup-node` or `actions/setup-python` before running CI Guard.

## GitLab CI

For GitLab CI/CD support, see [GITLAB.md](./GITLAB.md).
