require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");

const poolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
};

if (process.env.DB_SSL === "true") {
  poolConfig.ssl = {
    ca: fs.readFileSync(process.env.DB_CA_PATH),
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;