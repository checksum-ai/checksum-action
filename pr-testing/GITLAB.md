# Checksum PR Review for GitLab

AI-powered code review for GitLab Merge Requests.

## Quick Setup

### 1. Add your Checksum API key

Go to **Settings → CI/CD → Variables** and add:
- **Key:** `CHECKSUM_API_KEY`
- **Value:** Your API key from [checksum.ai](https://checksum.ai)
- **Flags:** Check "Mask variable"

### 2. Create `.gitlab-ci.yml`

Add this file to your repository root:

```yaml
include:
  - remote: 'https://raw.githubusercontent.com/checksum-ai/checksum-action/main/pr-testing/gitlab-ci.yml'
```

### 3. Open a Merge Request

The review will automatically run when you create or update an MR.

## Re-running Reviews

To re-run a review on an existing MR:
1. Go to the MR page
2. Click the **Pipelines** tab
3. Click **Run pipeline**

## Self-Hosted GitLab

This works automatically with self-hosted GitLab instances. No additional configuration needed.

The CI template uses GitLab's built-in `CI_JOB_TOKEN` and `CI_API_V4_URL` which automatically point to the correct GitLab instance.

## How It Works

- Triggers on merge request events
- Uses `CI_JOB_TOKEN` for posting comments (no bot setup required)
- Comments appear as the pipeline user

## Environment Variables

The following GitLab CI/CD variables are used automatically:

| Variable | Description |
|----------|-------------|
| `CI_MERGE_REQUEST_IID` | The MR number |
| `CI_PROJECT_PATH` | Project path (e.g., `group/project`) |
| `CI_MERGE_REQUEST_TITLE` | MR title |
| `CI_MERGE_REQUEST_DESCRIPTION` | MR description |
| `CI_MERGE_REQUEST_DIFF_BASE_SHA` | Base commit SHA |
| `CI_COMMIT_SHA` | Head commit SHA |
| `CI_JOB_TOKEN` | Built-in auth token for GitLab API |
| `CI_API_V4_URL` | GitLab API URL (auto-configured) |

## Customization

To customize the review behavior, you can override the job in your `.gitlab-ci.yml`:

```yaml
include:
  - remote: 'https://raw.githubusercontent.com/checksum-ai/checksum-action/main/pr-testing/gitlab-ci.yml'

checksum-pr-review:
  variables:
    # Add custom variables here
```
