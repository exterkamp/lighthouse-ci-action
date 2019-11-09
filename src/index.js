const core = require('@actions/core')
const childProcess = require('child_process')
const lhciCliPath = require.resolve('@lhci/cli/src/cli.js')
const { getArgs } = require('./input_parser.js')

// audit urls with Lighthouse CI
async function main() {
  const input = getArgs()

  core.startGroup('Action config')
  console.log('Input args: ', input)
  core.endGroup()

  /** @type {string[]} */
  const failedUrls = []

  core.startGroup(`Running ci on: ${input.urls}`)
  for (const url of input.urls) {
    core.startGroup(`Start ci ${url}`)
    core.startGroup(`Collecting`)
    let args = [`--url=${url}`]

    if (input.rcCollect) {
      args.push(`--rc-file=${input.rcFile}`)
      // This should only happen in local testing, when the default is not sent
    } else if (input.numberOfRuns) {
      args.push(`--numberOfRuns=${input.numberOfRuns}`)
    }
    // else, no args and will default to 3 in LHCI.

    let status = await runChildCommand('collect', args).status
    if (status !== 0) {
      core.error(`LHCI 'collect' has encountered a problem.`)
      continue
    }
    core.endGroup()

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
        failedUrls.push(url)
      }
      core.endGroup()
    }

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
