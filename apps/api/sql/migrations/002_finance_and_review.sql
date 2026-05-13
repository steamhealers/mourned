CREATE TABLE IF NOT EXISTS payment_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  channel VARCHAR(32) NOT NULL,
  transaction_no VARCHAR(64) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL DEFAULT 'succeeded',
  callback_payload JSON NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_records_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS refund_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NOT NULL,
  evidence_urls JSON NULL,
  status ENUM('requested', 'approved', 'rejected', 'refunded') NOT NULL DEFAULT 'requested',
  review_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_refund_records_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS worker_settlements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  worker_profile_id BIGINT UNSIGNED NOT NULL,
  period_label VARCHAR(64) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_worker_period (worker_profile_id, period_label),
  CONSTRAINT fk_worker_settlements_worker FOREIGN KEY (worker_profile_id) REFERENCES worker_profiles(id)
);