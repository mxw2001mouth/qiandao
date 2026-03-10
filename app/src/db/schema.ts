// 数据库建表 SQL
export const CREATE_TABLES_SQL = [
  // 用户表（管理员/老师）
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher')),
    pin TEXT NOT NULL,
    name TEXT NOT NULL
  )`,

  // 学生表
  `CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    remaining_hours INTEGER NOT NULL DEFAULT 0,
    total_hours INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
    lifecycle_tag TEXT NOT NULL DEFAULT 'new' CHECK(lifecycle_tag IN ('new', 'active', 'warning', 'at_risk')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`,

  // 购课/续费记录表
  `CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    hours INTEGER NOT NULL,
    amount REAL NOT NULL,
    notes TEXT DEFAULT '',
    FOREIGN KEY (student_id) REFERENCES students(id)
  )`,

  // 签到记录表（UNIQUE 约束防止同一学生同一天重复打卡）
  `CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'late', 'leave', 'absent')),
    notes TEXT DEFAULT '',
    photo_path TEXT DEFAULT '',
    created_by INTEGER NOT NULL,
    modified_at TEXT DEFAULT '',
    original_status TEXT DEFAULT '',
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(student_id, date)
  )`,

  // 系统设置表（键值对）
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  // 跟进记录表
  `CREATE TABLE IF NOT EXISTS followup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'contacted', 'renewed')),
    notes TEXT DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (student_id) REFERENCES students(id)
  )`,

  // 审计日志表
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT DEFAULT '',
    new_value TEXT DEFAULT '',
    operator TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`,

  // 性能索引
  `CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON attendances(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date)`,
  // 注：idx_attendances_student_date 由 UNIQUE(student_id, date) 内置索引覆盖，无需重复
  `CREATE INDEX IF NOT EXISTS idx_purchases_student_id ON purchases(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date)`,
  `CREATE INDEX IF NOT EXISTS idx_followup_student_id ON followup(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_students_status ON students(status)`,
]

// 账号和系统配置初始数据
export const SEED_DATA_SQL = [
  `INSERT OR IGNORE INTO users (id, role, pin, name) VALUES (1, 'admin', '1234', '管理员')`,
  `INSERT OR IGNORE INTO users (id, role, pin, name) VALUES (2, 'teacher', '5678', '老师')`,
  `INSERT OR IGNORE INTO settings (key, value) VALUES ('warning_threshold', '3')`,
]

