// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
// import { getMerkleProof, getMerkleTreeRootHash } from "../scripts/merkel";
import { ScandinavianTrailerTrash } from "../typechain";
chaiUse(chaiAsPromised);

const ONE_ETH = ethers.utils.parseEther("1");

describe("ScandinavianTrailerTrash", async function () {
  const BASE_URI = "http://dummy.url/";
  const TOKEN_URI = `${BASE_URI}1.json`;
  const TOKEN_ONE = 1;

  const NAME = "Scandinavian Trailer Trash";
  const SYMBOL = "Trash";
  const MAX_SUPPLY = 10000;
  const RESERVED_TOKENS = 512;
  const PUBLIC_SUPPLY = MAX_SUPPLY - RESERVED_TOKENS;

  let nft: ScandinavianTrailerTrash;
  let accounts: SignerWithAddress[];
  // const whitelistAddress = new Array<string>();

  let deployer: SignerWithAddress; // owner of the Contract
  let accountX: SignerWithAddress; // any account which is not owner of the contract
  let minter: SignerWithAddress; // minter
  let finalCollector: SignerWithAddress; // minter

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    deployer = accounts[0];
    accountX = accounts[1];
    minter = accounts[2];
    finalCollector = accounts[9];

    // for (let i = 0; i < 3; i++) {
    //   whitelistAddress.push(accounts[i].address);
    // }

    const scandinavianTrailerTrash = await ethers.getContractFactory(
      "ScandinavianTrailerTrash"
    );
    nft = await scandinavianTrailerTrash.deploy(BASE_URI);

    await nft.toggleSpawningStatus();
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
      expect(await nft.maxTrashSupply()).to.eq(MAX_SUPPLY);
    });
  });

  /***** test case 2 ******/
  describe("deploy contract, test mint", () => {
    const tokens = 1;
    let mintPrice: BigNumberish;
    let receipt: any;

    beforeEach(async () => {
      mintPrice = await nft.spawnPrice();
      const value = mintPrice.mul(tokens);
      receipt = await nft.connect(minter).spawn(tokens, {
        value,
      });
    });

    it("total supply", async () => {
      expect(await nft.totalSupply()).to.eq(tokens);
    });

    it("BASE + TOKEN URI", async () => {
      let tokenURI = await nft.tokenURI(TOKEN_ONE);
      expect(tokenURI).to.eq(TOKEN_URI);
    });

    it("owner", async () => {
      expect(await nft.ownerOf(TOKEN_ONE)).to.eq(minter.address);
    });

    it("balance", async () => {
      expect(await nft.balanceOf(minter.address)).to.eq(tokens);
    });

    it("should emit Transfer Event", async () => {
      const TransferEventArgs = [
        ethers.constants.AddressZero,
        minter.address,
        TOKEN_ONE,
      ];
      await expect(receipt)
        .to.emit(nft, "Transfer")
        .withArgs(...TransferEventArgs);
    });

    it("mint limit exceeded", async () => {
      const mintLimit = await nft.spawnLimit();
      const mintPrice = await nft.spawnPrice();
      const volume = mintLimit + 1;

      await expect(
        nft.spawn(volume, {
          value: mintPrice.mul(volume),
        })
      ).revertedWith("SpawnLimitExceeded");
    });

    it("low price", async () => {
      const volume = 3;

      await nft.spawn(1); // free spawn
      const mintPrice = await nft.spawnPrice();

      await expect(
        nft.spawn(volume, {
          value: mintPrice.mul(volume - 1),
        })
      ).revertedWith("LowPrice");
    });
  });

  /***** test case 3 ******/
  describe("deploy contract, mint from reserve", function () {
    const toknesMinted = 10;
    let receipt: any;
    beforeEach(async () => {
      receipt = await nft.spawnFromReserve(accountX.address, toknesMinted);
    });

    it("balance", async () => {
      expect(await nft.balanceOf(accountX.address)).to.eq(toknesMinted);
    });

    it("should decrease reserve", async () => {
      expect(await nft.reserveTrash()).to.eq(RESERVED_TOKENS - toknesMinted);
    });

    it("total supply", async () => {
      expect(await nft.totalSupply()).to.eq(toknesMinted);
    });
  });

  /***** test case 4 ******/
  describe("deploy contract, royalties update info", () => {
    let mintPriceWei: BigNumberish;

    beforeEach(async () => {
      const mintPrice = await nft.spawnPrice();
      mintPriceWei = mintPrice.mul(1);
    });

    /***** test case 4.1 ******/
    describe("update royalties Amount", () => {
      it("not owner ", async () => {
        await expect(nft.connect(accountX).setTrashTax("0")).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("should revert for percentage 0 ", async () => {
        await expect(nft.setTrashTax("0")).to.reverted;
      });

      it("royalty amount", async () => {
        const royalties = 10 * 100; // royalties percentage
        await nft.setTrashTax(royalties);

        let royaltyAmount = null;

        await nft.connect(minter).spawn(1, { value: mintPriceWei });
        ({ royaltyAmount } = await nft.royaltyInfo(TOKEN_ONE, ONE_ETH));
        const percentage = 1 * (royalties / 10000);
        expect(royaltyAmount).to.be.eq(
          ethers.utils.parseEther(percentage.toString())
        );
      });
    });

    /***** test case 4.2 ******/
    describe(" update royalties receiver", () => {
      it("not owner ", async () => {
        await expect(
          nft.connect(accountX).setTrashTaxReceiver(accountX.address)
        ).to.revertedWith("Ownable: caller is not the owner");
      });

      it("update royalites receiver ", async () => {
        await nft.setTrashTaxReceiver(accountX.address);

        await nft.connect(minter).spawn(1, { value: mintPriceWei });
        let { receiver } = await nft.royaltyInfo(TOKEN_ONE, ONE_ETH);

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
  describe("deploy contract, mint all public tokens", () => {
    beforeEach(async () => {
      await nft.setSpawnPrice(0);
      await nft.setSpawnLimit(MAX_SUPPLY);
      await nft.spawn(PUBLIC_SUPPLY);
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
      await nft.setSpawnLimit(10);
      const mintPrice = await nft.spawnPrice();
      const volume = 5;
      // minting first token, id 1
      await nft.spawn(volume, {
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
        await nft.spawnFromReserve(deployer.address, RESERVED_TOKENS);
      });

      it("balance", async () => {
        expect(await nft.balanceOf(deployer.address)).to.eq(RESERVED_TOKENS);
      });

      it("should revert on reserve limit exceeded", async () => {
        await expect(nft.spawnFromReserve(minter.address, 1)).revertedWith(
          "ReservedTrashExceeded"
        );
      });
    });

    describe("mint all reserve tokens, than public supply", () => {
      beforeEach(async () => {
        await nft.spawnFromReserve(deployer.address, RESERVED_TOKENS);
        await nft.setSpawnPrice("0");
        await nft.setSpawnLimit(MAX_SUPPLY);

        for (let i = 0; i < 10; i++) {
          let volume = 1000;
          if (accounts[i].address == deployer.address)
            volume -= RESERVED_TOKENS;

          await nft.connect(accounts[i]).spawn(volume);
        }
      });

      it("mint public nfts", async () => {
        accounts.forEach(async function (account) {
          let volume = 1000;
          expect(await nft.balanceOf(account.address)).to.eq(volume);
        });
      });

      it(`total public supply should be ${PUBLIC_SUPPLY}`, async () => {
        const totalSupply = await nft.totalSupply();
        expect(totalSupply.sub(RESERVED_TOKENS)).to.eq(PUBLIC_SUPPLY);
      });

      it("total supply should be 10000", async () => {
        expect(await nft.totalSupply()).to.be.eq(MAX_SUPPLY);
      });

      it("return correct owner for token 10000", async () => {
        expect(await nft.ownerOf(MAX_SUPPLY)).to.be.eq(finalCollector.address);
      });
      it("revert on reading information for tokenId above 10000", async () => {
        await expect(nft.ownerOf(MAX_SUPPLY + 1)).to.reverted;
      });
    });
  });

  //  max supply test
  describe("mint more than max supply", () => {
    beforeEach(async () => {
      await Promise.all([
        nft.spawnFromReserve(deployer.address, RESERVED_TOKENS),
        nft.setSpawnPrice("0"),
        nft.setSpawnLimit(15_000),
      ]);
      await nft.spawn(PUBLIC_SUPPLY);
    });

    it("total supply should be 10000", async () => {
      expect(await nft.totalSupply()).to.be.eq(MAX_SUPPLY);
    });

    it("should revert mint for max  max supply exceeded", async () => {
      const exceededAmount = 1;

      await expect(nft.spawn(exceededAmount)).to.revertedWith("TrashExceeded");
    });
  });

  // // whitelist test
  // describe("whitelistSpawn", () => {
  //   beforeEach(async () => {
  //     const merkelNode = getMerkleTreeRootHash(whitelistAddress);

  //     await Promise.all([
  //       nft.setMerkleRoot(merkelNode),
  //       nft.toggleWhitelistSpawningStatus(),
  //     ]);
  //   });

  //   describe("free mint", () => {
  //     it("should mint 1 NFT for free", async () => {
  //       const account = accounts[0].address;
  //       const proof = getMerkleProof(account, whitelistAddress);
  //       await nft.whitelistSpawn(1, proof);
  //       expect(await nft.balanceOf(account)).to.eq("1");
  //     });

  //     it("should not allow to with invalid proof", async () => {
  //       const account = accounts[0].address;
  //       const proof = getMerkleProof(account, whitelistAddress);
  //       await expect(
  //         nft.connect(accounts[10]).whitelistSpawn(1, proof)
  //       ).to.revertedWith("InvalidWhitelistProof");
  //     });
  //   });

  //   describe("paid mint", () => {
  //     let account: string;
  //     let proof: string[];
  //     let whitelistMintPrice: BigNumberish;
  //     let whitelistspawnlimit: number;

  //     beforeEach(async () => {
  //       account = accounts[0].address;
  //       proof = getMerkleProof(account, whitelistAddress);
  //       await nft.whitelistSpawn(1, proof);
  //       whitelistMintPrice = await nft.getWhitelistSpawingPrice();
  //       whitelistspawnlimit = await nft.whitelistSpawnLimit();
  //     });

  //     it("should not allow to mint if already minted for free", async () => {
  //       await expect(nft.whitelistSpawn(1, proof)).to.reverted;
  //     });
  //     it("should allow to mint paid 9 NFTs (including WL free mint)  ", async () => {
  //       const paidNFTsMint = whitelistspawnlimit - 1;
  //       // @ts-ignore
  //       const mintPrice = whitelistMintPrice.mul(paidNFTsMint);
  //       await nft.whitelistSpawn(paidNFTsMint, proof, {
  //         value: mintPrice,
  //       });
  //       expect(await nft.balanceOf(account)).to.eq(whitelistspawnlimit);
  //     });

  //     it("should not allow to mint more than whitelist spawn limit(including WL free mint)  ", async () => {
  //       // @ts-ignore
  //       const mintPrice = whitelistMintPrice.mul(10);
  //       await expect(
  //         nft.whitelistSpawn(10, proof, { value: mintPrice })
  //       ).to.revertedWith("SpawnLimitExceeded");
  //     });

  //     it("should revert if amount is low  ", async () => {
  //       // @ts-ignore
  //       const mintPrice = whitelistMintPrice.mul(7);
  //       await expect(
  //         nft.whitelistSpawn(8, proof, { value: mintPrice })
  //       ).to.revertedWith("LowPrice");
  //     });
  //   });
  // });

  // describe("setWhitelistSpawnLimit", () => {
  //   it("should only allow owner to setWhitelistSpawnLimit", async () => {
  //     const limit = 10;
  //     await nft.setWhitelistSpawnLimit(limit);

  //     expect(await nft.whitelistSpawnLimit()).to.eq(limit);
  //   });
  //   it("should not allow non-owner to setWhitelistSpawnLimit", async () => {
  //     const limit = 10;
  //     await expect(nft.connect(accountX).setWhitelistSpawnLimit(limit))
  //       .reverted;
  //   });
  // });

  // describe("whitelist mint, public mint", () => {
  //   let publicLimit: number;
  //   let whitelistLimit: number;
  //   beforeEach(async () => {
  //     const merkelNode = getMerkleTreeRootHash(whitelistAddress);

  //     await nft.setMerkleRoot(merkelNode);
  //     await nft.toggleWhitelistSpawningStatus();
  //     await nft.setSpawnPrice(0);

  //     [publicLimit, whitelistLimit] = await Promise.all([
  //       nft.spawnLimit(),
  //       nft.whitelistSpawnLimit(),
  //     ]);
  //   });

  //   it("should allow to mint allowed NFTs from both whitelist and public", async () => {
  //     await nft.spawn(publicLimit);
  //     const proof = getMerkleProof(accounts[0].address, whitelistAddress);
  //     await nft.whitelistSpawn(whitelistLimit, proof);

  //     expect(await nft.balanceOf(accounts[0].address)).to.eq(
  //       publicLimit + whitelistLimit
  //     );
  //   });
  // });

  /*********************************************************/
  /******************     V3 test **************************/
  /*********************************************************/

  describe.only("V3 test", () => {
    describe("default spawn", () => {
      it("should be able to free spawn", async () => {
        const volume = 1;
        await nft.connect(minter).spawn(volume);

        expect(await nft.balanceOf(minter.address)).to.eq(volume);
      });

      it("sholud revert on more than allowed to free spawn", async () => {
        const volume = 2;
        await expect(nft.connect(minter).spawn(volume)).to.revertedWith(
          "LowPrice"
        );
      });
    });

    describe("update free spawn limit", () => {
      const NEW_FREE_SPAWN_LIMIT = 5;
      beforeEach(async () => {
        await nft.setFreeSpawnLimit(NEW_FREE_SPAWN_LIMIT);
      });

      it("should update free spawn limit", async () => {
        expect(await nft.freeSpawnLimit()).to.eq(NEW_FREE_SPAWN_LIMIT);
      });

      it("should not update free spawn limit for non owner wallets", async () => {
        await expect(
          nft.connect(accountX).setFreeSpawnLimit(5)
        ).to.rejectedWith("Ownable: caller is not the owner");
      });
    });

    describe("spawn limit", () => {
      const NEW_FREE_SPAWN_LIMIT = 5;
      beforeEach(async () => {
        await nft.setFreeSpawnLimit(NEW_FREE_SPAWN_LIMIT);
      });

      it("should allow to spawn free NFTs to upper limit", async () => {
        await nft.connect(minter).spawn(NEW_FREE_SPAWN_LIMIT);
        expect(await nft.balanceOf(minter.address)).to.eq(NEW_FREE_SPAWN_LIMIT);
      });

      it("should allow to spawn free NFTs and paid NFTs to upper limit", async () => {
        const spawnLimit = await nft.spawnLimit();
        const spawnPrice = await nft.spawnPrice();

        const weiToSend = spawnPrice.mul(spawnLimit - NEW_FREE_SPAWN_LIMIT);
        await nft.connect(minter).spawn(spawnLimit, { value: weiToSend });

        expect(await nft.balanceOf(minter.address)).to.eq(spawnLimit);
      });
    });

    describe("spawn free NFT, update freeSpawnLimit, spawn again", () => {
      const NEW_FREE_SPAWN_LIMIT = 5;
      const initalSpawn = 1;
      beforeEach(async () => {
        await nft.connect(minter).spawn(initalSpawn);
        await nft.setFreeSpawnLimit(NEW_FREE_SPAWN_LIMIT);
      });

      it("should be able to spawn to new upper limt", async () => {
        await nft.connect(minter).spawn(NEW_FREE_SPAWN_LIMIT - initalSpawn);

        expect(await nft.balanceOf(minter.address)).to.eq(NEW_FREE_SPAWN_LIMIT);
      });
    });
  });
});
