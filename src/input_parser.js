'use strict';

const core = require('@actions/core')
const { readFileSync } = require('fs')

function getArgs() {
  // Make sure we don't have LHCI xor API token
  const lhciServer = core.getInput('lhci_server') || undefined
  const apiToken = core.getInput('api_token') || undefined
  if (!!lhciServer != !!apiToken) {
    // Fail and exit
    core.setFailed(`Need both an LHCI address and API token`)
    process.exit(1)
}

  let rcCollect = false;
  let rcAssert = false;
  // Inspect lighthouserc file for malformations
  const rcFile = core.getInput('rc_file_path') || undefined
  if (!!rcFile) {
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
    urls: core.getInput('urls').split('\n').map(url => url.trim()),
    canUpload: core.getInput('no_upload') == '',
    budgetPath: core.getInput('budget_path') || undefined,
    numberOfRuns: parseInt(core.getInput('runs')) || undefined,
    lhciServer,
    apiToken,
    rcCollect,
    rcAssert,
    rcFile,
  }
}

module.exports = {getArgs}