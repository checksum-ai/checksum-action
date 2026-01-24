const core = require("@actions/core");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  try {
    const apiKey = core.getInput("checksum_api_key", { required: true });
    const suiteIdsInput = core.getInput("suite-ids") || "";
    const baseUrl = core.getInput("base-url") || "https://aiagents.checksum.ai";
    const pollIntervalSeconds = Number(core.getInput("poll-interval-seconds") || "10");
    const timeoutSeconds = Number(core.getInput("timeout-seconds") || "900");

    const pollIntervalMs = pollIntervalSeconds * 1000;
    const maxAttempts = Math.ceil(timeoutSeconds / pollIntervalSeconds);

    // Parse suite IDs: comma separated list -> array of UUID strings
    const suiteIds = suiteIdsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    core.info(`Creating Checksum test run with ${suiteIds.length} suite ids`);

    const createResp = await fetch(`${baseUrl}/test-runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        suite_ids: suiteIds,
      }),
    });

    if (!createResp.ok) {
      const text = await createResp.text();
      throw new Error(
        `Failed to create test run. HTTP ${createResp.status}: ${text}`
      );
    }

    const createData = await createResp.json();

    const testRunId = createData.id;
    const initialStatus = createData.status;
    const initialUrl =
      createData.url || `${baseUrl}/test-runs/${encodeURIComponent(testRunId)}`;

    if (!testRunId) {
      throw new Error("Response from create_test_run did not include an id");
    }

    if (initialStatus !== "in_progress") {
      throw new Error(
        `Expected initial status to be in_progress but got "${initialStatus}"`
      );
    }

    core.info(`✅ Created Checksum test run ${testRunId} (in_progress)`);
    core.info(`🔗 Results URL: ${initialUrl}`);
    core.info(
      `⏳ Polling every ${pollIntervalSeconds}s for up to ${timeoutSeconds}s`
    );

    let finalData = null;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      await sleep(pollIntervalMs);

      core.info(`Polling attempt ${attempt} for test run ${testRunId}...`);

      const getResp = await fetch(
        `${baseUrl}/test-runs/${encodeURIComponent(testRunId)}`,
        {
          method: "GET",
          headers: {
            "X-API-KEY": apiKey,
          },
        }
      );

      if (!getResp.ok) {
        const text = await getResp.text();
        throw new Error(
          `Failed to fetch test run. HTTP ${getResp.status}: ${text}`
        );
      }

      const data = await getResp.json();

      const status = data.status;
      if (!status) {
        throw new Error(
          "Response from get_test_run did not include a status field"
        );
      }

      core.info(`Current status: ${status}`);

      if (status !== "in_progress") {
        finalData = data;
        break;
      }
    }

    if (!finalData) {
      throw new Error(
        `Test run ${testRunId} is still in_progress after timeout of ${timeoutSeconds}s`
      );
    }

    // Final summary with emojis
    const status = finalData.status;
    const passedCount = finalData.passed_count || 0;
    const failedCount = finalData.failed_count || 0;
    const healedCount = finalData.healed_count || 0;
    const bugCount = finalData.bug_count || 0;
    const errorCount = finalData.error_count || 0;

    const resultUrl =
      finalData.url || `${baseUrl}/test-runs/${encodeURIComponent(testRunId)}`;

    const statusEmoji =
      status === "completed"
        ? "✅"
        : status === "error"
        ? "❌"
        : "⚠️";

    core.info("");
    core.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    core.info("🧪 Checksum AI Test Run Summary");
    core.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    core.info(`${statusEmoji} Status: ${status}`);
    core.info(`✅ Passed: ${passedCount}`);
    core.info(`❌ Failed: ${failedCount}`);
    core.info(`🧩 Healed: ${healedCount}`);
    core.info(`🐞 Bug: ${bugCount}`);
    core.info(`⚠️ Error: ${errorCount}`);
    core.info(`🔗 Results URL: ${resultUrl}`);
    core.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    core.info("");

    // Set outputs
    core.setOutput("test-run-id", testRunId);
    core.setOutput("status", status);
    core.setOutput("passed-count", passedCount.toString());
    core.setOutput("failed-count", failedCount.toString());
    core.setOutput("healed-count", healedCount.toString());
    core.setOutput("bug-count", bugCount.toString());
    core.setOutput("error-count", errorCount.toString());
    core.setOutput("result-url", resultUrl);

    // Fail the action if there are any failed, bug, or error tests
    if (status !== "completed") {
      core.setFailed(
        `Checksum test run did not complete successfully. Final status: ${status}`
      );
      return;
    }

    if (failedCount > 0 || bugCount > 0 || errorCount > 0) {
      core.setFailed(
        "Checksum test run completed with failing, bug, or error cases."
      );
      return;
    }

    core.info("✅ Checksum test run completed successfully with no failures.");
  } catch (error) {
    core.setFailed(error.message || String(error));
  }
}

run();