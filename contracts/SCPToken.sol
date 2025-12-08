// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SecureChainPay Token (SCP)
 * @dev ERC-20 token for SecureChainPay payment system
 */
contract SCPToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1 million tokens
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18; // 100 tokens per faucet claim
    
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public faucetCooldown = 24 hours;
    
    event FaucetClaimed(address indexed claimer, uint256 amount);
    
    constructor() ERC20("SecureChainPay Token", "SCP") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Faucet function for demo - allows users to claim free tokens
     * @notice Can only claim once per cooldown period
     */
    function claimFromFaucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + faucetCooldown,
            "Faucet cooldown period not elapsed"
        );
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @dev Set faucet cooldown period (only owner)
     */
    function setFaucetCooldown(uint256 _cooldown) external onlyOwner {
        faucetCooldown = _cooldown;
    }
    
    /**
     * @dev Mint additional tokens (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
