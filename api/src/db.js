const { Pool } = require('pg');
const types = require('pg').types;
types.setTypeParser(1082, v => v);   // return DATE columns as plain 'YYYY-MM-DD' text
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),          // used later for transactions
};