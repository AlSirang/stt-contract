// SPDX-License-Identifier: MIT

pragma solidity 0.8.12;

import "erc721a/contracts/extensions/ERC721AQueryable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ScandinavianTrailerTrash is ERC721AQueryable, Ownable, IERC2981 {
    using Strings for uint256;

    uint16 public constant maxSupply = 10000;
    uint16 public reserve = 512; // tokens reserve for the owner

    uint16 private _totalSupplyPublic; // number of tokens minted from public supply
    uint16 private publicSupply = maxSupply - reserve; // tokens avaiable for public to mint
    uint16 private royalties = 690; // royalties 6.9% in bps

    uint256 public mintPrice = 0.069 ether; // mint price per token
    uint16 public mintLimit = 1; // initially, only 1 tokens per address are allowd to mint.
    address public royaltiesReceiver; // EOA for as royalties receiver for collection

    bool public isMintingOpen;
    string public baseURI;

    /***************************************************/
    /******************** MODIFIERS ********************/
    /***************************************************/

    modifier mintRequirements(uint16 volume) {
        require(volume > 0, "tokens gt 0");

        require(msg.value >= mintPrice * volume, "low price!");

        uint16 newTotalSupplyPublic = _totalSupplyPublic + volume;
        require(newTotalSupplyPublic <= publicSupply, "maxsupply exceeded");

        uint256 _newBalanceOf = balanceOf(_msgSender()) + volume;
        require(_newBalanceOf <= mintLimit, "mint limit exceeded");

        _totalSupplyPublic = newTotalSupplyPublic;
        _;
    }

    /**
     * @dev  It will mint from tokens allocated for public
     * @param volume is the quantity of tokens to be minted
     */
    function mint(uint16 volume) external payable mintRequirements(volume) {
        require(isMintingOpen, "mint isn't open");
        __mint(_msgSender(), volume);
    }

    /**
     * @dev mint function only callable by the Contract owner. It will mint from reserve tokens for owner
     * @param to is the address to which the tokens will be minted
     * @param volume is the quantity of tokens to be minted
     */
    function mintFromReserve(address to, uint16 volume) external onlyOwner {
        require(volume <= reserve, "reserve exceeded");

        reserve -= volume;
        __mint(to, volume);
    }

    /**
     * @dev private function to mint given amount of tokens
     * @param to is the address to which the tokens will be minted
     * @param volume is the quantity of tokens to be minted
     */
    function __mint(address to, uint16 volume) private {
        _safeMint(to, volume);
    }

    /*********************************************************/
    /******************** ADMIN FUNCTIONS ********************/
    /*********************************************************/

    /**
     * @dev it is only callable by Contract owner. it will toggle public minting status
     */
    function toggleMintingStatus() external onlyOwner {
        isMintingOpen = !isMintingOpen;
    }

    /**
     * @dev it will update mint price
     * @param _mintPrice is new value for mint
     */
    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        mintPrice = _mintPrice;
    }

    /**
     * @dev it will update the mint limit aka amount of nfts a wallet can hold
     * @param _mintLimit is new value for the limit
     */
    function setMintLimit(uint16 _mintLimit) external onlyOwner {
        mintLimit = _mintLimit;
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
     * @param _royaltiesReceiver is new royalty receiver
     */
    function setRoyaltiesReceiver(address _royaltiesReceiver)
        external
        onlyOwner
    {
        require(_royaltiesReceiver != address(0));
        royaltiesReceiver = _royaltiesReceiver;
    }

    /**
     * @dev it will update the royalties for token
     * @param _royalties is new percentage of royalties. it should be more than 0 and least 90
     */
    function setRoyalties(uint16 _royalties) external onlyOwner {
        require(_royalties > 0, "should be > 0");

        royalties = (_royalties * 100); // convert percentage into bps
    }

    /**
     * @dev it is only callable by Contract owner. it will withdraw balace of contract
     */
    function withdraw() external onlyOwner {
        bool success = payable(msg.sender).send(address(this).balance);
        require(success, "transfer failed");
    }

    /********************************************************/
    /******************** VIEW FUNCTIONS ********************/
    /********************************************************/

    /**
     * @dev it will return tokenURI for given tokenIdToOwner
     * @param _tokenId is valid token id mint in this contract
     */
    function tokenURI(uint256 _tokenId)
        public
        view
        override(ERC721A, IERC721A)
        returns (string memory)
    {
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
    function supportsInterface(bytes4 _interfaceId)
        public
        view
        virtual
        override(ERC721A, IERC721A, IERC165)
        returns (bool)
    {
        return
            _interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /**
     *  @dev it retruns the amount of royalty the owner will receive for given tokenId
     *  @param _tokenId is valid token number
     *  @param _salePrice is amount for which token will be traded
     */
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        require(
            _exists(_tokenId),
            "ERC2981RoyaltyStandard: Royalty info for nonexistent token"
        );
        return (royaltiesReceiver, (_salePrice * royalties) / 10000);
    }

    constructor(string memory _uri)
        ERC721A("Scandinavian trailer trash", "Trash")
    {
        baseURI = _uri;
        royaltiesReceiver = msg.sender;
    }
}
