import { ethers } from "hardhat";

async function main() {
  const baseTokenURI = "https://ipfs.io/ipfs/";

  const ScandinavianTrailerTrash = await ethers.getContractFactory(
    "ScandinavianTrailerTrash"
  );
  const erc721 = await ScandinavianTrailerTrash.deploy(baseTokenURI);

  await erc721.deployed();

  console.log("ScandinavianTrailerTrash:", erc721.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
