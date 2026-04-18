// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title SecureChainPay Payment Contract
 * @dev Handles SCP token transfers with metadata and Chainlink price feeds
 */
contract SecureChainPayment is Ownable, ReentrancyGuard {
    IERC20 public scpToken;
    AggregatorV3Interface public priceFeed;
    
    uint256 public totalTransactions;
    uint256 public platformFeePercent = 0; // 0% initially, can be set by owner
    
    struct Transaction {
        address sender;
        address receiver;
        uint256 amount;
        uint256 timestamp;
        string note;
        uint256 ethUsdPrice; // Price at time of transaction
    }
    
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256[]) public userTransactions;
    
    event PaymentSent(
        uint256 indexed transactionId,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string note,
        uint256 ethUsdPrice,
        uint256 timestamp
    );
    
    event PlatformFeeUpdated(uint256 newFeePercent);
    
    /**
     * @dev Constructor
     * @param _scpTokenAddress Address of the SCP token contract
     * @param _priceFeedAddress Chainlink ETH/USD price feed address (Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306)
     */
    constructor(address _scpTokenAddress, address _priceFeedAddress) Ownable(msg.sender) {
        scpToken = IERC20(_scpTokenAddress);
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }
    
    /**
     * @dev Send payment with optional note
     * @param _receiver Address to receive tokens
     * @param _amount Amount of SCP tokens to send
     * @param _note Optional transaction note
     */
    function sendPayment(
        address _receiver,
        uint256 _amount,
        string memory _note
    ) external nonReentrant returns (uint256) {
        require(_receiver != address(0), "Invalid receiver address");
        require(_amount > 0, "Amount must be greater than 0");
        require(scpToken.balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        // Get current ETH/USD price from Chainlink
        uint256 ethUsdPrice = getLatestPrice();
        
        // Calculate fee if applicable
        uint256 fee = (_amount * platformFeePercent) / 100;
        uint256 amountAfterFee = _amount - fee;
        
        // Transfer tokens
        require(
            scpToken.transferFrom(msg.sender, _receiver, amountAfterFee),
            "Token transfer failed"
        );
        
        // Transfer fee to contract owner if fee exists
        if (fee > 0) {
            require(
                scpToken.transferFrom(msg.sender, owner(), fee),
                "Fee transfer failed"
            );
        }
        
        // Record transaction
        totalTransactions++;
        transactions[totalTransactions] = Transaction({
            sender: msg.sender,
            receiver: _receiver,
            amount: _amount,
            timestamp: block.timestamp,
            note: _note,
            ethUsdPrice: ethUsdPrice
        });
        
        userTransactions[msg.sender].push(totalTransactions);
        userTransactions[_receiver].push(totalTransactions);
        
        emit PaymentSent(
            totalTransactions,
            msg.sender,
            _receiver,
            _amount,
            _note,
            ethUsdPrice,
            block.timestamp
        );
        
        return totalTransactions;
    }
    
    /**
     * @dev Get latest ETH/USD price from Chainlink
     * @return price Latest price with 8 decimals
     */
    function getLatestPrice() public view returns (uint256) {
        (
            /* uint80 roundID */,
            int256 price,
            /* uint256 startedAt */,
            /* uint256 timeStamp */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        
        require(price > 0, "Invalid price from oracle");
        return uint256(price);
    }
    
    /**
     * @dev Get transaction details
     */
    function getTransaction(uint256 _transactionId) 
        external 
        view 
        returns (
            address sender,
            address receiver,
            uint256 amount,
            uint256 timestamp,
            string memory note,
            uint256 ethUsdPrice
        ) 
    {
        Transaction memory txn = transactions[_transactionId];
        return (
            txn.sender,
            txn.receiver,
            txn.amount,
            txn.timestamp,
            txn.note,
            txn.ethUsdPrice
        );
    }
    
    /**
     * @dev Get user's transaction IDs
     */
    function getUserTransactions(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userTransactions[_user];
    }
    
    /**
     * @dev Set platform fee percentage (only owner)
     * @param _feePercent Fee percentage (0-100)
     */
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 100, "Fee cannot exceed 100%");
        platformFeePercent = _feePercent;
        emit PlatformFeeUpdated(_feePercent);
    }
    
    /**
     * @dev Update price feed address (only owner)
     */
    function updatePriceFeed(address _newPriceFeed) external onlyOwner {
        priceFeed = AggregatorV3Interface(_newPriceFeed);
    }
}
