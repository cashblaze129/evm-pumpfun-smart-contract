const { ethers } = require("hardhat");

async function main() {
  console.log("PumpFun Example Usage");
  console.log("====================");

  // Get signers
  const [owner, creator, buyer1, buyer2] = await ethers.getSigners();
  console.log("Owner:", owner.address);
  console.log("Creator:", creator.address);
  console.log("Buyer1:", buyer1.address);
  console.log("Buyer2:", buyer2.address);

  // Deploy PumpFun contract
  console.log("\n1. Deploying PumpFun contract...");
  const PumpFun = await ethers.getContractFactory("PumpFun");
  const pumpFun = await PumpFun.deploy();
  await pumpFun.waitForDeployment();
  const pumpFunAddress = await pumpFun.getAddress();
  console.log("PumpFun deployed to:", pumpFunAddress);

  // Create a new token
  console.log("\n2. Creating a new token...");
  const tokenName = "Example Token";
  const tokenSymbol = "EXAMPLE";
  const initialSupply = ethers.parseEther("1000000"); // 1M tokens
  const metadataURI = "https://example.com/metadata.json";

  const createTx = await pumpFun.connect(creator).createToken(
    tokenName,
    tokenSymbol,
    initialSupply,
    metadataURI
  );
  const createReceipt = await createTx.wait();
  
  const tokenCreatedEvent = createReceipt.logs.find(
    log => log.fragment && log.fragment.name === "TokenCreated"
  );
  const tokenAddress = tokenCreatedEvent.args.tokenAddress;
  console.log("Token created at:", tokenAddress);

  // Get token info
  console.log("\n3. Getting token information...");
  const tokenInfo = await pumpFun.getTokenInfo(tokenAddress);
  console.log("Token Info:");
  console.log("- Creator:", tokenInfo.creator);
  console.log("- Total Supply:", ethers.formatEther(tokenInfo.totalSupply));
  console.log("- Is Active:", tokenInfo.isActive);
  console.log("- Metadata URI:", tokenInfo.metadataURI);

  // Get initial token price
  console.log("\n4. Getting initial token price...");
  const initialPrice = await pumpFun.getTokenPrice(tokenAddress);
  console.log("Initial token price:", ethers.formatEther(initialPrice), "ETH per token");

  // Buyer 1 buys tokens
  console.log("\n5. Buyer 1 buying tokens...");
  const buyAmount1 = ethers.parseEther("1"); // 1 ETH
  const buyTx1 = await pumpFun.connect(buyer1).buyTokens(tokenAddress, {
    value: buyAmount1
  });
  const buyReceipt1 = await buyTx1.wait();
  
  const tokensBoughtEvent1 = buyReceipt1.logs.find(
    log => log.fragment && log.fragment.name === "TokensBought"
  );
  const tokensReceived1 = tokensBoughtEvent1.args.tokenAmount;
  console.log("Buyer 1 received:", ethers.formatEther(tokensReceived1), "tokens");
  console.log("Buyer 1 paid:", ethers.formatEther(buyAmount1), "ETH");

  // Get new token price
  const priceAfterBuy1 = await pumpFun.getTokenPrice(tokenAddress);
  console.log("Token price after buy 1:", ethers.formatEther(priceAfterBuy1), "ETH per token");

  // Buyer 2 buys tokens
  console.log("\n6. Buyer 2 buying tokens...");
  const buyAmount2 = ethers.parseEther("2"); // 2 ETH
  const buyTx2 = await pumpFun.connect(buyer2).buyTokens(tokenAddress, {
    value: buyAmount2
  });
  const buyReceipt2 = await buyTx2.wait();
  
  const tokensBoughtEvent2 = buyReceipt2.logs.find(
    log => log.fragment && log.fragment.name === "TokensBought"
  );
  const tokensReceived2 = tokensBoughtEvent2.args.tokenAmount;
  console.log("Buyer 2 received:", ethers.formatEther(tokensReceived2), "tokens");
  console.log("Buyer 2 paid:", ethers.formatEther(buyAmount2), "ETH");

  // Get new token price
  const priceAfterBuy2 = await pumpFun.getTokenPrice(tokenAddress);
  console.log("Token price after buy 2:", ethers.formatEther(priceAfterBuy2), "ETH per token");

  // Buyer 1 sells some tokens
  console.log("\n7. Buyer 1 selling some tokens...");
  const sellAmount = tokensReceived1 / 2n; // Sell half
  const sellTx = await pumpFun.connect(buyer1).sellTokens(tokenAddress, sellAmount);
  const sellReceipt = await sellTx.wait();
  
  const tokensSoldEvent = sellReceipt.logs.find(
    log => log.fragment && log.fragment.name === "TokensSold"
  );
  const ethReceived = tokensSoldEvent.args.ethAmount;
  console.log("Buyer 1 sold:", ethers.formatEther(sellAmount), "tokens");
  console.log("Buyer 1 received:", ethers.formatEther(ethReceived), "ETH");

  // Get final token price
  const finalPrice = await pumpFun.getTokenPrice(tokenAddress);
  console.log("Final token price:", ethers.formatEther(finalPrice), "ETH per token");

  // Get updated token info
  console.log("\n8. Getting updated token information...");
  const updatedTokenInfo = await pumpFun.getTokenInfo(tokenAddress);
  console.log("Updated Token Info:");
  console.log("- Real ETH Reserves:", ethers.formatEther(updatedTokenInfo.realEthReserves));
  console.log("- Real Token Reserves:", ethers.formatEther(updatedTokenInfo.realTokenReserves));
  console.log("- Virtual ETH Reserves:", ethers.formatEther(updatedTokenInfo.virtualEthReserves));
  console.log("- Virtual Token Reserves:", ethers.formatEther(updatedTokenInfo.virtualTokenReserves));

  // Get creator's tokens
  console.log("\n9. Getting creator's tokens...");
  const creatorTokens = await pumpFun.getCreatorTokens(creator.address);
  console.log("Creator has", creatorTokens.length, "tokens");
  creatorTokens.forEach((token, index) => {
    console.log(`- Token ${index + 1}:`, token);
  });

  console.log("\nExample completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
