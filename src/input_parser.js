const core = require('@actions/core')
const { readFileSync } = require('fs')

function getArgs() {
  // Make sure we don't have LHCI xor API token
  const lhciServer = getArg('lhci_server')
  const apiToken = getArg('api_token')
  if (!!lhciServer != !!apiToken) {
    // Fail and exit
    core.setFailed(`Need both an LHCI address and API token`)
    process.exit(1)
  }

  let rcCollect = false
  let rcAssert = false
  // Inspect lighthouserc file for malformations
  const rcFile = getArg('rc_file_path')
  if (rcFile) {
    const contents = readFileSync(rcFile, 'utf8')
    const rcFileObj = JSON.parse(contents)
    if (!('ci' in rcFileObj)) {
      // Fail and exit
      core.setFailed(`rc-file missing top level 'ci' property`)
      process.exit(1)
    }
    rcCollect = 'collect' in rcFileObj.ci
    rcAssert = 'assert' in rcFileObj.ci
  }

  return {
    urls: core
      .getInput('urls')
      .split('\n')
      .map(url => url.trim()),
    canUpload: getArg('no_upload'),
    budgetPath: getArg('budget_path'),
    numberOfRuns: getIntArg('runs'),
    lhciServer,
    apiToken,
    rcCollect,
    rcAssert,
    rcFile
  }
}

/**
 * Wrapper for core.getInput.
 *
 * @param {string} arg
 * @return {string | undefined}
 */
function getArg(arg) {
  return core.getInput(arg) || undefined
}

/**
 * Wrapper for core.getInput for a numeric input.
 *
 * @param {string} arg
 * @return {number | undefined}
 */
function getIntArg(arg) {
  return parseInt(core.getInput(arg)) || undefined
}

module.exports = { getArgs }
