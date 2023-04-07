// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "operator-filter-registry/src/DefaultOperatorFilterer.sol";

//   ██████  ▄████▄   ▄▄▄       ███▄    █ ▓█████▄  ██▓ ███▄    █  ▄▄▄    ██▒   █▓ ██▓ ▄▄▄       ███▄    █
// ▒██    ▒ ▒██▀ ▀█  ▒████▄     ██ ▀█   █ ▒██▀ ██▌▓██▒ ██ ▀█   █ ▒████▄ ▓██░   █▒▓██▒▒████▄     ██ ▀█   █
// ░ ▓██▄   ▒▓█    ▄ ▒██  ▀█▄  ▓██  ▀█ ██▒░██   █▌▒██▒▓██  ▀█ ██▒▒██  ▀█▄▓██  █▒░▒██▒▒██  ▀█▄  ▓██  ▀█ ██▒
//   ▒   ██▒▒▓▓▄ ▄██▒░██▄▄▄▄██ ▓██▒  ▐▌██▒░▓█▄   ▌░██░▓██▒  ▐▌██▒░██▄▄▄▄██▒██ █░░░██░░██▄▄▄▄██ ▓██▒  ▐▌██▒
// ▒██████▒▒▒ ▓███▀ ░ ▓█   ▓██▒▒██░   ▓██░░▒████▓ ░██░▒██░   ▓██░ ▓█   ▓██▒▒▀█░  ░██░ ▓█   ▓██▒▒██░   ▓██░
// ▒ ▒▓▒ ▒ ░░ ░▒ ▒  ░ ▒▒   ▓▒█░░ ▒░   ▒ ▒  ▒▒▓  ▒ ░▓  ░ ▒░   ▒ ▒  ▒▒   ▓▒█░░ ▐░  ░▓   ▒▒   ▓▒█░░ ▒░   ▒ ▒
// ░ ░▒  ░ ░  ░  ▒     ▒   ▒▒ ░░ ░░   ░ ▒░ ░ ▒  ▒  ▒ ░░ ░░   ░ ▒░  ▒   ▒▒ ░░ ░░   ▒ ░  ▒   ▒▒ ░░ ░░   ░ ▒░
// ░  ░  ░  ░          ░   ▒      ░   ░ ░  ░ ░  ░  ▒ ░   ░   ░ ░   ░   ▒     ░░   ▒ ░  ░   ▒      ░   ░ ░
//       ░  ░ ░            ░  ░         ░    ░     ░           ░       ░  ░   ░   ░        ░  ░         ░
//          ░                              ░                                 ░
// ▄▄▄█████▓ ██▀███   ▄▄▄       ██▓ ██▓    ▓█████  ██▀███     ▄▄▄█████▓ ██▀███   ▄▄▄        ██████  ██░ ██
// ▓  ██▒ ▓▒▓██ ▒ ██▒▒████▄    ▓██▒▓██▒    ▓█   ▀ ▓██ ▒ ██▒   ▓  ██▒ ▓▒▓██ ▒ ██▒▒████▄    ▒██    ▒ ▓██░ ██▒
// ▒ ▓██░ ▒░▓██ ░▄█ ▒▒██  ▀█▄  ▒██▒▒██░    ▒███   ▓██ ░▄█ ▒   ▒ ▓██░ ▒░▓██ ░▄█ ▒▒██  ▀█▄  ░ ▓██▄   ▒██▀▀██░
// ░ ▓██▓ ░ ▒██▀▀█▄  ░██▄▄▄▄██ ░██░▒██░    ▒▓█  ▄ ▒██▀▀█▄     ░ ▓██▓ ░ ▒██▀▀█▄  ░██▄▄▄▄██   ▒   ██▒░▓█ ░██
//   ▒██▒ ░ ░██▓ ▒██▒ ▓█   ▓██▒░██░░██████▒░▒████▒░██▓ ▒██▒     ▒██▒ ░ ░██▓ ▒██▒ ▓█   ▓██▒▒██████▒▒░▓█▒░██▓
//   ▒ ░░   ░ ▒▓ ░▒▓░ ▒▒   ▓▒█░░▓  ░ ▒░▓  ░░░ ▒░ ░░ ▒▓ ░▒▓░     ▒ ░░   ░ ▒▓ ░▒▓░ ▒▒   ▓▒█░▒ ▒▓▒ ▒ ░ ▒ ░░▒░▒
//     ░      ░▒ ░ ▒░  ▒   ▒▒ ░ ▒ ░░ ░ ▒  ░ ░ ░  ░  ░▒ ░ ▒░       ░      ░▒ ░ ▒░  ▒   ▒▒ ░░ ░▒  ░ ░ ▒ ░▒░ ░
//   ░        ░░   ░   ░   ▒    ▒ ░  ░ ░      ░     ░░   ░      ░        ░░   ░   ░   ▒   ░  ░  ░   ░  ░░ ░
//             ░           ░  ░ ░      ░  ░   ░  ░   ░                    ░           ░  ░      ░   ░  ░  ░

