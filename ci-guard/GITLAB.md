# Checksum CI Guard for GitLab

AI-powered code review for GitLab Merge Requests. Automatically analyzes code changes, generates tests, runs them, and posts results as MR comments.

## Quick Setup

### 1. Add your API keys

Go to **Settings → CI/CD → Variables** and add:

| Variable | Value | Flags |
|----------|-------|-------|
| `CHECKSUM_API_KEY` | Your API key from [checksum.ai](https://checksum.ai) | Mask variable |
| `GITLAB_TOKEN` | A Project Access Token (see below) | Mask variable |

> ⚠️ **IMPORTANT: Do NOT mark variables as "Protected"**
>
> MR pipelines run on non-protected refs (`refs/merge-requests/X/head`). Protected variables are only available on protected branches, so **they won't work for MR pipelines**.

#### Creating a Project Access Token (step-by-step)

1. Go to your project in GitLab
2. Navigate to **Settings → Access Tokens** (left sidebar)
3. Click **Add new token**
4. Fill in the form:
   - **Token name**: `checksum-ci-guard` (or any name you prefer)
   - **Expiration date**: Set a date (recommended: 1 year). If left blank, GitLab auto-sets an expiry (often 30 days). Max lifetime is 365 days by default.
   - **Select a role**: Choose **Reporter** (minimum required for posting comments)
   - **Select scopes**: Check only **`api`**
5. Click **Create project access token**
6. **Copy the token immediately** - you won't see it again!
7. Add it as a CI/CD variable with key `GITLAB_TOKEN`

> **Why Project Access Token?** Unlike Personal Access Tokens, Project Access Tokens:
> - Are scoped to this project only (more secure)
> - Won't break if a team member leaves
> - Create a bot user, so comments show as from "project_123_bot"

### 2. Create `.gitlab-ci.yml`

Add this to your repository:

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

> **Note:** `CHECKSUM_API_KEY` and `GITLAB_TOKEN` are automatically picked up from your CI/CD variables. No need to map them in the `variables:` section.

### 3. Open a Merge Request

The review will automatically run when you create or update an MR.

## How It Works

This uses GitLab's **hidden job + extends** pattern:
- The remote template provides a hidden job (`.checksum-ci-guard-base`) with the core logic
- You create a job that `extends` it and provides your variables and rules
- You control when and how the review runs

## Customization

### Custom Variable Names

If your CI/CD variables have different names:

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  variables:
    CHECKSUM_API_KEY_VAR: "MY_API_KEY"
    GITLAB_TOKEN_VAR: "MY_GITLAB_TOKEN"
    # ... other variables
```

### Custom Runtime Environment

The default image is `debian:bookworm-slim`. **The agent needs your project's test dependencies installed** (e.g., Node.js, Python, etc.) to run tests.

**Option 1: Override the image**

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  image: node:20-bookworm  # Use Node.js 20 with Debian base
  # ... rest of config
```

**Option 2: Install dependencies in before_script**

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  before_script:
    # Base dependencies (required)
    - apt-get update && apt-get install -y --no-install-recommends curl jq bash ripgrep ca-certificates git
    # Install glab CLI (required for posting comments)
    - |
      GLAB_VERSION=$(curl -s "https://gitlab.com/api/v4/projects/34675721/releases/permalink/latest" | jq -r '.tag_name')
      curl -fsSL "https://gitlab.com/gitlab-org/cli/-/releases/${GLAB_VERSION}/downloads/glab_${GLAB_VERSION#v}_linux_amd64.deb" -o /tmp/glab.deb
      dpkg -i /tmp/glab.deb && rm /tmp/glab.deb
    # Add your project dependencies
    - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    - apt-get install -y nodejs
  # ... rest of config
```

### Run only on specific branches

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"
  variables:
    # ... same as above
```

### Run manually

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual
  variables:
    # ... same as above
```

### Add extra context

```yaml
checksum-ci-guard:
  extends: .checksum-ci-guard-base
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  variables:
    EXTRA_CONTEXT: |
      This is a Python FastAPI project using pytest.
      Use existing test fixtures from tests/conftest.py.
    MR_NUMBER: $CI_MERGE_REQUEST_IID
    PROJECT_PATH: $CI_PROJECT_PATH
    MR_TITLE: $CI_MERGE_REQUEST_TITLE
    MR_URL: "$CI_PROJECT_URL/-/merge_requests/$CI_MERGE_REQUEST_IID"
    BASE_SHA: $CI_MERGE_REQUEST_DIFF_BASE_SHA
    HEAD_SHA: $CI_COMMIT_SHA
    MR_DESCRIPTION: $CI_MERGE_REQUEST_DESCRIPTION
```

## Variables

### Required

| Variable | Description | Source |
|----------|-------------|--------|
| `CHECKSUM_API_KEY` | Your Checksum API key | CI/CD Variable (auto-detected) |
| `GITLAB_TOKEN` | Project Access Token with `api` scope (Reporter role) | CI/CD Variable (auto-detected) |
| `MR_NUMBER` | The MR number | `$CI_MERGE_REQUEST_IID` |
| `PROJECT_PATH` | Project path (e.g., `group/project`) | `$CI_PROJECT_PATH` |
| `MR_TITLE` | MR title | `$CI_MERGE_REQUEST_TITLE` |
| `MR_URL` | Full URL to the MR | Constructed from CI variables |
| `BASE_SHA` | Base commit SHA | `$CI_MERGE_REQUEST_DIFF_BASE_SHA` |
| `HEAD_SHA` | Head commit SHA | `$CI_COMMIT_SHA` |
| `MR_DESCRIPTION` | MR description | `$CI_MERGE_REQUEST_DESCRIPTION` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `EXTRA_CONTEXT` | Additional context for the reviewer (e.g., project type, test frameworks) | `""` |
| `CHECKSUM_API_KEY_VAR` | Custom variable name for API key | `"CHECKSUM_API_KEY"` |
| `GITLAB_TOKEN_VAR` | Custom variable name for GitLab token | `"GITLAB_TOKEN"` |

## Requirements

- GitLab CI runner with Docker support
- CI/CD variables: `CHECKSUM_API_KEY`, `GITLAB_TOKEN` (**not marked as Protected**)
- Full git history: `GIT_DEPTH: 0` (set by default in base template)
- **Runtime environment**: Override the image or extend `before_script` to install your project's test dependencies (Node.js, Python, etc.)

## Self-Hosted GitLab

This works with self-hosted GitLab instances. The template uses `$CI_SERVER_HOST` to automatically configure the glab CLI for your instance.

## Troubleshooting

### "Error: CHECKSUM_API_KEY is not set or empty"

1. Make sure `CHECKSUM_API_KEY` is added as a CI/CD variable
2. **Verify the variable is NOT marked as "Protected"** - this is the most common issue!
3. Check that the variable name matches (or use `CHECKSUM_API_KEY_VAR` to specify a custom name)

### "Error: GITLAB_TOKEN is not set or empty"

1. Make sure `GITLAB_TOKEN` is added as a CI/CD variable
2. **Verify the variable is NOT marked as "Protected"**
3. Check that the token hasn't expired

### Comments not appearing

1. Verify `GITLAB_TOKEN` has `api` scope
2. Check that the Project Access Token has at least **Reporter** role
3. Review the job logs for glab authentication errors
4. Make sure the token hasn't expired
