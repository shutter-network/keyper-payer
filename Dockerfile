FROM node:20-alpine

COPY src /app
WORKDIR /app

RUN yarn install
RUN yarn hardhat compile --force
HEALTHCHECK --interval=1h --timeout=10s --start-period=5s --retries=3 CMD [ "dotenv", "yarn", "run", "monitor" ]
CMD ["tail", "-f", "/dev/null"]
