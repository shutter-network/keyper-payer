import * as child from "child_process";

function startTests() {
  const unitTests = child.spawnSync("yarn run unit-tests", {
    cwd: process.cwd(),
    shell: true,
    env: process.env,
  });
  console.log(unitTests.stdout.toString());
  const integrationTests = child.spawnSync("yarn run integration-tests", {
    cwd: process.cwd(),
    shell: true,
    env: process.env,
  });
  console.log(integrationTests.stdout.toString());
  const unitTestsCode = unitTests.stderr.toString() == "" ? 0 : 1;
  const integrationTestsCode = integrationTests.stderr.toString() == "" ? 0 : 1;
  return unitTestsCode | integrationTestsCode;
}

async function main() {
  const node = child.spawn("yarn run node", {
    shell: true,
    cwd: process.cwd(),
    env: process.env,
  });
  const readyMsg = "Any funds sent to them on Mainnet or any other live network WILL BE LOST.";
  node.stdout.setEncoding("utf-8");
  let testsStarted = false;
  node.stdout.on("data", async (data) => {
    if (data.includes(readyMsg) && !testsStarted) {
      console.log("node is ready");
      testsStarted = true;
      const status = startTests();
      node.kill();
      process.exit(status);
    }
  });
  node.stderr.setEncoding("utf-8");
  node.stderr.on("error", (err) => {
    if (err) {
      console.log(err);
      throw "stop node first";
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
