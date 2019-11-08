const { mapKeys } = require('lodash')
const core = require('@actions/core')
const { join } = require('path')
const childProcess = require('child_process');
const lhciCliPath = require.resolve('@lhci/cli/src/cli.js');

// audit urls with Lighthouse CI
async function main() {
  const urls = getUrls()
  const numberOfRuns = getRuns()

  for (const url of urls) {
    core.startGroup(`Start ci ${url}`)
    // Collect!
    core.startGroup(`Collecting`)
    const collectArgs = [`--url=${url}`,
                  `--numberOfRuns=${numberOfRuns}`]
    // TODO(exterkamp): rc-file override for custom-config and Chrome Flags

    let status = await runChildCommand('collect', collectArgs).status;

    if (status !== 0) break
    core.endGroup()
    // Assert!
    // TODO(exterkamp): assert against budget and assertion matrix
    core.startGroup(`Asserting`)
    core.endGroup()

    // Upload!
    core.startGroup(`Uploading`)
    const uploadArgs = []

    if (getLhciServer()) {
      uploadArgs.push('--target=lhci',
          `--serverBaseUrl=${getLhciServer()}`,
          `--token=${getApiToken()}`);
    } else {
      uploadArgs.push('--target=temporary-public-storage');
    }

    status = await runChildCommand('upload', uploadArgs).status;

    if (status !== 0) break
    core.endGroup()
    core.endGroup()
  }
  // TODO(exterkamp): cool to save all LHRs from a run as artifacts in gh-actions?
  // core.setOutput('resultsPath', '.lighthouseci')
}

// run `main()`
main()
  .catch(
    /** @param {Error} err */ err => {
      core.setFailed(err.message)
      process.exit(1)
    }
  )
  .then(() => {
    console.log(`done in ${process.uptime()}s`)
    process.exit()
  })

/**
 * @param {'collect'|'assert'|'upload'} command
 * @param {string[]} [args]
 * @return {{status: number}}
 */
function runChildCommand(command, args = []) {
  const combinedArgs = [lhciCliPath, command, ...args];
  const {status = -1} = childProcess.spawnSync(process.argv[0], combinedArgs, {
    stdio: 'inherit'});

  process.stdout.write('\n');
  return {status: status || 0};
}

/**
 * Get urls from `url` or `urls`.
 *
 * @return {string[]}
 */

function getUrls() {
  const url = core.getInput('url')
  if (url) return [url]
  const urls = core.getInput('urls')
  return urls.split('\n').map(url => url.trim())
}

/**
 * Get the number of runs.
 *
 * @return {number | null}
 */

function getRuns() {
  // Get num of runs || LHCI default of 3
  const numberOfRuns = parseInt(core.getInput('runs') || '3')
  return numberOfRuns
}

/**
 * Get the address of the LH CI server to upload LHRs to.
 *
 * @return {string | null}
 */
function getLhciServer() {
  const target = core.getInput('lhci_server')
  if (!target) return null
  return target
}

/**
 * Get the API Token to use to upload LHRs to the LH CI server.
 *
 * @return {string | null}
 */
function getApiToken() {
  const token = core.getInput('api_token')
  if (!token) return null
  return token
}
