const { readdirSync, readFileSync } = require('fs')
const path = require('path')
const core = require('@actions/core')

/**
 * Log a high level summary of an LHR.
 *
 * @param {string} resultsPath
 */
function logSummary(resultsPath) {
  core.startGroup('Summary')

  const files = readdirSync(path.join(__dirname, resultsPath))

  /** @type {string[]} */
  const seen = []
  var lhrRegex = /lhr-\d+.json/g
  files
    .filter(file => file.match(lhrRegex))
    .forEach(filePath => {
      const file = readFileSync(path.join(__dirname, resultsPath + filePath))
      // @ts-ignore
      const lhr = JSON.parse(file, 'utf-8')

      if (seen.includes(lhr.finalUrl)) {
        return
      } else {
        seen.push(lhr.finalUrl)
      }

      console.log(lhr.finalUrl)
      for (const key in lhr.categories) {
        const category = lhr.categories[key]
        console.log('\t' + category.title + ':' + buffer(category.title, 25) + category.score)
      }
    })
  core.endGroup()
}

/**
 * Get a fixed width buffer based on some prefix text.
 *
 * @param {string} msg
 * @param {number} length
 */
function buffer(msg, length) {
  let ret = ''

  if (length === undefined) {
    length = 25
  }

  length = length - msg.length - 1

  if (length > 0) {
    ret = ' '.repeat(length)
  }

  return ret
}

module.exports = logSummary
