// @ts-ignore
import address from "./address.json";

import { getMerkleTreeRootHex } from "./merkel";

const root = getMerkleTreeRootHex(address);

console.log(root);
