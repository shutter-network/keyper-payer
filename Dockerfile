FROM node:20-alpine

COPY src /app
WORKDIR /app

RUN apk add docker curl

RUN yarn install
RUN yarn hardhat compile --force
HEALTHCHECK --interval=10s --timeout=60s --start-period=5s --retries=1 CMD [ "yarn", "run", "monitor" ]
CMD ["tail", "-f", "/dev/null"]
