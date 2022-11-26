// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { ScandinavianTrailerTrash } from "../typechain";
chaiUse(chaiAsPromised);

const ONE_ETH = ethers.utils.parseEther("1");

describe("ScandinavianTrailerTrash", async function () {
  const BASE_URI = "http://dummy.url/";
  const TOKEN_URI = `${BASE_URI}0.json`;

  const NAME = "Scandinavian trailer trash";
  const SYMBOL = "Trash";
  const MAX_SUPPLY = 10000;
  const RESERVED_TOKENS = 512;
  const PUBLIC_SUPPLY = MAX_SUPPLY - RESERVED_TOKENS;

  let nft: ScandinavianTrailerTrash;
  let accounts: SignerWithAddress[];

  let deployer: SignerWithAddress; // owner of the Contract
  let accountX: SignerWithAddress; // any account which is not owner of the contract
  let minter: SignerWithAddress; // minter
  let collector: SignerWithAddress; // minter

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    deployer = accounts[0];
    accountX = accounts[1];
    minter = accounts[2];
    collector = accounts[3];

    const scandinavianTrailerTrash = await ethers.getContractFactory(
      "ScandinavianTrailerTrash"
    );
    nft = await scandinavianTrailerTrash.deploy(BASE_URI);

    await nft.toggleMintingStatus();
  });

  /***** test case 1 ******/
  describe("deploy contract, test state values:", () => {
    it("name", async () => {
      expect(await nft.name()).to.eq(NAME);
    });

    it("symbol", async () => {
      expect(await nft.symbol()).to.eq(SYMBOL);
    });
    it("base url", async () => {
      expect(await nft.symbol()).to.eq(SYMBOL);
    });

    it("max supply", async () => {
      expect(await nft.maxSupply()).to.eq(MAX_SUPPLY);
    });
  });

  /***** test case 2 ******/
  describe("deploy contract, test mint", () => {
    const tokens = 1;
    let mintPrice: BigNumberish;
    let receipt: any;

    beforeEach(async () => {
      mintPrice = await nft.mintPrice();
      const value = mintPrice.mul(tokens);
      receipt = await nft.connect(minter).mint(tokens, {
        value,
      });
    });

    it("total supply", async () => {
      expect(await nft.totalSupply()).to.eq(tokens);
    });

    it("BASE + TOKEN URI", async () => {
      let tokenURI = await nft.tokenURI(0);
      expect(tokenURI).to.eq(TOKEN_URI);
    });

    it("owner", async () => {
      expect(await nft.ownerOf(0)).to.eq(minter.address);
    });

    it("balance", async () => {
      expect(await nft.balanceOf(minter.address)).to.eq(tokens);
    });

    it("should emit Transfer Event", async () => {
      const TransferEventArgs = [
        ethers.constants.AddressZero,
        minter.address,
        0,
      ];
      await expect(receipt)
        .to.emit(nft, "Transfer")
        .withArgs(...TransferEventArgs);
    });

    it("mint limit exceeded", async () => {
      const mintLimit = await nft.mintLimit();
      const mintPrice = await nft.mintPrice();
      const volume = mintLimit + 1;

      await expect(
        nft.mint(volume, {
          value: mintPrice.mul(volume),
        })
      ).reverted;
    });

    it("low price", async () => {
      const volume = 3;
      const mintPrice = await nft.mintPrice();

      await expect(
        nft.mint(volume, {
          value: mintPrice.mul(2),
        })
      ).reverted;
    });
  });

  /***** test case 3 ******/
  describe("deploy contract, mint from reserve", function () {
    const toknesMinted = 10;
    let receipt: any;
    beforeEach(async () => {
      receipt = await nft.mintFromReserve(accountX.address, toknesMinted);
    });

    it("balance", async () => {
      expect(await nft.balanceOf(accountX.address)).to.eq(toknesMinted);
    });

    it("should decrease reserve", async () => {
      expect(await nft.reserve()).to.eq(RESERVED_TOKENS - toknesMinted);
    });

    it("total supply", async () => {
      expect(await nft.totalSupply()).to.eq(toknesMinted);
    });
  });

  /***** test case 4 ******/
  describe("deploy contract, royalties update info", () => {
    let mintPriceWei: BigNumberish;

    beforeEach(async () => {
      const mintPrice = await nft.mintPrice();
      mintPriceWei = mintPrice.mul(1);
    });

    /***** test case 4.1 ******/
    describe("update royalties Amount", () => {
      it("not owner ", async () => {
        await expect(nft.connect(accountX).setRoyalties("0")).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("should revert for percentage 0 ", async () => {
        await expect(nft.setRoyalties("0")).to.reverted;
      });

      it("royalty amount", async () => {
        const royalties = 10; // royalties percentage
        await nft.setRoyalties(royalties);

        let royaltyAmount = null;

        await nft.connect(minter).mint(1, { value: mintPriceWei });
        ({ royaltyAmount } = await nft.royaltyInfo("0", ONE_ETH));
        const percentage = 1 * (royalties / 100);
        expect(royaltyAmount).to.be.eq(
          ethers.utils.parseEther(percentage.toString())
        );
      });
    });

    /***** test case 4.2 ******/
    describe(" update royalties receiver", () => {
      it("not owner ", async () => {
        await expect(
          nft.connect(accountX).setRoyaltiesReceiver(accountX.address)
        ).to.revertedWith("Ownable: caller is not the owner");
      });

      it("update royalites receiver ", async () => {
        await nft.setRoyaltiesReceiver(accountX.address);

        await nft.connect(minter).mint(1, { value: mintPriceWei });
        let { receiver } = await nft.royaltyInfo("0", ONE_ETH);

        expect(receiver).to.be.eq(accountX.address);
      });
    });
  });

  /***** test case 5 ******/
  describe("deploy contract, test supports interfaces", () => {
    // the interface id can be foud on the eip page https://eips.ethereum.org/EIPS/eip-721
    it("supports the IERC721 interface", async () => {
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.equal(true);
    });

    it("supports the IERC721Metadata interface", async () => {
      expect(await nft.supportsInterface("0x5b5e139f")).to.be.equal(true);
    });

    it("supports the IERC165 interface", async () => {
      expect(await nft.supportsInterface("0x01ffc9a7")).to.be.equal(true);
    });

    it("supports the IERC2981 interface", async () => {
      expect(await nft.supportsInterface("0x2a55205a")).to.be.equal(true);
    });
  });

  /***** test case 6 ******/
  describe("deploy contract, mint all tokens", () => {
    beforeEach(async () => {
      await nft.setMintPrice(0);
      await nft.setMintLimit(MAX_SUPPLY);
      await nft.mint(PUBLIC_SUPPLY);
    });
    it("total supply should be equal to max supply", async () => {
      expect(await nft.totalSupply()).to.eq(PUBLIC_SUPPLY);
    });
    it("balace of caller should be equal to max supply", async () => {
      expect(await nft.balanceOf(deployer.address)).to.eq(PUBLIC_SUPPLY);
    });
  });

  /***** test case 7 ******/
  describe("deploy contract, transfer ownership", () => {
    it("update the owner", async () => {
      await nft.transferOwnership(accountX.address);
      expect(await nft.owner()).to.eq(accountX.address);
    });
  });

  /***** test case 8 ******/
  describe("deploy contract, mint and test withdraw:", async () => {
    beforeEach(async () => {
      await nft.setMintLimit(10);
      const mintPrice = await nft.mintPrice();
      const volume = 5;
      // minting first token, id 0
      await nft.mint(volume, {
        value: mintPrice.mul(volume),
      });
    });
    it("not allow non owner", async () => {
      await expect(nft.connect(accountX).withdraw()).revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("by owner", async () => {
      const deployerBalance = await deployer.getBalance();
      const contractBalance = await ethers.provider.getBalance(nft.address);
      const newBalance = deployerBalance.add(contractBalance);

      const tx = await nft.withdraw();
      const receipt = await tx.wait();

      const gasPrice = tx.gasPrice || 0;
      const gasUsed = receipt.gasUsed;
      let txFee = gasUsed.mul(gasPrice);

      const deployerBalanceAfter = await deployer.getBalance();
      expect(newBalance).to.be.eq(deployerBalanceAfter.add(txFee));
    });
  });

  /***** test case 8 ******/
  describe("deploy contract, mint all tokens", function () {
    describe("mint all tokens from reserve", function () {
      beforeEach(async () => {
        await nft.mintFromReserve(deployer.address, RESERVED_TOKENS);
      });

      it("balance", async () => {
        expect(await nft.balanceOf(deployer.address)).to.eq(RESERVED_TOKENS);
      });

      it("should revert on reserve limit exceeded", async () => {
        await expect(nft.mintFromReserve(minter.address, 1)).reverted;
      });
    });

    describe("mint all reserve tokens, than public supply", () => {
      beforeEach(async () => {
        await nft.mintFromReserve(deployer.address, RESERVED_TOKENS);
        await nft.setMintPrice("0");
        await nft.setMintLimit(MAX_SUPPLY);

        for (let i = 0; i < 10; i++) {
          let volume = 1000;
          if (accounts[i].address == deployer.address)
            volume -= RESERVED_TOKENS;

          await nft.connect(accounts[i]).mint(volume);
        }
      });

      it("mint public nfts", async () => {
        accounts.forEach(async function (account) {
          let volume = 1000;
          expect(await nft.balanceOf(account.address)).to.eq(volume);
        });
      });

      it("total public supply should be 9600", async () => {
        const totalSupply = await nft.totalSupply();
        expect(totalSupply.sub(RESERVED_TOKENS)).to.eq(PUBLIC_SUPPLY);
      });

      it("total supply should be 10000", async () => {
        expect(await nft.totalSupply()).to.be.eq(MAX_SUPPLY);
      });
    });
  });
});
