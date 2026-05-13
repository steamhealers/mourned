CREATE DATABASE IF NOT EXISTS mourned DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mourned;

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

INSERT INTO service_items (code, name, trade_mode, delivery_mode, description)
VALUES
  ('memorial-cleaning', '代祭扫与墓位清洁', 'direct', 'onsite', '适合异地家庭快速下单，强调照片视频回传和关键节点存证。'),
  ('errand-support', '白事跑腿代办', 'direct', 'onsite', '覆盖鲜花贡品代购、白事用品配送、墓园陪同与材料代跑。'),
  ('funeral-consulting', '白事咨询与套餐报价', 'quote', 'remote', '先提交需求，再由平台输出可确认的报价单与服务建议。')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  trade_mode = VALUES(trade_mode),
  delivery_mode = VALUES(delivery_mode),
  description = VALUES(description),
  is_active = 1;

INSERT INTO users (id, open_id, phone, real_name, real_name_verified)
VALUES
  (1, 'user-demo-001', '13800000001', '张家属', 1),
  (2, 'worker-demo-001', '13800000002', '李代办', 1)
ON DUPLICATE KEY UPDATE
  phone = VALUES(phone),
  real_name = VALUES(real_name),
  real_name_verified = VALUES(real_name_verified);

INSERT INTO worker_profiles (id, user_id, service_area, service_tags, rating, completed_order_count, status)
VALUES
  (1, 2, '上海市浦东新区', JSON_ARRAY('祭扫', '跑腿', '陪同'), 4.90, 28, 'active')
ON DUPLICATE KEY UPDATE
  service_area = VALUES(service_area),
  service_tags = VALUES(service_tags),
  rating = VALUES(rating),
  completed_order_count = VALUES(completed_order_count),
  status = VALUES(status);

INSERT INTO orders (
  id,
  order_no,
  user_id,
  service_item_id,
  worker_profile_id,
  city,
  district,
  contact_name,
  contact_phone,
  scheduled_at,
  amount,
  status,
  refund_status,
  notes
)
VALUES
  (1, 'MO202605130001', 1, 1, 1, '上海市', '浦东新区', '张家属', '13800000001', '2026-05-20 09:00:00', 299.00, 'in_service', 'none', '清明后补祭扫，需鲜花和贡品摆放'),
  (2, 'MO202605130002', 1, 3, NULL, '上海市', '闵行区', '张家属', '13800000001', '2026-05-22 10:00:00', 0.00, 'pending_quote', 'none', '咨询治丧流程与套餐报价')
ON DUPLICATE KEY UPDATE
  worker_profile_id = VALUES(worker_profile_id),
  amount = VALUES(amount),
  status = VALUES(status),
  refund_status = VALUES(refund_status),
  notes = VALUES(notes);

INSERT INTO quotes (id, order_id, quoted_by, amount, detail, expires_at, status)
VALUES
  (1, 2, '客服-王敏', 1680.00, JSON_ARRAY(JSON_OBJECT('label', '基础礼仪咨询', 'value', '680元'), JSON_OBJECT('label', '灵堂用品建议', 'value', '1000元')), '2026-05-25 18:00:00', 'submitted')
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  detail = VALUES(detail),
  expires_at = VALUES(expires_at),
  status = VALUES(status);

INSERT INTO fulfillment_records (id, order_id, stage_code, media_url, latitude, longitude, description)
VALUES
  (1, 1, 'arrival', 'https://example.com/arrival.jpg', 31.2304000, 121.4737000, '已到达墓园门口并完成签到'),
  (2, 1, 'preparation', 'https://example.com/prep.jpg', 31.2304000, 121.4737000, '鲜花与供品已摆放完成')
ON DUPLICATE KEY UPDATE
  media_url = VALUES(media_url),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  description = VALUES(description);

INSERT INTO payment_records (id, order_id, channel, transaction_no, amount, status, callback_payload)
VALUES
  (1, 1, 'wechatpay', 'PAY202605130001', 299.00, 'succeeded', JSON_OBJECT('source', 'seed'))
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  status = VALUES(status),
  callback_payload = VALUES(callback_payload);

INSERT INTO worker_settlements (id, worker_profile_id, period_label, gross_amount, commission_rate, net_amount, status, note)
VALUES
  (1, 1, '2026-05上半月', 299.00, 12.00, 263.12, 'pending', '示例结算单')
ON DUPLICATE KEY UPDATE
  gross_amount = VALUES(gross_amount),
  commission_rate = VALUES(commission_rate),
  net_amount = VALUES(net_amount),
  status = VALUES(status),
  note = VALUES(note);