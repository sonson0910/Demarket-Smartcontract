use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{VerificationKey}
use aiken/list
use aiken/transaction.{Transaction, ScriptContext, Spend}

type Datum {
  /// Owner's credentials Thong tin xac thuc chu so huu
  owner: VerificationKeyHash,
  /// Beneficiary's credentials Thong tin xac thuc nguoi thu huong
  beneficiary: VerificationKeyHash,
}

type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>
 
validator {
  fn vesting(datum: Datum, _redeemer: Void, ctx: ScriptContext) {
    // In principle, scripts can be used for different purpose (e.g. minting
    // assets). Here we make sure it's only used when 'spending' from a eUTxO
    when ctx.purpose is {
      Spend(_) ->
        or {
          must_be_signed_by(ctx.transaction, datum.owner),
          must_be_signed_by(ctx.transaction, datum.beneficiary),
        }
      _ -> False
    }
  }
  
  fn redeemer(datum: Datum, ctx: ScriptContext) -> Bool {
    must_be_signed_by(ctx.transaction, datum.owner)
  }
}
 
fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {
  list.has(transaction.extra_signatories, vk)
}
 