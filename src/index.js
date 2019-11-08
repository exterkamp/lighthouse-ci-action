const { mapKeys } = require('lodash')
const core = require('@actions/core')
// @ts-ignore
const collectCmd = require('@lhci/cli/src/collect/collect.js')
// @ts-ignore
const uploadCmd = require('@lhci/cli/src/upload/upload.js')
// @ts-ignore
const assertCmd = require('@lhci/cli/src/assert/assert.js')
const { join } = require('path')
const childProcess = require('child_process');

const lhciCliPath = require.resolve('@lhci/cli/src/cli.js');

// audit urls with Lighthouse CI
async function main() {
  const urls = getUrls()
  const numberOfRuns = getRuns()
  const baseConfig = getConfig()
  const baseSettings = baseConfig.settings || {}
  const config = {
    ...baseConfig,
    settings: {
      ...baseSettings,
      throttlingMethod: core.getInput('throttlingMethod') || baseSettings.throttlingMethod || 'simulate',
      onlyCategories: getOnlyCategories() || baseSettings.onlyCategories,
      extraHeaders: getExtraHeaders() || baseSettings.extraHeaders
    }
  }
  const ciSettings = {
    chromeFlags: getChromeFlags().join(' '),
    config,
    settings: {
      logLevel: 'info'
    }
  }
  core.startGroup('Lighthouse config')
  console.log('urls: %s', urls)
  console.log('config: %s', JSON.stringify(config, null, '  '))
  console.log('ci settings: %s', JSON.stringify(ciSettings, null, '  '))
  core.endGroup()



  childProcess.spawnSync(process.argv[0], ['-e', 'console.error("HELLLLOO")'], {
    // process.argv[0],
    stdio: 'inherit'});
    //combinedArgs});
  process.stdout.write('\n');
  process.exit(0);

  for (const url of urls) {
    core.startGroup(`Start ci ${url}`)
    // Collect
    // const collectStatus = runChildCommand('collect', [...defaultFlags, ...collectArgs]).status;
    const args = ['']
    const combinedArgs = [lhciCliPath, 'collect', ...args];
    console.log({combinedArgs})
    
    const {status = -1} = childProcess.spawnSync(process.argv[0], combinedArgs, {
      // process.argv[0],
      stdio: 'inherit'});
      //combinedArgs});
    process.stdout.write('\n');
    if (status !== 0) continue


    // await collectCmd.runCommand({
    //   numberOfRuns,
    //   url,
    //   method: 'node',
    //   // additive: 'true',
    //   settings: ciSettings
    // })
    // // Assert!
    // // TODO(exterkamp): assertCmd
    // // Assert against a budget
    // await assertCmd.runCommand({budgetsFile: getBudgets()})

    // Upload!
    core.startGroup(`Uploading LHRs`)

    let uploadSettings = {}
    if (getLhciServer()) {
      uploadSettings = {
        target: 'lhci',
        serverBaseUrl: getLhciServer(),
        token: getApiToken(),
        // TODO(exterkamp): this is a default arg...
        urlReplacementPatterns: [
          's#:[0-9]{3,5}/#:PORT/#', // replace ports
          's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/UUID/ig' // replace UUIDs
        ]
      }
    // else artifacts?
    } else {
      uploadSettings = { target: 'temporary-public-storage' }
    }
    await uploadCmd.runCommand(uploadSettings)
    core.endGroup()

    core.startGroup(`End ci ${url}`)
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

/** @return {object} */
function getConfig() {
  const configPath = core.getInput('configPath')
  if (configPath) return require(join(process.cwd(), configPath))
  return {
    extends: 'lighthouse:default',
    settings: {}
  }
}

/** @return {string[] | null} */
function getOnlyCategories() {
  const onlyCategories = core.getInput('onlyCategories')
  if (!onlyCategories) return null
  return onlyCategories.split(',').map(category => category.trim())
}

/** @return {string | null} */
function getBudgets() {
  const budgetPath = core.getInput('budgetPath')
  if (!budgetPath) return null
  return budgetPath
}

/** @return {object | null} */
function getExtraHeaders() {
  const extraHeaders = core.getInput('extraHeaders')
  if (!extraHeaders) return null
  try {
    return mapKeys(
      JSON.parse(extraHeaders || '{}'),
      /** @param {string} _val @param {string} key */ (_val, key) => key.toLowerCase()
    )
  } catch (err) {
    console.error('Error at parsing extra headers:')
    console.error(err)
    return {}
  }
}

/**
 * Parse flags: https://github.com/GoogleChrome/chrome-launcher/blob/master/docs/chrome-flags-for-tools.md
 * @return {string[]}
 */

function getChromeFlags() {
  // TODO(exterkamp): are these good defaults?
  const flags = ['--headless', '--disable-gpu', '--no-sandbox', '--no-zygote']
  const chromeFlags = core.getInput('chromeFlags')
  if (chromeFlags) flags.push(...chromeFlags.split(' '))
  return flags
}
