// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title PumpFun
 * @dev A bonding curve-based token launch platform inspired by PumpFun
 * @notice This contract implements a bonding curve mechanism where early buyers get better prices
 */
contract PumpFun is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    // Bonding curve parameters
    uint256 public constant VIRTUAL_ETH_RESERVES = 69_420_000_000 ether; // Virtual ETH reserves
    uint256 public constant VIRTUAL_TOKEN_RESERVES = 1_000_000_000 ether; // Virtual token reserves
    uint256 public constant FEE_PERCENTAGE = 1; // 1% fee
    uint256 public constant PROTOCOL_FEE_PERCENTAGE = 0.5; // 0.5% protocol fee
    
    // Token information
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 totalSupply;
        uint256 virtualEthReserves;
        uint256 virtualTokenReserves;
        uint256 realEthReserves;
        uint256 realTokenReserves;
        bool isActive;
        uint256 createdAt;
        string metadataURI;
    }

    // Mapping from token address to token info
    mapping(address => TokenInfo) public tokens;
    
    // Mapping from creator to their tokens
    mapping(address => address[]) public creatorTokens;
    
    // Total tokens created
    uint256 public totalTokensCreated;
    
    // Events
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        uint256 totalSupply,
        string metadataURI
    );
    
    event TokensBought(
        address indexed tokenAddress,
        address indexed buyer,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 newEthReserves,
        uint256 newTokenReserves
    );
    
    event TokensSold(
        address indexed tokenAddress,
        address indexed seller,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 newEthReserves,
        uint256 newTokenReserves
    );
    
    event TokenGraduated(
        address indexed tokenAddress,
        uint256 graduationPrice
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create a new token with bonding curve
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param metadataURI Token metadata URI
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory metadataURI
    ) external returns (address) {
        require(initialSupply > 0, "Initial supply must be greater than 0");
        
        // Deploy new ERC20 token
        PumpFunToken newToken = new PumpFunToken(name, symbol, initialSupply, address(this));
        address tokenAddress = address(newToken);
        
        // Initialize token info
        TokenInfo storage tokenInfo = tokens[tokenAddress];
        tokenInfo.tokenAddress = tokenAddress;
        tokenInfo.creator = msg.sender;
        tokenInfo.totalSupply = initialSupply;
        tokenInfo.virtualEthReserves = VIRTUAL_ETH_RESERVES;
        tokenInfo.virtualTokenReserves = VIRTUAL_TOKEN_RESERVES;
        tokenInfo.realEthReserves = 0;
        tokenInfo.realTokenReserves = initialSupply;
        tokenInfo.isActive = true;
        tokenInfo.createdAt = block.timestamp;
        tokenInfo.metadataURI = metadataURI;
        
        // Add to creator's tokens
        creatorTokens[msg.sender].push(tokenAddress);
        
        // Increment total tokens created
        totalTokensCreated++;
        
        emit TokenCreated(tokenAddress, msg.sender, initialSupply, metadataURI);
        
        return tokenAddress;
    }

    /**
     * @dev Buy tokens using ETH
     * @param tokenAddress Address of the token to buy
     */
    function buyTokens(address tokenAddress) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to buy tokens");
        require(tokens[tokenAddress].isActive, "Token is not active");
        
        TokenInfo storage tokenInfo = tokens[tokenAddress];
        
        // Calculate token amount using bonding curve formula
        uint256 tokenAmount = calculateTokenAmount(tokenInfo.virtualEthReserves, tokenInfo.virtualTokenReserves, msg.value);
        
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(tokenAmount <= tokenInfo.realTokenReserves, "Not enough tokens available");
        
        // Calculate fees
        uint256 fee = msg.value.mul(FEE_PERCENTAGE).div(100);
        uint256 protocolFee = msg.value.mul(PROTOCOL_FEE_PERCENTAGE).div(100);
        uint256 netEthAmount = msg.value.sub(fee).sub(protocolFee);
        
        // Update reserves
        tokenInfo.virtualEthReserves = tokenInfo.virtualEthReserves.add(msg.value);
        tokenInfo.virtualTokenReserves = tokenInfo.virtualTokenReserves.sub(tokenAmount);
        tokenInfo.realEthReserves = tokenInfo.realEthReserves.add(netEthAmount);
        tokenInfo.realTokenReserves = tokenInfo.realTokenReserves.sub(tokenAmount);
        
        // Transfer tokens to buyer
        PumpFunToken(tokenAddress).transfer(msg.sender, tokenAmount);
        
        // Transfer fees to protocol
        if (protocolFee > 0) {
            payable(owner()).transfer(protocolFee);
        }
        
        emit TokensBought(
            tokenAddress,
            msg.sender,
            msg.value,
            tokenAmount,
            tokenInfo.realEthReserves,
            tokenInfo.realTokenReserves
        );
        
        // Check if token should graduate (reach certain price threshold)
        checkGraduation(tokenAddress);
    }

    /**
     * @dev Sell tokens for ETH
     * @param tokenAddress Address of the token to sell
     * @param tokenAmount Amount of tokens to sell
     */
    function sellTokens(address tokenAddress, uint256 tokenAmount) external nonReentrant {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(tokens[tokenAddress].isActive, "Token is not active");
        
        TokenInfo storage tokenInfo = tokens[tokenAddress];
        
        // Check if user has enough tokens
        require(PumpFunToken(tokenAddress).balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        
        // Calculate ETH amount using bonding curve formula
        uint256 ethAmount = calculateEthAmount(tokenInfo.virtualEthReserves, tokenInfo.virtualTokenReserves, tokenAmount);
        
        require(ethAmount > 0, "ETH amount must be greater than 0");
        require(address(this).balance >= ethAmount, "Not enough ETH in contract");
        
        // Calculate fees
        uint256 fee = ethAmount.mul(FEE_PERCENTAGE).div(100);
        uint256 protocolFee = ethAmount.mul(PROTOCOL_FEE_PERCENTAGE).div(100);
        uint256 netEthAmount = ethAmount.sub(fee).sub(protocolFee);
        
        // Update reserves
        tokenInfo.virtualEthReserves = tokenInfo.virtualEthReserves.sub(ethAmount);
        tokenInfo.virtualTokenReserves = tokenInfo.virtualTokenReserves.add(tokenAmount);
        tokenInfo.realEthReserves = tokenInfo.realEthReserves.sub(ethAmount);
        tokenInfo.realTokenReserves = tokenInfo.realTokenReserves.add(tokenAmount);
        
        // Transfer tokens from seller to contract
        PumpFunToken(tokenAddress).transferFrom(msg.sender, address(this), tokenAmount);
        
        // Transfer ETH to seller
        payable(msg.sender).transfer(netEthAmount);
        
        // Transfer fees to protocol
        if (protocolFee > 0) {
            payable(owner()).transfer(protocolFee);
        }
        
        emit TokensSold(
            tokenAddress,
            msg.sender,
            tokenAmount,
            ethAmount,
            tokenInfo.realEthReserves,
            tokenInfo.realTokenReserves
        );
    }

    /**
     * @dev Calculate token amount for given ETH amount using bonding curve
     */
    function calculateTokenAmount(
        uint256 ethReserves,
        uint256 tokenReserves,
        uint256 ethAmount
    ) public pure returns (uint256) {
        uint256 newEthReserves = ethReserves.add(ethAmount);
        uint256 newTokenReserves = ethReserves.mul(tokenReserves).div(newEthReserves);
        return tokenReserves.sub(newTokenReserves);
    }

    /**
     * @dev Calculate ETH amount for given token amount using bonding curve
     */
    function calculateEthAmount(
        uint256 ethReserves,
        uint256 tokenReserves,
        uint256 tokenAmount
    ) public pure returns (uint256) {
        uint256 newTokenReserves = tokenReserves.add(tokenAmount);
        uint256 newEthReserves = ethReserves.mul(tokenReserves).div(newTokenReserves);
        return ethReserves.sub(newEthReserves);
    }

    /**
     * @dev Get current token price in ETH
     */
    function getTokenPrice(address tokenAddress) external view returns (uint256) {
        TokenInfo memory tokenInfo = tokens[tokenAddress];
        if (tokenInfo.virtualTokenReserves == 0) return 0;
        return tokenInfo.virtualEthReserves.mul(1e18).div(tokenInfo.virtualTokenReserves);
    }

    /**
     * @dev Get token info
     */
    function getTokenInfo(address tokenAddress) external view returns (TokenInfo memory) {
        return tokens[tokenAddress];
    }

    /**
     * @dev Get creator's tokens
     */
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    /**
     * @dev Check if token should graduate and handle graduation
     */
    function checkGraduation(address tokenAddress) internal {
        TokenInfo storage tokenInfo = tokens[tokenAddress];
        
        // Graduation condition: when virtual token reserves reach 10% of initial supply
        uint256 graduationThreshold = tokenInfo.totalSupply.mul(10).div(100);
        
        if (tokenInfo.virtualTokenReserves <= graduationThreshold) {
            tokenInfo.isActive = false;
            
            // Calculate graduation price
            uint256 graduationPrice = tokenInfo.virtualEthReserves.mul(1e18).div(tokenInfo.virtualTokenReserves);
            
            emit TokenGraduated(tokenAddress, graduationPrice);
        }
    }

    /**
     * @dev Emergency function to withdraw ETH (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}

/**
 * @title PumpFunToken
 * @dev ERC20 token contract for PumpFun platform
 */
contract PumpFunToken is ERC20 {
    address public immutable pumpFunContract;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address _pumpFunContract
    ) ERC20(name, symbol) {
        pumpFunContract = _pumpFunContract;
        _mint(_pumpFunContract, initialSupply);
    }
    
    /**
     * @dev Override transfer to allow PumpFun contract to transfer tokens
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        if (msg.sender == pumpFunContract) {
            _transfer(msg.sender, to, amount);
            return true;
        }
        return super.transfer(to, amount);
    }
}
