import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
} from "https://deno.land/x/lucid@0.8.3/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// Chon vi nguoi mua
lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./beneficiary.sk"));

// Lay public key nguoi mua 
const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;


// Doc ham validator dau tien tren aiken (Ham vesting)
const validator = await readValidator();

// --- Supporting functions

async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// ---------------------------------------------------

// Lay dia chi hop dong thong minh tu validator da doc
const scriptAddress = lucid.utils.validatorToAddress(validator);

// we get all the UTXOs sitting at the script address

// Lay UTxO tu vi nguoi mua tu dia chi smartcontract
const scriptUtxos = await lucid.utxosAt(scriptAddress);
// Lay UTxO tu vi nguoi mua tu dia chi nguoi mua
const UtxosBen = await lucid.utxosAt("addr_test1vqzm7agsc3hmzzcmakfd77h3eag2xnh3gneagcs8n8nvusc5nz6zw");


// Tao kieu du lieu Datum: UTxO out
const Datum = Data.Object({
    owner: Data.String, // we can pass owner's verification key hash as byte array but also as a string
    beneficiary: Data.String, // we can beneficiary's hash as byte array but also as a string
});

type Datum = Data.Static<typeof Datum>;


// we filter out all the UTXOs by beneficiary and lock_until

// Loc UTxO tren hop dong thoa man dieu kien vi public key vi nguoi mua = public key vi dang select hien tai
const utxos = scriptUtxos.filter((utxo) => {
    // console.log(utxo);
  try {
    const datum = Data.from<Datum>(utxo.datum, Datum);
    return datum.beneficiary === beneficiaryPublicKeyHash;
  } catch (e) {
    // console.log(e);
    return false;
  }
});

// Neu khong co UTxO thi khong chau nua
if (utxos.length === 0) {
    console.log("No redeemable utxo found. You need to wait a little longer...");
    Deno.exit(1);
}

// we don't have any redeemer in our contract but it needs to be empty
// Chua hoan thien chuc nang chuoc lai tai san nen set redeemer bang rong
const redeemer = Data.empty();
const redeemer1 = Data.empty();


// Goi ham giai phong tai san
const txUnlock = await unlock(utxos, UtxosBen, { from: validator, using: redeemer, using1: redeemer1 });
console.log(1);

// gui len onchain
await lucid.awaitTx(txUnlock);

console.log(`NFT recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);

// Ham unlock
async function unlock(utxos, UtxosBen, { from, using, using1 }): Promise<TxHash> {
    // Tao giao dich moi
    const tx = await lucid
        .newTx()
        .collectFrom(UtxosBen, using1) // Lay cac tai san co tren UTxO co trong vi nguoi mua
        .payToAddress("addr_test1vqhs6zag6mfkr8qj8l59sh5mfx7g0ay6hc8qfza6y8mzp9c3henpx", {lovelace: 2000000n}) // Pay tien den vi nguoi mua
        .collectFrom(utxos, using) // Lay tai san tu UTxO tu hop dong
        .addSigner(await lucid.wallet.address()) // them chu ki tu vi wallet
        .attachSpendingValidator(from) // xac nhan form validator
        .complete();
        
    // ki xac nhan
    const signedTx = await tx
        .sign()
        .complete();
        
    return signedTx.submit(); // gui giao dich
}