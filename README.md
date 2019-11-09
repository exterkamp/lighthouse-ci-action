# Lighthouse CI Action

<!-- TODO(exterkamp): rename `<<NAME@v1>>` to the action name -->

> Run Lighthouse in CI using Github Actions.

<img align="center" width="998" alt="Lighthouse CI Action" src="https://user-images.githubusercontent.com/6392995/68516729-abfb8380-0239-11ea-8972-d2d5d4a5f3fb.png">

Audit URLs using [Lighthouse](https://developers.google.com/web/tools/lighthouse),
and monitor performance with [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci).

**Features**:

- ✅ Audit URLs using Lighthouse
- 🎯 Test performance with LHCI assertions
- 💵 Test performance with Lighthouse budgets
- ⚙️ Full control over Lighthouse config
- 🔍 Detailed output for quick debug
- 💾 Upload data to LHCI server
- 🚀 Fast action initialization

## Usage

### Basic Action

> Use Case: Run Lighthouse on each push to the repo and save the results in action artifacts.

Create `.github/workflows/main.yml` with the list of URLs to audit using lighthouse.
The results will be stored as a build artifact.

#### main.yml

```yml
name: Lighthouse Audit
on: push
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Audit URLs using Lighthouse
        uses: <<NAME@v1>>
        with:
          urls: 'https://example.com/'
          runs: 1
      # Note: Lighthouse-ci-actions overwrite .lighthouseci/ each run, therefore
      # artifacts need to be saved after each run if using gh-actions artifacts.
      - name: Save results
        uses: actions/upload-artifact@v1
        with:
          name: lighthouse-results
          path: '.lighthouseci'
```

> Note: By default this action will also store the reports to LHCI
> `temporary-public-storage` when a `lhci_server` is not specified, in order to
> opt out, send the `no_upload` parameter.

## Inputs

### `urls` (required)

Provide the list of URLs separated by a new line.
Each URL is audited using the latest version of Lighthouse and Chrome preinstalled on user machine.

```yml
urls: |
  https://example.com/
  https://example.com/blog
  https://example.com/pricing
```

### `budget_path`

Use a performance budget to keep your page size in check. `Lighthouse CI Action` will fail the build if one of the URLs exceed the budget.

Learn more about the [budget.json spec](https://github.com/GoogleChrome/budget.json) and [practical use of performance budgets](https://web.dev/use-lighthouse-for-performance-budgets).

```yml
budget_path: .github/lighthouse/budget.json
```

### `rc_file_path`

Set a path to a custom [LHCI rc file](https://github.com/GoogleChrome/lighthouse-ci/blob/master/docs/cli.md#configuration) for a full control of the Lighthouse enviroment.

This `rc_file` can be used to contorl the collection of data (via Lighthouse config, and
Chrome Flags), and CI assertions (via LHCI assertions).

> Note: `rc_files` normally also control the "upload" step. However, this method
> is incompatible with github secrets and would expose all LHCI server addresses
> and tokens; use `lhci_server` and `api_token` parameters instead.

```yml
rc_file_path: ./rc_file.json
```

### `lhci_server`

Specify a [LHCI server](https://github.com/GoogleChrome/lighthouse-ci) to send Lighthouse Results to.

Note: use [Github secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets#creating-encrypted-secrets) to keep your server address hidden!

```yml
lhci_server: ${{ secrets.LHCI_SERVER }}
```

### `api_token`

Specify an API token for the LHCI server.

Note: use [Github secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets#creating-encrypted-secrets) to keep your server address hidden!

```yml
api_token: ${{ secrets.LHCI_API_TOKEN }}
```

### `no_upload`

This will opt-out of the default upload to `temporary-public-storage`.

```yml
no_upload: 'any value'
```

## Advanced Recipes

### Asserting Against Performance budgets.json

> Use Case: Run Lighthouse and validate against a budget.

Create `.github/workflows/main.yml` with the list of URLs to audit
and identify a budget with `budget_path`.

#### main.yml

```yml
name: Lighthouse Audit
on: push
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Audit URLs and Assert
        uses: <<NAME@v1>>
        with:
          urls: 'https://example.com/'
          budget_path: './budgets.json'
```

Make a `budget.json` file with [budgets syntax](https://web.dev/use-lighthouse-for-performance-budgets/).

> Note: Under the hood, this will be transformed into LHCI assertions.

#### budgets.json

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      {
        "resourceType": "document",
        "budget": 18
      },
      {
        "resourceType": "total",
        "budget": 200
      }
    ]
  }
]
```

<img align="center" width="998" alt="Lighthouse CI Action" src="https://user-images.githubusercontent.com/6392995/68516802-ec5b0180-0239-11ea-9c58-d65487494301.png">

### Asserting Against LHCI assertions.json

> Use Case: Run Lighthouse and validate against LHCI assertions.

Create `.github/workflows/main.yml` with the list of URLs to audit
and identify a `rc_file` with `rc_file_path`.

#### main.yml

```yml
name: Lighthouse Audit
on: push
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Audit URLs and Assert
        uses: <<NAME@v1>>
        with:
          urls: 'https://example.com/'
          rc_file_path: './rc_file.json'
```

Make a `rc_file.json` file with [LHCI assertion syntax](https://github.com/GoogleChrome/lighthouse-ci/blob/master/docs/assertions.md).

#### rc_file.json

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "minScore": 0.8 }]
      }
    }
  }
}
```

<img align="center" width="998" alt="Lighthouse CI Action" src="https://user-images.githubusercontent.com/6392995/68517180-5cb65280-023b-11ea-9de1-bc9f980ed03e.png">

### Uploading to a LHCI Server

> Use Case: Providing data to a hosted LHCI server.

Create `.github/workflows/main.yml` with the list of URLs to audit using lighthouse,
and identify a `lhci_server` to upload to and an `api_token` to use.

Note: use [Github secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets#creating-encrypted-secrets) to keep your server address hidden!

#### main.yml

```yml
name: Lighthouse Audit
on: push
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Audit URLs using Lighthouse
        uses: <<NAME@v1>>
        with:
          urls: 'https://example.com/'
          lhci_server: ${{ secrets.LHCI_SERVER }}
          api_token: ${{ secrets.LHCI_API_TOKEN }}
          runs: 1
```

<img align="center" width="998" alt="Lighthouse CI Action" src="https://user-images.githubusercontent.com/6392995/68517237-938c6880-023b-11ea-958f-acd122406057.png">

### Using Custom Config & Chrome Flags

> Use Case: Running Lighthouse with highly custom Lighthouse runtime or custom Chrome flags.

Create `.github/workflows/main.yml` with the list of URLs to audit and
identify a `rc_file` with `rc_file_path`.

#### main.yml

```yml
name: Lighthouse Audit
on: push
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Audit URLs and Assert
        uses: <<NAME@v1>>
        with:
          urls: 'https://example.com/'
          rc_file_path: './rc_file.json'
```

Chrome flags can be set directly in the `rc-file`'s `collect` section.

#### rc_file.json

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 1,
      "settings": {
        "chromeFlags": ["--disable-gpu", "--no-sandbox", "--no-zygote"]
      }
    }
  }
}
```

Custom Lighthouse config can be defined in a seperate Lighthouse config using
the [custom Lighthouse config syntax](https://github.com/GoogleChrome/lighthouse/blob/master/docs/configuration.md).
This is then referenced by the `rc_file` in the `configPath`.

#### rc_file.json

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 1,
      "settings": {
        "configPath": "./lighthouse-config.js"
      }
    }
  }
}
```

Then put all the custom Lighthouse config in the file referenced in the `rc_file`.

#### lighthouse-config.js

```javascript
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    emulatedFormFactor: 'desktop',
    audits: [{ path: 'metrics/first-contentful-paint', options: { scorePODR: 800, scoreMedian: 1600 } }]
  }
}
```

### Using a Static Dist Dir [![](https://github.com/exterkamp/lighthouse-ci-action/workflows/CI/badge.svg)](https://github.com/treosh/lighthouse-ci-action/actions?workflow=static-dist-dir)

> Use Case: Testing a very basic static site without having to deploy it.

Create `.github/workflows/main.yml` with the path to your static files.

```yml
# This is a run that targets static files using static-dist-dir.
static-dist-dir:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v1
    - name: Use rc-file for Chrome flags and config
      uses: <<NAME@v1>>
      with:
        static_dist_dir: './dist'
        runs: 1
```

Inside your `static_dist_dir` there should be html files that make up your site.
LHCI will run a simple static webserver to host the files, then run an audit
against each of them. More details on this process are in the [Lighthouse CI docs](https://github.com/GoogleChrome/lighthouse-ci/blob/master/docs/getting-started.md#run-lighthouse-ci).

<!-- TODO(exterkamp): add screenshot of running against a localhost. -->

---

## Credits

Sponsored by [Treo.sh - Page speed monitoring made easy](https://treo.sh) and [Google](https://google.com/).

<!-- TODO(exterkamp): change back to main on PR -->

[![](https://github.com/exterkamp/lighthouse-ci-action/workflows/CI/badge.svg)](https://github.com/treosh/lighthouse-ci-action/actions?workflow=CI)
[![](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
