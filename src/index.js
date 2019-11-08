const core = require('@actions/core')
const childProcess = require('child_process')
const lhciCliPath = require.resolve('@lhci/cli/src/cli.js')
const { readFileSync } = require('fs')

// audit urls with Lighthouse CI
async function main() {
  const urls = getUrls()
  const numberOfRuns = getNumberOfRuns()

  /** @type {string[]} */
  const failedUrls = []

  core.startGroup(`Running ci on: ${urls}`)
  for (const url of urls) {
    core.startGroup(`Start ci ${url}`)
    core.startGroup(`Collecting`)
    let args = [`--url=${url}`]

    if (rcHasCommand('collect')) {
      args.push(`--rc-file=${getRcFile()}`)
      // This should only happen in local testing, when the default is not sent
    } else if (!!numberOfRuns) {
      args.push(`--numberOfRuns=${numberOfRuns}`)
    }
    // else, no args will default to 3 in LHCI.

    let status = await runChildCommand('collect', args).status
    if (status !== 0) {
      core.error(`LHCI 'collect' has encountered a problem.`)
      continue
    }
    core.endGroup()

    if (getBudgetPath() || rcHasCommand('assert')) {
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

    if (getLhciServer() || canUpload()) {
      core.startGroup(`Uploading`)
      args = []

      if (getLhciServer()) {
        args.push('--target=lhci', `--serverBaseUrl=${getLhciServer()}`, `--token=${getApiToken()}`)
      } else {
        args.push('--target=temporary-public-storage')
      }

      status = await runChildCommand('upload', args).status

      if (status !== 0) {
        core.error(`LHCI 'upload' has encountered a problem.`)
        continue
      }
      core.endGroup()
    }
    core.endGroup()
  }

  // fail last
  // TODO(exterkamp): use rich failure text from assertion results
  if (failedUrls.length) {
    // TODO(exterkamp): use ICU
    core.setFailed(
      `Performance budget fails for ${failedUrls.length} URL${failedUrls.length === 1 ? '' : 's'}` +
        ` (${failedUrls.join(', ')})`
    )
  }
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
 * Run a child command synchronously.
 *
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
 * Get urls from `urls`.
 *
 * @return {string[]}
 */

function getUrls() {
  const urls = core.getInput('urls')
  return urls.split('\n').map(url => url.trim())
}

/**
 * Get the path to a budgets.json file.
 *
 * @return {string | null}
 */
function getBudgetPath() {
  const budgetPath = core.getInput('budget_path')
  if (!budgetPath) return null
  return budgetPath
}

/**
 * Get the path to a rc_file.json file.
 *
 * @return {object | null}
 */
function getRcFile() {
  return core.getInput('rc_file_path') || null
}

/**
 * Check if an rc_file exists, and if it contains a command section.
 *
 * @param {'collect'|'assert'} command
 * @return {boolean}
 */
function rcHasCommand(command) {
  if (!getRcFile()) return false
  const contents = readFileSync(getRcFile(), 'utf8')
  const rcFile = JSON.parse(contents)
  if ('ci' in rcFile && command in rcFile.ci) return true
  return false
}

/**
 * Get the number of runs.
 * Note: github-actions sends a default of 3.
 *
 * @return {number}
 */

function getNumberOfRuns() {
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

/**
 * Check if the run can upload, or if the runner has opted out.
 *
 * @return {boolean}
 */
function canUpload() {
  const noUpload = core.getInput('no_upload')
  if (!!noUpload) return false
  return true
}