// 测试数据（仅在全新安装时写入，用于功能验证）
// 包含：15名学生（3个班级，覆盖红/黄/绿三种课时状态）
//       10次课（150条签到记录）、购课续费记录、跟进记录
export const TEST_SEED_SQL = [
  // ── 学生（3班15人，课时分布覆盖 at_risk / warning / active / new）──
  `INSERT OR IGNORE INTO students
     (id, name, class_name, parent_name, parent_phone,
      remaining_hours, total_hours, status, lifecycle_tag, created_at)
   VALUES
     (1,  '张明', '英语A班', '张国强', '13811110001',  0, 80, 'active', 'at_risk',  datetime('now','-180 days','localtime')),
     (2,  '李华', '英语A班', '李建国', '13811110002',  2, 40, 'active', 'warning',  datetime('now','-150 days','localtime')),
     (3,  '王芳', '英语A班', '王守义', '13811110003', 10, 80, 'active', 'active',   datetime('now','-160 days','localtime')),
     (4,  '刘伟', '英语A班', '刘大海', '13811110004', 15, 40, 'active', 'active',   datetime('now','-140 days','localtime')),
     (5,  '陈静', '英语A班', '陈志远', '13811110005', 22, 80, 'active', 'active',   datetime('now','-170 days','localtime')),
     (6,  '赵磊', '数学B班', '赵建平', '13811110006',  0, 80, 'active', 'at_risk',  datetime('now','-165 days','localtime')),
     (7,  '孙丽', '数学B班', '孙卫国', '13811110007',  1, 40, 'active', 'warning',  datetime('now','-145 days','localtime')),
     (8,  '周强', '数学B班', '周明亮', '13811110008',  8, 80, 'active', 'active',   datetime('now','-155 days','localtime')),
     (9,  '吴娜', '数学B班', '吴长青', '13811110009',  3, 40, 'active', 'warning',  datetime('now','-130 days','localtime')),
     (10, '郑阳', '数学B班', '郑文博', '13811110010', 18, 80, 'active', 'active',   datetime('now','-175 days','localtime')),
     (11, '冯婷', '科学C班', '冯志强', '13811110011',  0, 80, 'active', 'at_risk',  datetime('now','-185 days','localtime')),
     (12, '褚勇', '科学C班', '褚建国', '13811110012',  5, 40, 'active', 'active',   datetime('now','-135 days','localtime')),
     (13, '卫霞', '科学C班', '卫立新', '13811110013', 12, 80, 'active', 'active',   datetime('now','-160 days','localtime')),
     (14, '蒋峰', '科学C班', '蒋文远', '13811110014', 20, 80, 'active', 'active',   datetime('now','-170 days','localtime')),
     (15, '沈雪', '科学C班', '沈明华', '13811110015', 30, 40, 'active', 'new',      datetime('now','-25 days','localtime'))`,

  // ── 购课/续费记录 ──
  `INSERT OR IGNORE INTO purchases (student_id, date, hours, amount, notes) VALUES
     (1,  date('now','-180 days'), 40, 2000, '首次购课'),
     (1,  date('now','-90 days'),  40, 2000, '续费'),
     (2,  date('now','-150 days'), 40, 2000, '首次购课'),
     (3,  date('now','-160 days'), 40, 2000, '首次购课'),
     (3,  date('now','-60 days'),  40, 2000, '续费'),
     (4,  date('now','-140 days'), 40, 2000, '首次购课'),
     (5,  date('now','-170 days'), 40, 2000, '首次购课'),
     (5,  date('now','-80 days'),  40, 2000, '续费'),
     (6,  date('now','-165 days'), 40, 2000, '首次购课'),
     (6,  date('now','-85 days'),  40, 2000, '续费'),
     (7,  date('now','-145 days'), 40, 2000, '首次购课'),
     (8,  date('now','-155 days'), 40, 2000, '首次购课'),
     (8,  date('now','-70 days'),  40, 2000, '续费'),
     (9,  date('now','-130 days'), 40, 2000, '首次购课'),
     (10, date('now','-175 days'), 40, 2000, '首次购课'),
     (10, date('now','-75 days'),  40, 2000, '续费'),
     (11, date('now','-185 days'), 40, 2000, '首次购课'),
     (11, date('now','-95 days'),  40, 2000, '续费'),
     (12, date('now','-135 days'), 40, 2000, '首次购课'),
     (13, date('now','-160 days'), 40, 2000, '首次购课'),
     (13, date('now','-65 days'),  40, 2000, '续费'),
     (14, date('now','-170 days'), 40, 2000, '首次购课'),
     (14, date('now','-55 days'),  40, 2000, '续费'),
     (15, date('now','-25 days'),  40, 2000, '首次购课')`,

  // ── 签到记录（10次课，Mon/Wed/Fri，覆盖到课/迟到/请假/旷课）──
  // 2026-02-16
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-02-16','present','','',2),(2, '2026-02-16','present','','',2),
     (3, '2026-02-16','present','','',2),(4, '2026-02-16','present','','',2),
     (5, '2026-02-16','leave','请假','',2),(6, '2026-02-16','present','','',2),
     (7, '2026-02-16','present','','',2),(8, '2026-02-16','present','','',2),
     (9, '2026-02-16','late','','',2),(10,'2026-02-16','present','','',2),
     (11,'2026-02-16','present','','',2),(12,'2026-02-16','present','','',2),
     (13,'2026-02-16','present','','',2),(14,'2026-02-16','present','','',2),
     (15,'2026-02-16','present','','',2)`,
  // 2026-02-18
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-02-18','present','','',2),(2, '2026-02-18','present','','',2),
     (3, '2026-02-18','present','','',2),(4, '2026-02-18','present','','',2),
     (5, '2026-02-18','present','','',2),(6, '2026-02-18','present','','',2),
     (7, '2026-02-18','late','','',2),(8, '2026-02-18','present','','',2),
     (9, '2026-02-18','present','','',2),(10,'2026-02-18','present','','',2),
     (11,'2026-02-18','absent','','',2),(12,'2026-02-18','present','','',2),
     (13,'2026-02-18','present','','',2),(14,'2026-02-18','present','','',2),
     (15,'2026-02-18','present','','',2)`,
  // 2026-02-20
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-02-20','present','','',2),(2, '2026-02-20','present','','',2),
     (3, '2026-02-20','late','','',2),(4, '2026-02-20','present','','',2),
     (5, '2026-02-20','present','','',2),(6, '2026-02-20','present','','',2),
     (7, '2026-02-20','present','','',2),(8, '2026-02-20','present','','',2),
     (9, '2026-02-20','present','','',2),(10,'2026-02-20','present','','',2),
     (11,'2026-02-20','present','','',2),(12,'2026-02-20','leave','探亲请假','',2),
     (13,'2026-02-20','present','','',2),(14,'2026-02-20','present','','',2),
     (15,'2026-02-20','present','','',2)`,
  // 2026-02-23
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-02-23','present','','',2),(2, '2026-02-23','late','','',2),
     (3, '2026-02-23','present','','',2),(4, '2026-02-23','present','','',2),
     (5, '2026-02-23','present','','',2),(6, '2026-02-23','present','','',2),
     (7, '2026-02-23','present','','',2),(8, '2026-02-23','leave','家中有事','',2),
     (9, '2026-02-23','present','','',2),(10,'2026-02-23','present','','',2),
     (11,'2026-02-23','present','','',2),(12,'2026-02-23','present','','',2),
     (13,'2026-02-23','late','','',2),(14,'2026-02-23','present','','',2),
     (15,'2026-02-23','present','','',2)`,
  // 2026-02-25
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-02-25','late','','',2),(2, '2026-02-25','present','','',2),
     (3, '2026-02-25','present','','',2),(4, '2026-02-25','present','','',2),
     (5, '2026-02-25','present','','',2),(6, '2026-02-25','present','','',2),
     (7, '2026-02-25','absent','','',2),(8, '2026-02-25','present','','',2),
     (9, '2026-02-25','present','','',2),(10,'2026-02-25','present','','',2),
     (11,'2026-02-25','present','','',2),(12,'2026-02-25','present','','',2),
     (13,'2026-02-25','present','','',2),(14,'2026-02-25','present','','',2),
     (15,'2026-02-25','present','','',2)`,
  // 2026-02-27
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-02-27','present','','',2),(2, '2026-02-27','leave','请假','',2),
     (3, '2026-02-27','present','','',2),(4, '2026-02-27','present','','',2),
     (5, '2026-02-27','present','','',2),(6, '2026-02-27','late','','',2),
     (7, '2026-02-27','present','','',2),(8, '2026-02-27','present','','',2),
     (9, '2026-02-27','present','','',2),(10,'2026-02-27','present','','',2),
     (11,'2026-02-27','present','','',2),(12,'2026-02-27','present','','',2),
     (13,'2026-02-27','present','','',2),(14,'2026-02-27','present','','',2),
     (15,'2026-02-27','present','','',2)`,
  // 2026-03-02
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-03-02','present','','',2),(2, '2026-03-02','present','','',2),
     (3, '2026-03-02','leave','感冒请假','',2),(4, '2026-03-02','present','','',2),
     (5, '2026-03-02','present','','',2),(6, '2026-03-02','present','','',2),
     (7, '2026-03-02','present','','',2),(8, '2026-03-02','present','','',2),
     (9, '2026-03-02','absent','','',2),(10,'2026-03-02','present','','',2),
     (11,'2026-03-02','present','','',2),(12,'2026-03-02','present','','',2),
     (13,'2026-03-02','present','','',2),(14,'2026-03-02','present','','',2),
     (15,'2026-03-02','present','','',2)`,
  // 2026-03-04
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-03-04','present','','',2),(2, '2026-03-04','present','','',2),
     (3, '2026-03-04','present','','',2),(4, '2026-03-04','late','','',2),
     (5, '2026-03-04','present','','',2),(6, '2026-03-04','absent','','',2),
     (7, '2026-03-04','present','','',2),(8, '2026-03-04','present','','',2),
     (9, '2026-03-04','present','','',2),(10,'2026-03-04','present','','',2),
     (11,'2026-03-04','present','','',2),(12,'2026-03-04','present','','',2),
     (13,'2026-03-04','leave','外出请假','',2),(14,'2026-03-04','present','','',2),
     (15,'2026-03-04','present','','',2)`,
  // 2026-03-06
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-03-06','present','','',2),(2, '2026-03-06','late','','',2),
     (3, '2026-03-06','present','','',2),(4, '2026-03-06','present','','',2),
     (5, '2026-03-06','present','','',2),(6, '2026-03-06','present','','',2),
     (7, '2026-03-06','present','','',2),(8, '2026-03-06','present','','',2),
     (9, '2026-03-06','present','','',2),(10,'2026-03-06','present','','',2),
     (11,'2026-03-06','late','','',2),(12,'2026-03-06','present','','',2),
     (13,'2026-03-06','present','','',2),(14,'2026-03-06','present','','',2),
     (15,'2026-03-06','present','','',2)`,
  // 2026-03-09
  `INSERT OR IGNORE INTO attendances (student_id, date, status, notes, photo_path, created_by) VALUES
     (1, '2026-03-09','present','','',2),(2, '2026-03-09','present','','',2),
     (3, '2026-03-09','present','','',2),(4, '2026-03-09','present','','',2),
     (5, '2026-03-09','present','','',2),(6, '2026-03-09','present','','',2),
     (7, '2026-03-09','present','','',2),(8, '2026-03-09','late','','',2),
     (9, '2026-03-09','present','','',2),(10,'2026-03-09','present','','',2),
     (11,'2026-03-09','present','','',2),(12,'2026-03-09','present','','',2),
     (13,'2026-03-09','present','','',2),(14,'2026-03-09','present','','',2),
     (15,'2026-03-09','present','','',2)`,

  // ── 跟进记录（at_risk + warning 的6名学生）──
  `INSERT OR IGNORE INTO followup (student_id, status, notes, updated_at) VALUES
     (1,  'pending',   '',                    datetime('now','localtime')),
     (2,  'contacted', '已联系家长，表示下周续费', datetime('now','-2 days','localtime')),
     (6,  'pending',   '',                    datetime('now','localtime')),
     (7,  'contacted', '家长说本月底续费',      datetime('now','-1 days','localtime')),
     (9,  'pending',   '',                    datetime('now','localtime')),
     (11, 'pending',   '',                    datetime('now','localtime'))`,
]
