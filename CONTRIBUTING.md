# How to Contribute

First of all, thank you for your interest in `treosh/lighthouse-ci-action`!
We'd love to accept your patches and contributions!

### Setup

```bash
# install deps
yarn install

# ensure all tests pass
yarn test
```

### Local testing

```bash
# run locally, use INPUT_* notation to pass arguments
INPUT_URLS="https://example.com/" node src/index.js

# run many urls
INPUT_URLS="https://alekseykulikov.com/
 https://alekseykulikov.com/blog" node src/index.js

# run with extra inputs
INPUT_URLS="https://example.com/" node src/index.js

# fail with budget
INPUT_URLS="https://alekseykulikov.com/" INPUT_BUDGET_PATH=".github/lighthouse/budget.json" INPUT_RUNS="1" node src/index.js

# fail with assertions
INPUT_URLS="https://alekseykulikov.com/" INPUT_RC_FILE_PATH=".github/lighthouse/rc_file_assertions_only.json" INPUT_RUNS="1" node src/index.js

# run with custom config
INPUT_URLS="https://alekseykulikov.com/" INPUT_RC_FILE_PATH=".github/lighthouse/rc_file_collection_only.json" INPUT_RUNS="1" node src/index.js

# debug custom headers
python script/simple-server.py # start basic server in a separate tab
INPUT_URLS="https://alekseykulikov.com/" INPUT_RC_FILE_PATH=".github/lighthouse/rc_file_collection_only.json" INPUT_RUNS="1" node src/index.js # run and see headers output
```
