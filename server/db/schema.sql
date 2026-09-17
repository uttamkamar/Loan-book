-- Loan Management Database Schema
CREATE DATABASE IF NOT EXISTS loan_dashboard;
USE loan_dashboard;

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_taker VARCHAR(255) NOT NULL,
  guarantor_name VARCHAR(255) DEFAULT NULL,
  loan_amount DECIMAL(12,2) NOT NULL,
  current_principal DECIMAL(12,2) DEFAULT 0.00,
  payment_mode VARCHAR(100) DEFAULT 'Gpay',
  interest_rate DECIMAL(6,2) NOT NULL,
  interest_tenure VARCHAR(100) NOT NULL,
  interest_type VARCHAR(50) DEFAULT 'reducing', -- 'reducing' (Diminishing Principal) or 'flat'
  date_given DATE NOT NULL,
  time_given VARCHAR(20) DEFAULT '',
  return_date VARCHAR(100),
  interest_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) DEFAULT 0.00,
  balance_due DECIMAL(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'active',
  is_flagged TINYINT(1) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  proof_path VARCHAR(500) DEFAULT NULL,
  remark TEXT,
  requires_collateral TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Installments Table
CREATE TABLE IF NOT EXISTS installments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  installment_no INT NOT NULL DEFAULT 1,
  payment_date DATE NOT NULL,
  payment_time VARCHAR(20) DEFAULT '',
  amount_paid DECIMAL(12,2) NOT NULL,
  principal_paid DECIMAL(12,2) DEFAULT 0.00,
  interest_paid DECIMAL(12,2) DEFAULT 0.00,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  penalty_amount DECIMAL(12,2) DEFAULT 0.00,
  payment_mode VARCHAR(100) DEFAULT 'Gpay',
  remaining_balance DECIMAL(12,2) NOT NULL,
  is_flagged TINYINT(1) DEFAULT 0,
  proof_path VARCHAR(500) DEFAULT NULL,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);

-- Security Collateral Items Table (Required for Loans > 30k or high value)
CREATE TABLE IF NOT EXISTS collateral_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_value DECIMAL(12,2),
  photo_path VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pledged', -- 'pledged', 'forfeited', 'sold', 'returned'
  sale_price DECIMAL(12,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);

-- Paperwork & Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);
