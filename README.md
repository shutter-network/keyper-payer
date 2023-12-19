# Keyper Payer

This project is to provide a way to keypers to get paid using SPT token.

## Requirements

-   Nodejs
-   Docker

## Deploying contract

1. Create .env file on src using src/.env.template.
2. RPC_URL, PRIV_KEY and TOKEN_ADDRESS should be filled.
3. Use yarn install to install dependencies.
4. Use yarn run deploy

## Running monitor script

1. Fill CONTRACT_ADDRESS, RPC_URL, KEYPER_ADDRESS in .env file.
2. Use yarn run monitor

### For docker image

-   Put your .env file to /app folder with volume.

## Running tests

-   Run yarn run tests to test scripts
