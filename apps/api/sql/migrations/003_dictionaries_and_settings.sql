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
