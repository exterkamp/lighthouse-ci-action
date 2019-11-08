const core = require('@actions/core')
const childProcess = require('child_process')
const lhciCliPath = require.resolve('@lhci/cli/src/cli.js')
const { join } = require('path')
const { writeFile } = require('fs').promises
const { readFileSync } = require('fs')

// audit urls with Lighthouse CI
async function main() {
  const urls = getUrls()
  const numberOfRuns = getRuns()
  core.startGroup(`Running ci on: ${urls}`)
  for (const url of urls) {
    core.startGroup(`Start ci ${url}`)
    // Collect!
    core.startGroup(`Collecting`)
    let args = [`--url=${url}`, `--numberOfRuns=${numberOfRuns}`]
    // TODO(exterkamp): rc-file override for custom-config and Chrome Flags

    let status = await runChildCommand('collect', args).status

    if (status !== 0) continue
    core.endGroup()

    // Assert!
    // TODO(exterkamp): assert against budget and assertion matrix
    if (getBudgetPath()/* TODO(exterkamp): or assertion matrix */) {
      core.startGroup(`Asserting`)

      args = []

      if (getBudgetPath()) {
        args.push(`--budgetsFile=${getBudgetPath()}`)
      }
      // else assertion matrix
      // else die

      status = await runChildCommand('assert', args).status

      if (status !== 0) {
        // TODO(exterkamp): fail the build
        continue
      }
      core.endGroup()
    }

    // Upload!
    core.startGroup(`Uploading`)
    args = []

    if (getLhciServer()) {
      args.push('--target=lhci', `--serverBaseUrl=${getLhciServer()}`, `--token=${getApiToken()}`)
    } else {
      args.push('--target=temporary-public-storage')
    }

    status = await runChildCommand('upload', args).status

    if (status !== 0) continue
    core.endGroup()
    core.endGroup()
  }
  // TODO(exterkamp): cool to save all LHRs from a run as artifacts in gh-actions?
  // core.setOutput('resultsPath', '.lighthouseci')
  core.endGroup()
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
  const combinedArgs = [lhciCliPath, command, ...args]
  const { status = -1 } = childProcess.spawnSync(process.argv[0], combinedArgs, {
    stdio: 'inherit'
  })

  process.stdout.write('\n')
  return { status: status || 0 }
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

/** @return {object | null} */
function getBudgetPath() {
  const budgetPath = core.getInput('budgetPath')
  if (!budgetPath) return null
  return budgetPath
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
