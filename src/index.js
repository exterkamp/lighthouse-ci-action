const core = require('@actions/core')
const childProcess = require('child_process')
const lhciCliPath = require.resolve('@lhci/cli/src/cli.js')
const input = require('./input.js')

// audit urls with Lighthouse CI
async function main() {
  core.startGroup('Action config')
  console.log('Input args:', input)
  core.endGroup() // Action config

  /*******************************COLLECTING***********************************/
  core.startGroup(`Collecting`)
  let args = []

  if (input.staticDistDir) {
    args.push(`--static-dist-dir=${input.staticDistDir}`)
  } else if (input.urls) {
    for (const url of input.urls) {
      args.push(`--url=${url}`)
    }
  }
  // else LHCI will panic with a non-zero exit code...

  if (input.rcCollect) {
    args.push(`--rc-file=${input.rcFile}`)
    // This should only happen in local testing, when the default is not sent
  } else if (input.numberOfRuns) {
    args.push(`--numberOfRuns=${input.numberOfRuns}`)
  }
  // else, no args and will default to 3 in LHCI.

  let status = await runChildCommand('collect', args).status
  if (status !== 0) {
    throw new Error(`LHCI 'collect' has encountered a problem.`)
  }
  core.endGroup() // Collecting

  /*******************************ASSERTING************************************/
  if (input.budgetPath || input.rcAssert) {
    core.startGroup(`Asserting`)
    args = []

    if (input.budgetPath) {
      args.push(`--budgetsFile=${input.budgetPath}`)
    } else {
      // @ts-ignore checked this already
      args.push(`--rc-file=${input.rcFile}`)
    }

    status = await runChildCommand('assert', args).status

    if (status !== 0) {
      // TODO(exterkamp): Output what urls failed and record a nice rich error.
      core.setFailed(`Assertions have failed.`)
      // continue
    }
    core.endGroup() // Asserting
  }
  /*******************************UPLOADING************************************/
  if ((input.lhciServer && input.apiToken) || input.canUpload) {
    core.startGroup(`Uploading`)
    args = []

    if (input.lhciServer) {
      args.push('--target=lhci', `--serverBaseUrl=${input.lhciServer}`, `--token=${input.apiToken}`)
    } else {
      args.push('--target=temporary-public-storage')
    }

    status = await runChildCommand('upload', args).status

    if (status !== 0) {
      throw new Error(`LHCI 'upload' has encountered a problem.`)
    }
    core.endGroup() // Uploading
  }
}

// run `main()`
main()
  .catch(
    /** @param {Error} err */ err => {
      core.setFailed(err.message)
    }
  )
  .then(() => {
    console.log(`done in ${process.uptime()}s`)
  })

/**
 * Run a child command synchronously.
 *
 * @param {'collect'|'assert'|'upload'} command
 * @param {string[]} [args]
 * @return {{status: number}}
 */
function runChildCommand(command, args = []) {
  return {status:command == 'collect' ? 0 : 1}
  const combinedArgs = [lhciCliPath, command, ...args]
  const { status = -1 } = childProcess.spawnSync(process.argv[0], combinedArgs, {
    stdio: 'inherit'
  })

  process.stdout.write('\n')
  return { status: status || 0 }
}
