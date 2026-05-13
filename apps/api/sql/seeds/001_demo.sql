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