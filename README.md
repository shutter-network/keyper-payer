# Keyper Payer

This project enables keypers to accept payment for their service in SPT. It consists of a smart contract and a corresponding monitoring script. By deploying and configuring the contract, the keypers communicate the price in SPT per second they want to be paid. The keypers run the monitoring script on their machines. If it detects that the keyeprs have been insufficiently paid, it shuts down the node.

## Requirements

- Nodejs
- Docker

## Deploying the Contract

1. Create an `.env` file in the `/src/` directory based on `/src/.env.template`.
2. Set the following variables:

- `RPC_URL`: The URL of an Ethereum JSON RPC server to connect to
- `PRIV_KEY`: The private key of the deployer account
- `TOKEN_ADDRESS`: The address of the SPT token contract used for payments
- `KEYPER_ADDRESSES`: The set of addresses that will be able to withdraw the payments
- `REQUESTED_RATE`: The number of SPT tokens per second the keypers shall be paid (in total, not per keyper)
- `START_TIMESTAMP`: The Unix timestamp from which on the keypers shall be paid

3. Run `yarn install` in the `/src/` directory to install the dependencies.
4. Run `yarn run deploy` in the `/src/` directory to deploy the contract. It will output the address.

## Running the Monitoring Script

The monitoring script will check if the keypers have been sufficiently paid given the contract parameters (`START_TIMESTAMP` and `REQUESTED_RATE`) and the current time. If so, the script will exit successfully. If not, the script will exit with an error code and, optionally, run a given command. Keypers can use this to shut down there node in the event of non-payment.

### Standalone

1. Create an `.env` file in the `/src/` directory based on `/src/.env.template`.
2. Set the following variables:

- `RPC_URL`: The URL of an Ethereum JSON RPC server to connect to
- `CONTRACT_ADDRESS`: The address of the payment contract
- `UNPAID_COMMAND`: A command to run in the event the keypers have not been sufficiently paid (optional)

3. Run `yarn run monitor` in the `/src/` directory.

### As a Keyper

If payment has been negotiated and the corresponding contract has been deployed, Shutter keypers should run the monitoring script and configure it such that it stops their node in the absence of payment. Assuming a `docker compose` setup is used, here's a way to do it:

1. Build the docker image: `docker build . -t keyper-payment-monitor`.
2. Add the following service to the `services` section of your docker compose configuration:

```
keyper-payment-monitor:
  image: keyper-payment-monitor
  restart: always
  environment:
    RPC_URL: <Ethereum node JSON RPC URL>
    CONTRACT_ADDRESS: <address of the payment contract>
    UNPAID_COMMAND: docker stop keyper
  volumes:
    - "/var/run/docker.sock:/var/run/docker.sock"
```

Note that keyper payment monitor needs access to the `docker.sock` file on the host in order to shutdown the keyper service. Future versions of the keyper will enable shutting it down via HTTP.

3. Make the keyper depend on the `keyper-payment-monitor` being healthy:

```
keyper:
  <...>
  depends_on:
    keyper-payment-monitor:
      condition: service_healthy
```

This prevents the keyper from restarting when it is shutdown by the monitor as the latter stays _unealthy_ as long as payment does not resume.

## Run the Tests

To run unit and integration tests, run `yarn run tests` in `/src/`.

## Pay and Withdraw

1. Make an allowance to the keyper payer contract at `address` by calling `approve(address, amount)` on the SPT token contract, where `amount` is the amount to pay.
2. Call `pay(amount)` on the keyper payer contract.

Validators can check their balance with `balanceOf` and withdraw their share by calling `withdraw()`.