// =============================================================
//                       ERRORS
// =============================================================

/// When public spawning has not yet started
error SpawningIsPaused();

/// Zero NFTs spawn. Wallet can mint at least one NFT.
error ZeroTokensSpawn();

/// For price check. msg.value should be greater than or equal to spawn price
error LowPrice();

/// Max supply limit exceed error
error TrashExceeded();

/// Whitelist and public spawn limit exceed error
error SpawnLimitExceeded();

/// Reserved limit exceed error
error ReservedTrashExceeded();

/// Merkle Proof error
error InvalidWhitelistProof();

/****************************************************************/
/***************************  ***************************/
/****************************************************************/

// =============================================================
//       Scandinavian Trailer Trash ERC721A Contract
// =============================================================

contract ScandinavianTrailerTrash is
    DefaultOperatorFilterer,
    ERC721A,
    Ownable,
    IERC2981
{
    using Strings for uint256;

    uint16 public constant maxTrashSupply = 10000; //  _publicTrashSupply + reserveTrash = maxTrashSupply
    uint16 private constant _publicTrashSupply = 9488; // tokens avaiable for public to mint
    uint16 public reserveTrash = 512; // tokens reserve for the owner
    uint16 private _totalPublicTrash; // number of tokens minted from public supply
    uint16 private _trashTax = 690; // royalties 6.9% in bps

    // public spwan price
    uint256 public spawnPrice = 0.01 ether; // mint price per token
    uint16 public spawnLimit = 10; // tokens per address are allowd to mint.

    // whitelist spwan
    uint16 public whitelistSpawnLimit = 10; // 9 tokens per address are allowd to mint (1 free).

    bool public isSpawning;
    bool public isWhitelistSpawning; // for whitelist minting

    address public trashTaxCollector; // EOA for as royalties receiver for collection
    string public baseURI; // token base uri
    bytes32 private _merkleRoot; // merkel tree root for whitelist

    mapping(address => bool) private _whitelistClaimed; // to check if wallet has minted free NFT
    mapping(address => uint16) private _whitelistSpawnsOf; // amount of NFTs minted using `whitlistSpawn`.
    mapping(address => uint16) private _publicSpawnsOf; // amount of NFTs minted using `spawn`.

    // =============================================================
    //                       MODIFIERS
    // =============================================================

    modifier spawnRequirements(uint16 volume) {
        if (!isSpawning) revert SpawningIsPaused();
        if (volume == 0) revert ZeroTokensSpawn();
        if (msg.value < (spawnPrice * volume)) revert LowPrice();

        uint16 totalSpawns = _publicSpawnsOf[_msgSender()] + volume;
        if (totalSpawns > spawnLimit) revert SpawnLimitExceeded();

        _publicSpawnsOf[_msgSender()] = totalSpawns;
        _;
    }

    // =============================================================
    //                       FUNCTIONS
    // =============================================================

    /**
     * @dev  It will mint from tokens allocated for public
     * @param volume is the quantity of tokens to be minted
     */
    function spawn(uint16 volume) external payable spawnRequirements(volume) {
        _maxSupplyCheck(volume);
        _spawn(_msgSender(), volume);
    }

    /**
     * @dev  It will mint from tokens allocated for public. calling wallet should be in whitelist
     * @param _merkleProof is markel tree hash proof for the address
     */
    function whitelistSpawn(
        uint16 volume,
        bytes32[] calldata _merkleProof
    ) external payable {
        if (!isWhitelistSpawning) revert SpawningIsPaused();
        if (volume == 0) revert ZeroTokensSpawn();

        bytes32 leaf = keccak256(abi.encodePacked(_msgSender()));
        if (!MerkleProof.verify(_merkleProof, _merkleRoot, leaf))
            revert InvalidWhitelistProof();

        uint16 paidSpawn = volume;

        if (!_whitelistClaimed[_msgSender()]) {
            paidSpawn = volume - 1;
            _maxSupplyCheck(volume);
            _whitelistClaimed[_msgSender()] = true; // claimed free spawn
        }

        if (msg.value < (getWhitelistSpawingPrice() * paidSpawn))
            revert LowPrice();

        uint16 _newBalance = _whitelistSpawnsOf[_msgSender()] + volume;
        if (_newBalance > whitelistSpawnLimit) revert SpawnLimitExceeded();

        _whitelistSpawnsOf[_msgSender()] = _newBalance;

        _maxSupplyCheck(volume);
        _spawn(_msgSender(), volume);
    }

    /**
     * @dev mint function only callable by the Contract owner. It will mint from reserve tokens for owner
     * @param to is the address to which the tokens will be minted
     * @param volume is the quantity of tokens to be minted
     */
    function spawnFromReserve(address to, uint16 volume) external onlyOwner {
        if (volume > reserveTrash) revert ReservedTrashExceeded();
        reserveTrash -= volume;
        _spawn(to, volume);
    }

    /**
     * @dev private function to mint given amount of tokens
     * @param to is the address to which the tokens will be minted
     * @param volume is the quantity of tokens to be minted
     */
    function _spawn(address to, uint16 volume) private {
        _safeMint(to, volume);
    }

    /**
     * @dev private function to compute max supply limit
     */
    function _maxSupplyCheck(uint16 volume) private {
        uint16 totalTrash = _totalPublicTrash + volume;
        if (totalTrash > _publicTrashSupply) revert TrashExceeded();
        _totalPublicTrash = totalTrash;
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @dev it is only callable by Contract owner. it will toggle public minting status
     */
    function toggleSpawningStatus() external onlyOwner {
        isSpawning = !isSpawning;
    }

    /**
     * @dev it is only callable by Contract owner. it will whitelist minting status
     */
    function toggleWhitelistSpawningStatus() external onlyOwner {
        isWhitelistSpawning = !isWhitelistSpawning;
    }

    /**
     * @dev it will update mint price
     * @param _spawnPrice is new value for mint
     */
    function setSpawnPrice(uint256 _spawnPrice) external onlyOwner {
        spawnPrice = _spawnPrice;
    }

    /**
     * @dev it will update the root Hash for merkel tree (for whitelist minting)
     * @param merkleRoot_ is the root Hash for merkel tree
     */
    function setMerkleRoot(bytes32 merkleRoot_) external onlyOwner {
        _merkleRoot = merkleRoot_;
    }

    /**
     * @dev it will update the mint limit aka amount of nfts a wallet can hold
     * @param _spawnLimit is new value for the limit
     */
    function setSpawnLimit(uint16 _spawnLimit) external onlyOwner {
        spawnLimit = _spawnLimit;
    }

    /**
     * @notice amount of nfts a whitelisted wallet can mint including 1 free mint.
     * @dev it will update the whitelist paid mint limit aka amount of nfts a whitelist wallet can mint.
     * @param _whitelistSpawnLimit is new value for the limit
     */
    function setWhitelistSpawnLimit(
        uint16 _whitelistSpawnLimit
    ) external onlyOwner {
        whitelistSpawnLimit = _whitelistSpawnLimit;
    }

    /**
     * @dev it will update baseURI for tokens
     * @param _uri is new URI for tokens
     */
    function setBaseURI(string memory _uri) external onlyOwner {
        baseURI = _uri;
    }

    /**
     * @dev it will update the address for royalties receiver
     * @param _trashTaxCollector is new royalty receiver
     */
    function setTrashTaxReceiver(
        address _trashTaxCollector
    ) external onlyOwner {
        require(_trashTaxCollector != address(0));
        trashTaxCollector = _trashTaxCollector;
    }

    /**
     * @dev it will update the royalties for token
     * @param trashTax_ is new percentage of royalties. it should be more than 0 and less than 100
     */
    function setTrashTax(uint16 trashTax_) external onlyOwner {
        require(trashTax_ > 0, "should be > 0");
        _trashTax = (trashTax_ * 100); // convert percentage into bps
    }

    /**
     * @dev it is only callable by Contract owner. it will withdraw balace of contract
     */
    function withdraw() external onlyOwner {
        bool success = payable(msg.sender).send(address(this).balance);
        require(success, "Transfer failed!");
    }

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice returns amount of NTFs mint with public and whitelist functions
     */
    function getSpawns(
        address account
    )
        external
        view
        returns (
            uint256 publicSpawn,
            uint256 whitelistSpwan,
            bool whitelistClaimed
        )
    {
        publicSpawn = _publicSpawnsOf[account];
        whitelistSpwan = _whitelistSpawnsOf[account];
        whitelistClaimed = _whitelistClaimed[account];
    }

    /**
     * @notice returns mint price for paid whitelist NFT mint
     */
    function getWhitelistSpawingPrice() public view returns (uint256) {
        return spawnPrice / 2;
    }

    /**
     * @dev it will return tokenURI for given tokenIdToOwner
     * @param _tokenId is valid token id mint in this contract
     */
    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        return string(abi.encodePacked(baseURI, _tokenId.toString(), ".json"));
    }

    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(ERC721A, IERC165) returns (bool) {
        return
            _interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /**
     *  @dev it retruns the amount of royalty the owner will receive for given tokenId
     *  @param _tokenId is valid token number
     *  @param _salePrice is amount for which token will be traded
     */
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        require(
            _exists(_tokenId),
            "ERC2981RoyaltyStandard: Royalty info for nonexistent token"
        );
        return (trashTaxCollector, (_salePrice * _trashTax) / 10000);
    }

    /**
     * @dev Returns the starting token ID.
     * To change the starting token ID, please override this function.
     */
    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    // =============================================================
    //                 ON-CHAIN ROYALTY ENFORCEMENT
    // =============================================================

    /**
     * @dev override  {ERC721-setApprovalForAll} to enforce onchain royalty
     * See {ERC721-setApprovalForAll}.
     */
    function setApprovalForAll(
        address operator,
        bool approved
    ) public override onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    /**
     * @dev override  {ERC721-approve} to enforce onchain royalty
     * See {ERC721-approve}.
     */
    function approve(
        address operator,
        uint256 tokenId
    ) public payable override onlyAllowedOperatorApproval(operator) {
        super.approve(operator, tokenId);
    }

    /**
     * @dev override  {ERC721-transferFrom} to enforce onchain royalty
     * See {ERC721-transferFrom}.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev override  {ERC721-safeTransferFrom} to enforce onchain royalty
     * See {ERC721-transferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    /**
     * @dev override  {ERC721-safeTransferFrom} to enforce onchain royalty
     * See {ERC721-transferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public payable override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    constructor(
        string memory _uri
    ) ERC721A("Scandinavian Trailer Trash", "Trash") {
        baseURI = _uri;
        trashTaxCollector = msg.sender;
    }
}
