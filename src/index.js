const { mapKeys } = require('lodash')
const core = require('@actions/core');
const collectCmd = require('@lhci/cli/src/collect/collect.js');
const { join } = require('path')

// audit urls with Lighthouse CI
async function main() {
  const urls = getUrls()
  const numberOfRuns = getRuns();
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
      logLevel: 'info',
    },
  };
  core.startGroup('Lighthouse config')
  console.log('urls: %s', urls)
  console.log('config: %s', JSON.stringify(config, null, '  '))
  console.log('ci settings: %s', JSON.stringify(ciSettings, null, '  '));
  core.endGroup()

  for (const url of urls) {
    core.startGroup(`Start ci ${url}`);
    await collectCmd.runCommand({
      numberOfRuns, 
      url,
      method: 'node',
      additive: 'true',
      settings: ciSettings});
    core.startGroup(`End ci ${url}`);
  }

  core.setOutput('resultsPath', '.lighthouseci')
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
 * Get urls from `url` or `urls`
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
  const numberOfRuns = parseInt(core.getInput('runs') || '3');
  return numberOfRuns;
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
