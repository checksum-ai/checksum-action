# Checksum CI Guard for GitLab

AI-powered code review for GitLab Merge Requests.

## Quick Setup

### 1. Add your API keys

Go to **Settings → CI/CD → Variables** and add:

| Variable | Value | Flags |
|----------|-------|-------|
| `CHECKSUM_API_KEY` | Your API key from [checksum.ai](https://checksum.ai) | Mask variable |
| `GITLAB_TOKEN` | A Project Access Token (see below) | Mask variable |

#### Creating a Project Access Token (step-by-step)

1. Go to your project in GitLab
2. Navigate to **Settings → Access Tokens** (left sidebar)
3. Click **Add new token**
4. Fill in the form:
   - **Token name**: `checksum-ci-guard` (or any name you prefer)
   - **Expiration date**: Set a date (recommended: 1 year). If left blank, GitLab auto-sets an expiry (often 30 days). Max lifetime is 365 days by default.
   - **Select a role**: Choose **Reporter**
   - **Select scopes**: Check only **`api`**
5. Click **Create project access token**
6. **Copy the token immediately** - you won't see it again!
7. Add it as a CI/CD variable Key `GITLAB_TOKEN`

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
    CHECKSUM_API_KEY: $CHECKSUM_API_KEY
    GITLAB_TOKEN: $GITLAB_TOKEN
    MR_NUMBER: $CI_MERGE_REQUEST_IID
    PROJECT_PATH: $CI_PROJECT_PATH
    MR_TITLE: $CI_MERGE_REQUEST_TITLE
    MR_URL: "$CI_PROJECT_URL/-/merge_requests/$CI_MERGE_REQUEST_IID"
    BASE_SHA: $CI_MERGE_REQUEST_DIFF_BASE_SHA
    HEAD_SHA: $CI_COMMIT_SHA
    MR_DESCRIPTION: $CI_MERGE_REQUEST_DESCRIPTION
```

### 3. Open a Merge Request

The review will automatically run when you create or update an MR.

## How It Works

This uses GitLab's **hidden job + extends** pattern:
- The remote template provides a hidden job (`.checksum-ci-guard-base`) with the core logic
- You create a job that `extends` it and provides your variables and rules
- You control when and how the review runs

## Customization

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
    # ... same as above
  script:
    - |
      # Override script to add custom context
      ~/.checksumai/callagents.sh pull-request-tester "You are reviewing a GitLab Merge Request.

      Review MR !$MR_NUMBER in $PROJECT_PATH.

      Additional context: This is a Python project using FastAPI.

      MR Title: $MR_TITLE
      MR URL: $MR_URL
      Base SHA: $BASE_SHA
      Head SHA: $HEAD_SHA

      MR Description:
      $MR_DESCRIPTION

      Use 'git diff $BASE_SHA..$HEAD_SHA' to see the changes.

      To post comments, use the glab CLI: glab mr note $MR_NUMBER --message \"<comment>\""
```

## Required Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `CHECKSUM_API_KEY` | Your Checksum API key | CI/CD Variable |
| `GITLAB_TOKEN` | Project Access Token with `api` scope (Reporter role) | CI/CD Variable |
| `MR_NUMBER` | The MR number | `$CI_MERGE_REQUEST_IID` |
| `PROJECT_PATH` | Project path (e.g., `group/project`) | `$CI_PROJECT_PATH` |
| `MR_TITLE` | MR title | `$CI_MERGE_REQUEST_TITLE` |
| `MR_URL` | Full URL to the MR | Constructed from CI variables |
| `BASE_SHA` | Base commit SHA | `$CI_MERGE_REQUEST_DIFF_BASE_SHA` |
| `HEAD_SHA` | Head commit SHA | `$CI_COMMIT_SHA` |
| `MR_DESCRIPTION` | MR description | `$CI_MERGE_REQUEST_DESCRIPTION` |

## Self-Hosted GitLab

This works with self-hosted GitLab instances. The template uses `$CI_SERVER_HOST` to automatically configure the glab CLI for your instance.

## Troubleshooting

### "Error: CHECKSUM_API_KEY is required"

Make sure you've added `CHECKSUM_API_KEY` as a CI/CD variable and included it in your job's `variables:` section.

### Comments not appearing

1. Verify `GITLAB_TOKEN` is set and has `api` scope
2. Check that the Project Access Token has at least **Reporter** role
3. Review the job logs for glab authentication errors
