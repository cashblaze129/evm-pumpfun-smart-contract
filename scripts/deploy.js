const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying PumpFun contract...");

  // Get the contract factory
  const PumpFun = await ethers.getContractFactory("PumpFun");

  // Deploy the contract
  const pumpFun = await PumpFun.deploy();

  // Wait for deployment to complete
  await pumpFun.waitForDeployment();

  const pumpFunAddress = await pumpFun.getAddress();
  console.log("PumpFun deployed to:", pumpFunAddress);

  // Verify the contract if on a live network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await pumpFun.deploymentTransaction().wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: pumpFunAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    contractAddress: pumpFunAddress,
    deployer: await pumpFun.owner(),
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  console.log("Deployment completed successfully!");
  console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
