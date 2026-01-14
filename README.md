# Checksum GitHub Actions

GitHub Actions for [Checksum](https://checksum.ai) AI-powered testing.

## Available Actions

### [API Testing](./api-testing)

Run Checksum AI test suites in your CI/CD pipeline.

```yaml
- uses: checksum-ai/checksum-action/api-testing@main
  with:
    checksum-api-key: ${{ secrets.CHECKSUM_API_KEY }}
```

### [PR Testing](./pr-testing)

Automated functional testing for pull requests.

```yaml
- uses: checksum-ai/checksum-action/pr-testing@main
  with:
    checksum_api_key: ${{ secrets.CHECKSUM_API_KEY }}
```

## Setup

1. Get your API key from [Checksum](https://checksum.ai)
2. Add `CHECKSUM_API_KEY` as a repository secret
3. See the README in each action folder for detailed usage
