const { readdirSync, readFileSync } = require('fs')
const path = require('path')
const core = require('@actions/core')
const ui = require('cliui')()
const log = require('lighthouse-logger')

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
        let scoreFunc = log.redify
        if (category.score >= 0.9) {
          scoreFunc = log.greenify
        } else if (category.score >= 0.5) {
          scoreFunc = function (/** @type {string} */str) {
            return `${log.yellow}${str}${log.reset}`
          }
        }
        ui.div(
          {
            text: '',
            width: 5
          },
          {
            text: `${category.title}:`,
            width: 25,
          },
          {
            text: scoreFunc(`${category.score}`),
          }
        )
        if (category.title === 'Performance') {
          const metrics = lhr.audits.metrics
          const metricCallouts = ['firstContentfulPaint',
            'firstMeaningfulPaint',
            'interactive',
            'speedIndex',
            'totalBlockingTime',
            'firstCPUIdle']
          
          metricCallouts.forEach(callout => {
            ui.div(
              {
                text: '',
                width: 10
              },
              {
                text: `${callout}:`,
                width: 25,
              },
              {
                text: scoreFunc(`${metrics.details.items[0][callout]}`),
                width: 6
              },
              {
                text: `${scoreFunc('ms')}`
              }
            )
          })
        }
      }
      console.log(ui.toString())
      ui.resetOutput()
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

module.exports = {logSummary}
