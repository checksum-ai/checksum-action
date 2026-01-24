# Checksum CI Guard

AI-powered code review for pull requests. Automatically analyzes code changes, generates tests, runs them, and posts results as PR/MR comments.

---

## GitHub Actions

### Usage

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

### Inputs

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

### Setup

1. Get your API key from [Checksum](https://checksum.ai)
2. Add `CHECKSUM_API_KEY` as a repository secret (Settings -> Secrets and variables -> Actions)
3. Create the workflow file at `.github/workflows/checksum-ci-guard.yml`
4. Open a PR or comment `@checksum-ai` on an existing PR to trigger

### Advanced Usage

#### Add Extra Context

```yaml
- name: Run Checksum CI Guard
  uses: checksum-ai/checksum-action/ci-guard@main
  with:
    checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}
    extra_context: |
      This is a Python FastAPI project using pytest.
      Use existing test fixtures from tests/conftest.py.
```

#### Run Only on Specific Branches

```yaml
on:
  pull_request:
    types: [opened, reopened]
    branches:
      - main
      - develop
```

#### Run Only with a Label

```yaml
jobs:
  ci-guard:
    if: contains(github.event.pull_request.labels.*.name, 'needs-testing')
    runs-on: ubuntu-latest
    # ...
```

### Requirements

- GitHub Actions runner: `ubuntu-latest`
- Repository permissions: `contents: read`, `pull-requests: write`
- Full git history: `fetch-depth: 0` in checkout step
- **Runtime environment**: The runner must have your project's test dependencies installed (e.g., Node.js, Python, etc.). Use setup actions like `actions/setup-node` or `actions/setup-python` before running CI Guard.

### Backwards Compatibility

The legacy path `checksum-ai/checksum-action/pr-testing@main` still works and redirects to this action.

---

## GitLab CI

### Usage

Add to your `.gitlab-ci.yml`:

```yaml
include:
  - remote: 'https://raw.githubusercontent.com/checksum-ai/checksum-action/main/ci-guard/gitlab-ci.yml'

checksum-ci-guard:
  extends: .checksum-ci-guard-base
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  variables:
    MR_NUMBER: $CI_MERGE_REQUEST_IID
    PROJECT_PATH: $CI_PROJECT_PATH
    MR_TITLE: $CI_MERGE_REQUEST_TITLE
    MR_URL: "$CI_PROJECT_URL/-/merge_requests/$CI_MERGE_REQUEST_IID"
    BASE_SHA: $CI_MERGE_REQUEST_DIFF_BASE_SHA
    HEAD_SHA: $CI_COMMIT_SHA
    MR_DESCRIPTION: $CI_MERGE_REQUEST_DESCRIPTION
```

### Setup

1. Get your API key from [Checksum](https://checksum.ai)
2. Create a **Project Access Token** (Settings -> Access Tokens):
   - Name: `checksum-ci-guard`
   - Role: `Developer`
   - Scopes: `api`
3. Add CI/CD variables (Settings -> CI/CD -> Variables):
   - `CHECKSUM_API_KEY`: Your Checksum API key
   - `GITLAB_TOKEN`: The Project Access Token from step 2

> **IMPORTANT: Do NOT mark variables as "Protected"**
>
> MR pipelines run on non-protected refs (`refs/merge-requests/X/head`). Protected variables are only available on protected branches, so they won't work for MR pipelines.

### Advanced Usage

#### Custom Variable Names

If your CI/CD variables have different names:

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  variables:
    CHECKSUM_API_KEY_VAR: "MY_API_KEY"
    GITLAB_TOKEN_VAR: "MY_GITLAB_TOKEN"
    # ... other variables
```

#### Custom Runtime Environment

The default image is `debian:bookworm-slim`. If your project needs specific runtimes (Node.js, Python, etc.), override the image:

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  image: node:20-bookworm  # Use Node.js 20 with Debian base
  # ... rest of config
```

Or install dependencies in `before_script`:

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  before_script:
    - apt-get update && apt-get install -y --no-install-recommends curl jq bash ripgrep ca-certificates git
    # Install glab CLI
    - |
      GLAB_VERSION=$(curl -s "https://gitlab.com/api/v4/projects/34675721/releases/permalink/latest" | jq -r '.tag_name')
      curl -fsSL "https://gitlab.com/gitlab-org/cli/-/releases/${GLAB_VERSION}/downloads/glab_${GLAB_VERSION#v}_linux_amd64.deb" -o /tmp/glab.deb
      dpkg -i /tmp/glab.deb && rm /tmp/glab.deb
    # Add your project dependencies
    - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    - apt-get install -y nodejs
  # ... rest of config
```

### Requirements

- GitLab CI runner with Docker support
- CI/CD variables: `CHECKSUM_API_KEY`, `GITLAB_TOKEN`
- Full git history: `GIT_DEPTH: 0` (set by default in base template)
- **Runtime environment**: Override the image or extend `before_script` to install your project's test dependencies
