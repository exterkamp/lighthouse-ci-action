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
            text: `${getGauge(category.score)}`,
            width: 5,
            align: 'right',
            padding: [0, 1, 0, 0]
          },
          {
            text: `${category.title}:`,
            width: 25,
          },
          {
            text: scoreFunc(`${category.score}`),
          }
        )
        if (category.id === 'performance') {
          perfRow(lhr, ui, 'first-contentful-paint', 'first-meaningful-paint')
          perfRow(lhr, ui, 'speed-index', 'first-cpu-idle')
          perfRow(lhr, ui, 'interactive', 'max-potential-fid')
        } else if (category.id === 'pwa') {
          pwaGroups(lhr, ui)
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

function getGauge(score) {
  // ◔ ◗ ◕ ●
  if (score === 1) {
    return '●'
  } else if (score >= 0.75) {
    return '◕'
  } else if (score >= 0.5) {
    return '◗'
  }
  return '◔'
}

function getScoreCharacter(score) {
  if (score >= 0.9) {
    return `${log.greenify('●')}`
  } else if (score >= 0.5) {
    return `${log.yellow}■${log.reset}`
  }
  return `${log.redify('▲')}`
}

function colorScore(score, displayValue) {
  if (score >= 0.9) {
    return `${log.greenify(displayValue)}`
  } else if (score >= 0.5) {
    return `${log.yellow}${displayValue}${log.reset}`
  }
  return `${log.redify(displayValue)}`
}

function perfRow(lhr, ui, metric1, metric2) {
  ui.div(
    {
      text: '',
      width: 10
    },
    {
      text: `${getScoreCharacter(lhr.audits[metric1].score)}`,
      padding: [0,1,0,0],
      width: 2
    },
    {
      text: `${lhr.audits[metric1].title}:`,
      width: 25,
    },
    {
      text: colorScore(`${lhr.audits[metric1].score}`, `${lhr.audits[metric1].displayValue}`),
      width: 9,
      padding: [0,0,0,1]
    },
    {
      text: '',
      width: 2
    },
    {
      text: `${getScoreCharacter(lhr.audits[metric2].score)}`,
      padding: [0,1,0,0],
      width: 2
    },
    {
      text: `${lhr.audits[metric2].title}:`,
      width: 32,
    },
    {
      text: colorScore(`${lhr.audits[metric2].score}`, `${lhr.audits[metric2].displayValue}`),
      width: 9,
      padding: [0,0,0,1]
    }
  )
}

function pwaRow(ui, icon, lhr, groupId) {
  const audits = lhr.categories['pwa'].auditRefs.filter(audit => audit.group === groupId).map(audit => audit.id)
  let pass = true
  audits.forEach(auditId => {
    if (lhr.audits[auditId].score < 1) {
      pass = false
    }
  })
  let colorFunc = function (str) {return log.redify(str)}
  if (pass) {
    colorFunc = function (str) { return log.greenify(str)}
  }
  ui.div(
    {
      text: '',
      width: 10
    },
    {
      text: `${colorFunc(icon)}`,
      width: 2,
      padding: [0,1,0,0]
    },
    {
      text: `${colorFunc(lhr.categoryGroups[groupId].title)}`,
      width: 25
    },
  )
}

function pwaGroups(lhr, ui) {
  // ⊘ pwa-fast-reliable 
  // ⊕ pwa-installable
  // ✪ pwa-optimized

  pwaRow(ui, '⧁'/** ⎉ ⟴ ⧁ ⊘ */, lhr, 'pwa-fast-reliable')
  pwaRow(ui, '⊕', lhr, 'pwa-installable')
  pwaRow(ui, '✪', lhr, 'pwa-optimized')
}

module.exports = {logSummary}
