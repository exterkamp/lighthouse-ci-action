const core = require('@actions/core')
const childProcess = require('child_process')
const lhciCliPath = require.resolve('@lhci/cli/src/cli.js')
const { readFileSync } = require('fs')

// audit urls with Lighthouse CI
async function main() {
  // TODO(exterkamp): fail if !(url || urls) || !(hasCollect || numberOfRuns)
  const urls = getUrls()
  const numberOfRuns = getRuns()

  /** @type {string[]} */
  const failedUrls = []

  core.startGroup(`Running ci on: ${urls}`)
  for (const url of urls) {
    core.startGroup(`Start ci ${url}`)
    // Collect!
    core.startGroup(`Collecting`)
    let args = [`--url=${url}`]

    if (rcHasCollect()) {
      args.push(`--rc-file=${getRcFile()}`)
    } else {
      args.push(`--numberOfRuns=${numberOfRuns}`)
    }

    let status = await runChildCommand('collect', args).status
    if (status !== 0) continue
    core.endGroup()

    // Assert!
    if (getBudgetPath() || rcHasAssert()) {
      core.startGroup(`Asserting`)

      args = []

      if (getBudgetPath()) {
        args.push(`--budgetsFile=${getBudgetPath()}`)
      } else {
        args.push(`--rc-file=${getRcFile()}`)
      }

      status = await runChildCommand('assert', args).status

      if (status !== 0) {
        failedUrls.push(url)
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

  // fail last
  // TODO(exterkamp): use rich failure text from assertion results
  if (failedUrls.length) {
    core.setFailed(
      `Performance budget fails for ${failedUrls.length} URL${failedUrls.length === 1 ? '' : 's'}` +
        ` (${failedUrls.join(', ')})`
    )
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
  const urls = core.getInput('urls')
  return urls.split('\n').map(url => url.trim())
}

/** @return {string | null} */
function getBudgetPath() {
  const budgetPath = core.getInput('budget_path')
  if (!budgetPath) return null
  return budgetPath
}

/** @return {object | null} */
function getRcFile() {
  return core.getInput('rc_file_path') || null
}

function rcHasAssert() {
  if (!getRcFile()) return false
  const contents = readFileSync(getRcFile(), 'utf8')
  const rcFile = JSON.parse(contents)
  if ('ci' in rcFile && 'assert' in rcFile.ci) return true
  return false
}

function rcHasCollect() {
  if (!getRcFile()) return false
  const contents = readFileSync(getRcFile(), 'utf8')
  // TODO(exterkamp): doing this to see if it has "collect" seems dumb
  const rcFile = JSON.parse(contents)
  if ('ci' in rcFile && 'collect' in rcFile.ci) return true
  return false
}

/**
 * Get the number of runs.
 *
 * @return {number}
 */

function getRuns() {
  const numberOfRuns = parseInt(core.getInput('runs'))
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
