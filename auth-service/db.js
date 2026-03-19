require("dotenv").config();
const mysql = require("mysql2/promise");

console.log("DB CONFIG");
console.log("HOST:", JSON.stringify(process.env.DB_HOST));
console.log("USER:", JSON.stringify(process.env.DB_USER));
console.log("DB:", JSON.stringify(process.env.DB_NAME));
console.log("PASSWORD LENGTH:", process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : "undefined");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;