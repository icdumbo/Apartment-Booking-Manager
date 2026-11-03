// Explicit local fallback for hosts that cannot spawn workerd. CI uses Miniflare.
// Executes the same repository SQL and migrations in a real in-memory SQLite DB.
export async function localD1SQLite(){
 const {DatabaseSync}=await import('node:sqlite'),database=new DatabaseSync(':memory:');
 const db={withSession:()=>db,prepare(sql){let args=[];return {bind(...values){args=values;return this;},async run(){const statement=database.prepare(sql);if(statement.columns().length)return {results:statement.all(...args),meta:{changes:0}};const result=statement.run(...args);return {meta:{changes:Number(result.changes)}};},async first(){return database.prepare(sql).get(...args)??null;},async all(){return {results:database.prepare(sql).all(...args)};}};},async batch(statements){database.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());database.exec('COMMIT');return results;}catch(error){database.exec('ROLLBACK');throw error;}}};
 return {db,dispose:()=>database.close()};
}
