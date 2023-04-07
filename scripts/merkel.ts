import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const createMerkleTreeRoo = (whitelist: string[]) => {
  const leafNodes = whitelist.map((wallet) => keccak256(wallet));
  const merkeltree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  return merkeltree;
};

export function getMerkleTreeRootHash(whitelist: string[]) {
  // root hash
  const merkeltree = createMerkleTreeRoo(whitelist);
  return merkeltree.getRoot();
}

export function getMerkleProof(address: string, whitelist: string[]) {
  const walletHash = keccak256(address);
  const merkeltree = createMerkleTreeRoo(whitelist);

  return merkeltree.getHexProof(walletHash);
}

export function getMerkleTreeRootHex(whitelist: string[]) {
  const merkeltree = createMerkleTreeRoo(whitelist);
  return merkeltree.getHexRoot();
}
