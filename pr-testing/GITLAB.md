# Checksum PR Review for GitLab

AI-powered code review for GitLab Merge Requests.

## Quick Setup

### 1. Add your API keys

Go to **Settings → CI/CD → Variables** and add:

| Variable | Value | Flags |
|----------|-------|-------|
| `CHECKSUM_API_KEY` | Your API key from [checksum.ai](https://checksum.ai) | Mask variable |
| `GITLAB_ACCESS_TOKEN` | A Personal Access Token with `api` scope | Mask variable |

> **Note:** The `GITLAB_ACCESS_TOKEN` is used by the `glab` CLI to post comments on your MR. Create one at **Settings → Access Tokens**.

### 2. Create `.gitlab-ci.yml`

Add this to your repository:

```yaml
include:
  - remote: 'https://raw.githubusercontent.com/checksum-ai/checksum-action/main/pr-testing/gitlab-ci.yml'

checksum-pr-review:
  extends: .checksum-pr-review-base
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  variables:
    CHECKSUM_API_KEY: $CHECKSUM_API_KEY
    GITLAB_ACCESS_TOKEN: $GITLAB_ACCESS_TOKEN
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
- The remote template provides a hidden job (`.checksum-pr-review-base`) with the core logic
- You create a job that `extends` it and provides your variables and rules
- You control when and how the review runs

## Customization

### Run only on specific branches

```yaml
checksum-pr-review:
  extends: .checksum-pr-review-base
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"
  variables:
    # ... same as above
```

### Run manually

```yaml
checksum-pr-review:
  extends: .checksum-pr-review-base
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual
  variables:
    # ... same as above
```

### Add extra context

```yaml
checksum-pr-review:
  extends: .checksum-pr-review-base
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
| `GITLAB_ACCESS_TOKEN` | Personal Access Token with `api` scope | CI/CD Variable |
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

1. Verify `GITLAB_ACCESS_TOKEN` is set and has `api` scope
2. Check that the token owner has permission to comment on MRs
3. Review the job logs for glab authentication errors
