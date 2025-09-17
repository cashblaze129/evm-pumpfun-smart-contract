const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PumpFun", function () {
  let pumpFun;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const PumpFun = await ethers.getContractFactory("PumpFun");
    pumpFun = await PumpFun.deploy();
    await pumpFun.waitForDeployment();
  });

  describe("Token Creation", function () {
    it("Should create a new token successfully", async function () {
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");
      const metadataURI = "https://example.com/metadata";

      const tx = await pumpFun.connect(user1).createToken(
        tokenName,
        tokenSymbol,
        initialSupply,
        metadataURI
      );

      const receipt = await tx.wait();
      const tokenCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );

      expect(tokenCreatedEvent).to.not.be.undefined;
      
      const tokenAddress = tokenCreatedEvent.args.tokenAddress;
      const tokenInfo = await pumpFun.getTokenInfo(tokenAddress);
      
      expect(tokenInfo.creator).to.equal(user1.address);
      expect(tokenInfo.totalSupply).to.equal(initialSupply);
      expect(tokenInfo.isActive).to.be.true;
      expect(tokenInfo.metadataURI).to.equal(metadataURI);
    });

    it("Should fail to create token with zero initial supply", async function () {
      await expect(
        pumpFun.connect(user1).createToken(
          "Test Token",
          "TEST",
          0,
          "https://example.com/metadata"
        )
      ).to.be.revertedWith("Initial supply must be greater than 0");
    });
  });

  describe("Token Buying", function () {
    let tokenAddress;

    beforeEach(async function () {
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");
      const metadataURI = "https://example.com/metadata";

      const tx = await pumpFun.connect(user1).createToken(
        tokenName,
        tokenSymbol,
        initialSupply,
        metadataURI
      );

      const receipt = await tx.wait();
      const tokenCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );
      tokenAddress = tokenCreatedEvent.args.tokenAddress;
    });

    it("Should allow buying tokens with ETH", async function () {
      const ethAmount = ethers.parseEther("1");
      
      const tx = await pumpFun.connect(user2).buyTokens(tokenAddress, {
        value: ethAmount
      });

      const receipt = await tx.wait();
      const tokensBoughtEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokensBought"
      );

      expect(tokensBoughtEvent).to.not.be.undefined;
      expect(tokensBoughtEvent.args.buyer).to.equal(user2.address);
      expect(tokensBoughtEvent.args.ethAmount).to.equal(ethAmount);
      expect(tokensBoughtEvent.args.tokenAmount).to.be.gt(0);
    });

    it("Should fail to buy tokens with zero ETH", async function () {
      await expect(
        pumpFun.connect(user2).buyTokens(tokenAddress, { value: 0 })
      ).to.be.revertedWith("Must send ETH to buy tokens");
    });

    it("Should calculate correct token amount for given ETH", async function () {
      const ethAmount = ethers.parseEther("1");
      
      const tokenInfoBefore = await pumpFun.getTokenInfo(tokenAddress);
      const expectedTokenAmount = await pumpFun.calculateTokenAmount(
        tokenInfoBefore.virtualEthReserves,
        tokenInfoBefore.virtualTokenReserves,
        ethAmount
      );

      await pumpFun.connect(user2).buyTokens(tokenAddress, { value: ethAmount });
      
      const tokenInfoAfter = await pumpFun.getTokenInfo(tokenAddress);
      const actualTokenAmount = tokenInfoBefore.realTokenReserves - tokenInfoAfter.realTokenReserves;
      
      expect(actualTokenAmount).to.equal(expectedTokenAmount);
    });
  });

  describe("Token Selling", function () {
    let tokenAddress;
    let tokenContract;

    beforeEach(async function () {
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");
      const metadataURI = "https://example.com/metadata";

      const tx = await pumpFun.connect(user1).createToken(
        tokenName,
        tokenSymbol,
        initialSupply,
        metadataURI
      );

      const receipt = await tx.wait();
      const tokenCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );
      tokenAddress = tokenCreatedEvent.args.tokenAddress;
      tokenContract = await ethers.getContractAt("PumpFunToken", tokenAddress);

      // Buy some tokens first
      await pumpFun.connect(user2).buyTokens(tokenAddress, {
        value: ethers.parseEther("1")
      });
    });

    it("Should allow selling tokens for ETH", async function () {
      const tokenBalance = await tokenContract.balanceOf(user2.address);
      const tokenAmount = tokenBalance / 2n; // Sell half
      
      const tx = await pumpFun.connect(user2).sellTokens(tokenAddress, tokenAmount);
      const receipt = await tx.wait();
      const tokensSoldEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokensSold"
      );

      expect(tokensSoldEvent).to.not.be.undefined;
      expect(tokensSoldEvent.args.seller).to.equal(user2.address);
      expect(tokensSoldEvent.args.tokenAmount).to.equal(tokenAmount);
      expect(tokensSoldEvent.args.ethAmount).to.be.gt(0);
    });

    it("Should fail to sell zero tokens", async function () {
      await expect(
        pumpFun.connect(user2).sellTokens(tokenAddress, 0)
      ).to.be.revertedWith("Token amount must be greater than 0");
    });

    it("Should fail to sell more tokens than owned", async function () {
      const tokenBalance = await tokenContract.balanceOf(user2.address);
      
      await expect(
        pumpFun.connect(user2).sellTokens(tokenAddress, tokenBalance + 1n)
      ).to.be.revertedWith("Insufficient token balance");
    });
  });

  describe("Price Calculations", function () {
    let tokenAddress;

    beforeEach(async function () {
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");
      const metadataURI = "https://example.com/metadata";

      const tx = await pumpFun.connect(user1).createToken(
        tokenName,
        tokenSymbol,
        initialSupply,
        metadataURI
      );

      const receipt = await tx.wait();
      const tokenCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );
      tokenAddress = tokenCreatedEvent.args.tokenAddress;
    });

    it("Should return correct token price", async function () {
      const price = await pumpFun.getTokenPrice(tokenAddress);
      expect(price).to.be.gt(0);
    });

    it("Should calculate token amount correctly", async function () {
      const ethAmount = ethers.parseEther("1");
      const tokenInfo = await pumpFun.getTokenInfo(tokenAddress);
      
      const tokenAmount = await pumpFun.calculateTokenAmount(
        tokenInfo.virtualEthReserves,
        tokenInfo.virtualTokenReserves,
        ethAmount
      );
      
      expect(tokenAmount).to.be.gt(0);
    });

    it("Should calculate ETH amount correctly", async function () {
      const tokenAmount = ethers.parseEther("1000");
      const tokenInfo = await pumpFun.getTokenInfo(tokenAddress);
      
      const ethAmount = await pumpFun.calculateEthAmount(
        tokenInfo.virtualEthReserves,
        tokenInfo.virtualTokenReserves,
        tokenAmount
      );
      
      expect(ethAmount).to.be.gt(0);
    });
  });

  describe("Access Control", function () {
    it("Should allow only owner to emergency withdraw", async function () {
      await expect(
        pumpFun.connect(user1).emergencyWithdraw()
      ).to.be.revertedWithCustomError(pumpFun, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to emergency withdraw", async function () {
      // Send some ETH to contract
      await user1.sendTransaction({
        to: await pumpFun.getAddress(),
        value: ethers.parseEther("1")
      });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await pumpFun.connect(owner).emergencyWithdraw();
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Creator Tokens", function () {
    it("Should track creator's tokens", async function () {
      const tokenName1 = "Test Token 1";
      const tokenSymbol1 = "TEST1";
      const tokenName2 = "Test Token 2";
      const tokenSymbol2 = "TEST2";
      const initialSupply = ethers.parseEther("1000000");
      const metadataURI = "https://example.com/metadata";

      // Create first token
      await pumpFun.connect(user1).createToken(
        tokenName1,
        tokenSymbol1,
        initialSupply,
        metadataURI
      );

      // Create second token
      await pumpFun.connect(user1).createToken(
        tokenName2,
        tokenSymbol2,
        initialSupply,
        metadataURI
      );

      const creatorTokens = await pumpFun.getCreatorTokens(user1.address);
      expect(creatorTokens.length).to.equal(2);
    });
  });
});
