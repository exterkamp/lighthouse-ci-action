'use strict';

const core = require('@actions/core')
const { readFileSync } = require('fs')

function getArgs() {
  /** @type {{urls: string[], canUpload: boolean, budgetPath?: string, numberOfRuns?: number, lhciServer?: string, apiToken?: string, rcFile?: { path: string, hasCollect: boolean, hasAssert: boolean}}} */
  const args = {
    urls: getUrls(),
    canUpload: canUpload(),
  }

  // Add optional args
  if (!!getBudgetPath()) {
    args.budgetPath = getBudgetPath()
  }

  if (!!getNumberOfRuns()) {
    args.numberOfRuns = getNumberOfRuns()
  }

  // Must have LHCI and API token
  if (!!getLhciServer() != !!getApiToken()) {
      // Fail and exit
      core.setFailed(`Need both an LHCI address and API token`)
      process.exit(1)
  }

  if (!!getLhciServer()) {
    args.lhciServer = getLhciServer()
  }

  if (!!getApiToken()) {
    args.apiToken = getApiToken()
  }

  if (!!getRcFile()) {
    const contents = readFileSync(getRcFile(), 'utf8')
    const rcFile = JSON.parse(contents)
    if (!('ci' in rcFile)) {
      // Fail and exit
      core.setFailed(`rc-file missing top level 'ci' property`)
      process.exit(1)
    }

    args.rcFile = {
      path: getRcFile(),
      hasCollect: 'collect' in rcFile.ci,
      hasAssert: 'assert' in rcFile.ci,
    }

  }

  return args
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
 * @return {string}
 */
function getBudgetPath() {
  const budgetPath = core.getInput('budget_path')
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
 * Get the number of runs.
 * Note: github-actions sends a default of 3.
 *
 * @return {number}
 */

function getNumberOfRuns() {
  return parseInt(core.getInput('runs'))
}

/**
 * Get the address of the LH CI server to upload LHRs to.
 *
 * @return {string}
 */
function getLhciServer() {
  return core.getInput('lhci_server')
}

/**
 * Get the API Token to use to upload LHRs to the LH CI server.
 *
 * @return {string}
 */
function getApiToken() {
  return core.getInput('api_token')
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

module.exports = {getArgs}