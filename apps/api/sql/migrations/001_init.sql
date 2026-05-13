CREATE TABLE IF NOT EXISTS service_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  trade_mode ENUM('direct', 'quote', 'review') NOT NULL,
  delivery_mode ENUM('onsite', 'remote', 'hybrid') NOT NULL,
  description VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  phone VARCHAR(32) NULL,
  real_name VARCHAR(64) NULL,
  real_name_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_profiles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  service_area VARCHAR(255) NOT NULL,
  service_tags JSON NULL,
  rating DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  completed_order_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending', 'active', 'frozen') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_worker_profiles_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(40) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  service_item_id BIGINT UNSIGNED NOT NULL,
  worker_profile_id BIGINT UNSIGNED NULL,
  city VARCHAR(64) NOT NULL,
  district VARCHAR(64) NOT NULL,
  contact_name VARCHAR(64) NOT NULL,
  contact_phone VARCHAR(32) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending_quote', 'pending_payment', 'pending_dispatch', 'in_service', 'pending_confirm', 'completed', 'refund_in_progress', 'refunded', 'closed') NOT NULL,
  refund_status ENUM('none', 'requested', 'approved', 'rejected', 'refunded') NOT NULL DEFAULT 'none',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_orders_service_item FOREIGN KEY (service_item_id) REFERENCES service_items(id),
  CONSTRAINT fk_orders_worker_profile FOREIGN KEY (worker_profile_id) REFERENCES worker_profiles(id)
);

CREATE TABLE IF NOT EXISTS quotes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  quoted_by VARCHAR(64) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  detail JSON NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('draft', 'submitted', 'accepted', 'expired', 'rejected') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quotes_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS fulfillment_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  stage_code VARCHAR(64) NOT NULL,
  media_url VARCHAR(255) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fulfillment_records_order FOREIGN KEY (order_id) REFERENCES orders(id)
);