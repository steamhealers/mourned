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

CREATE TABLE IF NOT EXISTS dictionaries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  scope ENUM('shared', 'user-miniapp', 'worker-miniapp', 'admin-web', 'api') NOT NULL DEFAULT 'shared',
  description VARCHAR(255) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dictionary_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  dictionary_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  item_key VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  value VARCHAR(255) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  extra_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dictionary_items_dictionary FOREIGN KEY (dictionary_id) REFERENCES dictionaries(id) ON DELETE CASCADE,
  CONSTRAINT fk_dictionary_items_parent FOREIGN KEY (parent_id) REFERENCES dictionary_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  scope ENUM('shared', 'user-miniapp', 'worker-miniapp', 'admin-web', 'api') NOT NULL DEFAULT 'shared',
  group_code VARCHAR(64) NOT NULL,
  setting_key VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  value_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
  value_text TEXT NOT NULL,
  description VARCHAR(255) NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_scope_group_setting (scope, group_code, setting_key)
);

CREATE TABLE IF NOT EXISTS admin_menus (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NULL,
  menu_type ENUM('catalog', 'menu', 'button') NOT NULL DEFAULT 'menu',
  menu_key VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  route_path VARCHAR(255) NULL,
  icon VARCHAR(64) NULL,
  permission_code VARCHAR(128) NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_menus_parent FOREIGN KEY (parent_id) REFERENCES admin_menus(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_roles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  auth_mode ENUM('demo', 'password', 'wechat-work') NOT NULL DEFAULT 'demo',
  password_hint VARCHAR(255) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_role_menu_permissions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  role_id BIGINT UNSIGNED NOT NULL,
  menu_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_role_menu_permission (role_id, menu_id),
  CONSTRAINT fk_admin_role_permissions_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_role_permissions_menu FOREIGN KEY (menu_id) REFERENCES admin_menus(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_admin_user_role (user_id, role_id),
  CONSTRAINT fk_admin_user_roles_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_user_roles_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE
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

INSERT INTO dictionaries (id, code, name, scope, description, status)
VALUES
  (1, 'service-category', '服务分类树', 'shared', '用于管理服务目录、页面分组和多级枚举映射。', 'active'),
  (2, 'order-status', '订单状态字典', 'shared', '用于后台枚举、状态文案与流程提示。', 'active'),
  (3, 'fulfillment-stage', '履约节点字典', 'worker-miniapp', '用于代办员端配置履约阶段展示。', 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  scope = VALUES(scope),
  description = VALUES(description),
  status = VALUES(status);

INSERT INTO dictionary_items (id, dictionary_id, parent_id, item_key, label, value, sort_order, is_enabled, extra_json)
VALUES
  (1, 1, NULL, 'onsite-service', '现场服务', 'onsite-service', 10, 1, JSON_OBJECT('color', '#8a6a4d')),
  (2, 1, 1, 'memorial-cleaning', '代祭扫与墓位清洁', 'memorial-cleaning', 10, 1, JSON_OBJECT('tradeMode', 'direct')),
  (3, 1, 1, 'errand-support', '白事跑腿代办', 'errand-support', 20, 1, JSON_OBJECT('tradeMode', 'direct')),
  (4, 1, NULL, 'consulting-service', '咨询服务', 'consulting-service', 20, 1, JSON_OBJECT('color', '#53706f')),
  (5, 1, 4, 'funeral-consulting', '白事咨询与套餐报价', 'funeral-consulting', 10, 1, JSON_OBJECT('tradeMode', 'quote')),
  (6, 2, NULL, 'pending_quote', '待报价', 'pending_quote', 10, 1, NULL),
  (7, 2, NULL, 'pending_payment', '待支付', 'pending_payment', 20, 1, NULL),
  (8, 2, NULL, 'pending_dispatch', '待派单', 'pending_dispatch', 30, 1, NULL),
  (9, 2, NULL, 'in_service', '服务中', 'in_service', 40, 1, NULL),
  (10, 2, NULL, 'pending_confirm', '待确认', 'pending_confirm', 50, 1, NULL),
  (11, 2, NULL, 'completed', '已完成', 'completed', 60, 1, NULL),
  (12, 2, NULL, 'refund_in_progress', '售后中', 'refund_in_progress', 70, 1, NULL),
  (13, 2, NULL, 'refunded', '已退款', 'refunded', 80, 1, NULL),
  (14, 2, NULL, 'closed', '已关闭', 'closed', 90, 1, NULL),
  (15, 3, NULL, 'arrival', '到场打卡', 'arrival', 10, 1, JSON_OBJECT('description', '记录时间、地点和首张现场照片，作为履约起点。')),
  (16, 3, NULL, 'preparation', '供品摆放', 'preparation', 20, 1, JSON_OBJECT('description', '上传供品摆放前后照片，并记录特殊备注。')),
  (17, 3, NULL, 'service', '服务执行', 'service', 30, 1, JSON_OBJECT('description', '记录清扫、祭拜、陪同或跑腿完成的关键节点。')),
  (18, 3, NULL, 'completion', '完结提交', 'completion', 40, 1, JSON_OBJECT('description', '提交整单说明，等待用户确认和后台结算。'))
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  label = VALUES(label),
  value = VALUES(value),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled),
  extra_json = VALUES(extra_json);

INSERT INTO system_settings (id, scope, group_code, setting_key, name, value_type, value_text, description, is_public)
VALUES
  (1, 'user-miniapp', 'homepage', 'banner_enabled', '用户端首页 banner 开关', 'boolean', 'true', '控制用户端首页活动 banner 是否显示。', 1),
  (2, 'user-miniapp', 'homepage', 'notice_text', '用户端首页公告', 'string', '当前演示接入 Vant Weapp，首期默认开放代祭扫、跑腿代办与咨询报价。', '控制用户端首页公告文案。', 1),
  (3, 'user-miniapp', 'homepage', 'quick_actions', '用户端首页能力区块', 'json', '[{"title":"快速下单","description":"为代祭扫、跑腿代办建立标准化交易入口。"},{"title":"询价与咨询","description":"对白事协办和非标需求生成待确认报价。"},{"title":"查看履约凭证","description":"在订单中查看到场、摆放、清洁、祭扫完成等节点记录。"}]', '控制用户端首页能力区块。', 1),
  (4, 'worker-miniapp', 'location', 'strict_check', '代办员定位严格校验', 'boolean', 'false', '控制到场打卡是否强制校验定位半径。', 0),
  (5, 'worker-miniapp', 'dashboard', 'notice_text', '代办员端工作台公告', 'string', '代办员端已接入 Vant Weapp，后续将补充接单、打卡、异常上报等表单流。', '控制代办员首页公告文案。', 1),
  (6, 'worker-miniapp', 'dashboard', 'metrics', '代办员看板指标', 'json', '[{"label":"待接单","value":"06"},{"label":"今日任务","value":"04"},{"label":"待上传凭证","value":"03"},{"label":"本周收入","value":"¥2,640"}]', '控制代办员首页看板指标。', 1),
  (7, 'admin-web', 'dashboard', 'refresh_seconds', '后台看板刷新间隔', 'number', '30', '后台概览页自动刷新秒数。', 0),
  (8, 'admin-web', 'dashboard', 'highlights', '后台概览指标', 'json', '[{"label":"今日新增订单","value":"18"},{"label":"待审核代办员","value":"7"},{"label":"待处理售后","value":"3"},{"label":"纪念馆待审核内容","value":"12"}]', '控制后台概览核心指标展示。', 1),
  (9, 'admin-web', 'dashboard', 'focus_tracks', '后台重点事项', 'json', '["订单调度与客服仲裁","代办员审核与分区管理","纪念馆内容审核","财务结算与退款处理"]', '控制后台概览重点事项列表。', 1),
  (10, 'api', 'upload', 'image_limit_mb', '上传图片大小限制', 'number', '10', '上传接口允许的单文件大小限制。', 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  value_type = VALUES(value_type),
  value_text = VALUES(value_text),
  description = VALUES(description),
  is_public = VALUES(is_public);

INSERT INTO admin_menus (id, parent_id, menu_type, menu_key, name, route_path, icon, permission_code, sort_order, is_enabled)
VALUES
  (1, NULL, 'menu', 'dashboard', '概览', '/', 'DataBoard', 'dashboard:view', 10, 1),
  (2, NULL, 'menu', 'services', '服务管理', '/services', 'List', 'services:view', 20, 1),
  (3, NULL, 'menu', 'orders', '订单管理', '/orders', 'Suitcase', 'orders:view', 30, 1),
  (4, NULL, 'menu', 'workers', '代办员管理', '/workers', 'UserFilled', 'workers:view', 40, 1),
  (5, NULL, 'menu', 'finance', '财务结算', '/finance', 'Coin', 'finance:view', 50, 1),
  (6, NULL, 'menu', 'dictionaries', '字典管理', '/dictionaries', 'CollectionTag', 'dictionaries:view', 60, 1),
  (7, NULL, 'menu', 'settings', '参数设置', '/settings', 'Setting', 'settings:view', 70, 1),
  (8, NULL, 'menu', 'menu-management', '菜单管理', '/menus', 'Menu', 'access.menus:view', 80, 1),
  (9, NULL, 'menu', 'role-management', '角色权限', '/roles', 'Lock', 'access.roles:view', 90, 1),
  (10, NULL, 'menu', 'admin-users', '用户管理', '/admin-users', 'Avatar', 'access.users:view', 100, 1),
  (11, 1, 'button', 'dashboard-jump-orders', '概览跳转订单', NULL, NULL, 'dashboard.jump.orders', 110, 1),
  (12, 1, 'button', 'dashboard-jump-workers', '概览跳转代办员', NULL, NULL, 'dashboard.jump.workers', 120, 1),
  (13, 1, 'button', 'dashboard-jump-finance', '概览跳转财务', NULL, NULL, 'dashboard.jump.finance', 130, 1),
  (14, 3, 'button', 'orders-open-detail', '查看订单详情', NULL, NULL, 'orders.detail', 140, 1),
  (15, 3, 'button', 'orders-submit-quote', '提交报价', NULL, NULL, 'orders.quote', 150, 1),
  (16, 3, 'button', 'orders-dispatch', '派单', NULL, NULL, 'orders.dispatch', 160, 1),
  (17, 3, 'button', 'orders-payment-callback', '模拟支付回调', NULL, NULL, 'orders.payment-callback', 170, 1),
  (18, 3, 'button', 'orders-refund-review', '退款审核', NULL, NULL, 'orders.refund-review', 180, 1),
  (19, 3, 'button', 'orders-force-complete', '强制完结', NULL, NULL, 'orders.force-complete', 190, 1),
  (42, 4, 'button', 'workers-create', '新建代办员', NULL, NULL, 'workers.create', 195, 1),
  (20, 4, 'button', 'workers-approve', '代办员通过审核', NULL, NULL, 'workers.approve', 200, 1),
  (21, 4, 'button', 'workers-pending', '代办员转待审核', NULL, NULL, 'workers.pending', 210, 1),
  (22, 4, 'button', 'workers-freeze', '代办员冻结', NULL, NULL, 'workers.freeze', 220, 1),
  (23, 4, 'button', 'workers-settlement', '生成结算', NULL, NULL, 'workers.settlement', 230, 1),
  (24, 6, 'button', 'dictionaries-create', '新建字典', NULL, NULL, 'dictionaries.create', 240, 1),
  (25, 6, 'button', 'dictionaries-edit', '编辑字典', NULL, NULL, 'dictionaries.edit', 250, 1),
  (26, 6, 'button', 'dictionaries-delete', '删除字典', NULL, NULL, 'dictionaries.delete', 260, 1),
  (27, 6, 'button', 'dictionaries-item-create', '新增字典节点', NULL, NULL, 'dictionaries.item.create', 270, 1),
  (28, 6, 'button', 'dictionaries-item-edit', '编辑字典节点', NULL, NULL, 'dictionaries.item.edit', 280, 1),
  (29, 6, 'button', 'dictionaries-item-delete', '删除字典节点', NULL, NULL, 'dictionaries.item.delete', 290, 1),
  (30, 7, 'button', 'settings-create', '新建参数', NULL, NULL, 'settings.create', 300, 1),
  (31, 7, 'button', 'settings-edit', '编辑参数', NULL, NULL, 'settings.edit', 310, 1),
  (32, 7, 'button', 'settings-delete', '删除参数', NULL, NULL, 'settings.delete', 320, 1),
  (33, 8, 'button', 'menus-create', '新建菜单', NULL, NULL, 'access.menus.create', 330, 1),
  (34, 8, 'button', 'menus-edit', '编辑菜单', NULL, NULL, 'access.menus.edit', 340, 1),
  (35, 8, 'button', 'menus-delete', '删除菜单', NULL, NULL, 'access.menus.delete', 350, 1),
  (36, 9, 'button', 'roles-create', '新建角色', NULL, NULL, 'access.roles.create', 360, 1),
  (37, 9, 'button', 'roles-edit', '编辑角色', NULL, NULL, 'access.roles.edit', 370, 1),
  (38, 9, 'button', 'roles-delete', '删除角色', NULL, NULL, 'access.roles.delete', 380, 1),
  (39, 10, 'button', 'users-create', '新建用户', NULL, NULL, 'access.users.create', 390, 1),
  (40, 10, 'button', 'users-edit', '编辑用户', NULL, NULL, 'access.users.edit', 400, 1),
  (41, 10, 'button', 'users-delete', '删除用户', NULL, NULL, 'access.users.delete', 410, 1)
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  menu_type = VALUES(menu_type),
  name = VALUES(name),
  route_path = VALUES(route_path),
  icon = VALUES(icon),
  permission_code = VALUES(permission_code),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled);

INSERT INTO admin_roles (id, code, name, description, status)
VALUES
  (1, 'super-admin', '超级管理员', '拥有后台全部菜单与操作权限。', 'active'),
  (2, 'ops-admin', '运营管理员', '负责订单、服务、代办员及字典参数维护。', 'active'),
  (3, 'finance-admin', '财务管理员', '负责财务与退款结算相关操作。', 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  status = VALUES(status);

INSERT INTO admin_users (id, username, display_name, auth_mode, password_hint, status)
VALUES
  (1, 'admin-demo-001', '演示管理员', 'demo', 'demo-only', 'active'),
  (2, 'ops-demo-001', '运营主管', 'password', 'ops-123456', 'active'),
  (3, 'finance-demo-001', '财务主管', 'password', 'finance-123456', 'active')
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  auth_mode = VALUES(auth_mode),
  password_hint = VALUES(password_hint),
  status = VALUES(status);

INSERT INTO admin_role_menu_permissions (role_id, menu_id)
VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
  (1, 11), (1, 12), (1, 13), (1, 14), (1, 15), (1, 16), (1, 17), (1, 18), (1, 19),
  (1, 20), (1, 21), (1, 22), (1, 23), (1, 24), (1, 25), (1, 26), (1, 27), (1, 28), (1, 29), (1, 42),
  (1, 30), (1, 31), (1, 32), (1, 33), (1, 34), (1, 35), (1, 36), (1, 37), (1, 38), (1, 39), (1, 40), (1, 41),
  (2, 1), (2, 2), (2, 3), (2, 4), (2, 6), (2, 7),
  (2, 11), (2, 12), (2, 14), (2, 15), (2, 16), (2, 18), (2, 19),
  (2, 20), (2, 21), (2, 22), (2, 23), (2, 42),
  (2, 24), (2, 25), (2, 27), (2, 28), (2, 30), (2, 31),
  (3, 1), (3, 3), (3, 5),
  (3, 13), (3, 14), (3, 17), (3, 18), (3, 19)
ON DUPLICATE KEY UPDATE
  menu_id = VALUES(menu_id);

INSERT INTO admin_user_roles (user_id, role_id)
VALUES
  (1, 1),
  (2, 2),
  (3, 3)
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id);