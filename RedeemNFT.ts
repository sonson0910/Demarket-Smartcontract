import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    Wallet,
} from "https://deno.land/x/lucid@0.8.4/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
// import blueprint from "" assert { type: "json" };
import blueprint from "/home/son/Documents/code/Blockchain/Test/Test3/vesting/plutus.json" assert { type: "json" };

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        // Deno.env.get("API_KEY"),
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

const Datum = Data.Object({
    owner: Data.String, // we can pass owner's verification key hash as byte array but also as a string
    beneficiary: Data.String, // we can beneficiary's hash as byte array but also as a string
});

type Datum = Data.Static<typeof Datum>;

export type Validators = {
  redeem: SpendingValidator;
};

const wallet = lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));

const validator = await readValidator();

async function readValidator(): Validators {
    const redeem = blueprint.validators.find((v) => v.title === "vesting.redeemer");
    // const vesting = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        toHex(cbor.encode(fromHex(redeem.compiledCode)))
    };
}

// --Can sua lai
const utxos = scriptUtxos.filter((utxo) => {
    // console.log(utxo);
  try {
      const policyID = utxo.assets;
      console.log(policyID)
  } catch (e) {
    // console.log(e);
    return false;
  }
});

const redeemer = Data.empty();
 
const txHash = await unlock(utxo, {
  from: validator,
  using: redeemer,
});

await lucid.awaitTx(txHash);
 
console.log(`1 tADA unlocked from the contract
    Tx ID:    ${txHash}
    Redeemer: ${redeemer}
`);
 
// --- Supporting functions
 
async function unlock(utxos, { from, using }): Promise<TxHash> {
  const tx = await lucid
    .newTx()
    .collectFrom(utxos, using)
    .addSigner(await lucid.wallet.address())
    .attachSpendingValidator(from)
    .complete();
 
  const signedTx = await tx
    .sign()
    .complete();
 
  return signedTx.submit();
}