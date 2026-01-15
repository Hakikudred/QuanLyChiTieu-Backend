CREATE DATABASE IF NOT EXISTS quanlychitieu;
USE quanlychitieu;

CREATE TABLE IF NOT EXISTS people (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DOUBLE NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100),
    type ENUM('income', 'expense') DEFAULT 'expense',
    participants JSON
);

CREATE TABLE IF NOT EXISTS user_profile (
    id INT PRIMARY KEY DEFAULT 1,
    name VARCHAR(255) DEFAULT 'Người Dùng',
    email VARCHAR(255) DEFAULT 'user@example.com',
    avatar LONGTEXT
);

-- Ensure we have one row
INSERT IGNORE INTO user_profile (id, name, email, avatar) VALUES (1, 'Người Dùng', 'user@example.com', NULL);
