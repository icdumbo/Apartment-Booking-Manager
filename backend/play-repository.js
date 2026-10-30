export function createPlayRepository(database){
 const db=database.withSession('first-primary');
 return {
  async reserve({hash,subject,productId,encryptedToken}){
   const rows=await db.batch([
    db.prepare("INSERT INTO play_purchases(token_hash,subject,product_id,encrypted_token,status,verified_at) VALUES (?,?,?,?,'pending',0) ON CONFLICT(token_hash) DO NOTHING").bind(hash,subject,productId,encryptedToken),
    db.prepare('SELECT subject,product_id FROM play_purchases WHERE token_hash=?').bind(hash)
   ]);
   const owner=rows[1].results[0];if(!owner||owner.subject!==subject||owner.product_id!==productId)throw Object.assign(Error('purchaseRejected'),{status:409});
  },
  async activate(hash,subject,now){await db.prepare("UPDATE play_purchases SET status='active',verified_at=? WHERE token_hash=? AND subject=?").bind(now,hash,subject).run();},
  async revoke(hash,subject){await db.prepare("UPDATE play_purchases SET status='revoked' WHERE token_hash=? AND subject=?").bind(hash,subject).run();},
  async list(subject){const rows=await db.prepare("SELECT product_id,encrypted_token FROM play_purchases WHERE subject=? AND status IN ('pending','active')").bind(subject).all();return rows.results.map(row=>({productId:row.product_id,encryptedToken:row.encrypted_token}));}
 };
}
