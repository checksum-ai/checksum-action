# Checksum API Testing Action

Run your Checksum AI test suites in CI/CD pipelines.

## Usage

```yaml
name: "API Testing with Checksum AI"

on:
  pull_request:
    types: [opened, reopened]
  workflow_dispatch: {}

jobs:
  checksum-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run Checksum test suites
        uses: checksum-ai/checksum-action/api-testing@main
        with:
          checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}
          suite-ids: ""
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `checksum_api_key` | Checksum AI project API key | Yes | - |
| `suite-ids` | Comma-separated list of test suite UUIDs. Empty means all suites with code. | No | `""` |
| `base-url` | Checksum AI base URL | No | `https://aiagents.checksum.ai` |
| `poll-interval-seconds` | Polling interval in seconds | No | `10` |
| `timeout-seconds` | Maximum time to wait for the test run to finish | No | `600` |

## Outputs

| Output | Description |
|--------|-------------|
| `test-run-id` | ID of the Checksum test run |
| `status` | Final status of the test run |
| `passed-count` | Number of passed tests |
| `failed-count` | Number of failed tests |
| `healed-count` | Number of healed tests |
| `bug-count` | Number of bug tests |
| `error-count` | Number of tests that ended in error |
| `result-url` | URL for viewing the test run in Checksum |

## Setup

1. Get your API key from [Checksum](https://checksum.ai)
2. Add `CHECKSUM_API_KEY` as a repository secret (Settings → Secrets and variables → Actions)
3. Create the workflow file as shown above

## Advanced Usage

### Run Specific Test Suites

```yaml
- name: Run specific test suites
  uses: checksum-ai/checksum-action/api-testing@main
  with:
    checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}
    suite-ids: "uuid-1,uuid-2,uuid-3"
```

### Use Outputs in Subsequent Steps

```yaml
- name: Run Checksum tests
  id: checksum
  uses: checksum-ai/checksum-action/api-testing@main
  with:
    checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}

- name: Check results
  run: |
    echo "Test run: ${{ steps.checksum.outputs.test-run-id }}"
    echo "Passed: ${{ steps.checksum.outputs.passed-count }}"
    echo "Failed: ${{ steps.checksum.outputs.failed-count }}"
    echo "Results: ${{ steps.checksum.outputs.result-url }}"
```

### Fail on Test Failures

```yaml
- name: Run Checksum tests
  id: checksum
  uses: checksum-ai/checksum-action/api-testing@main
  with:
    checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}

- name: Fail if tests failed
  if: ${{ steps.checksum.outputs.failed-count != '0' }}
  run: |
    echo "Tests failed! See results: ${{ steps.checksum.outputs.result-url }}"
    exit 1
```
