-- Local development data only. Safe to re-run against the demo tenant.
begin;

insert into users (id, tenant_id, mobile, display_name)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '09386529288', 'مدیر آزمایشی')
on conflict (tenant_id, mobile) do update set display_name = excluded.display_name, status = 'active';

insert into user_roles (tenant_id, user_id, branch_id, role)
select '00000000-0000-0000-0000-000000000001', u.id, '10000000-0000-0000-0000-000000000001', 'owner'
from users u where u.tenant_id = '00000000-0000-0000-0000-000000000001' and u.mobile = '09386529288'
on conflict do nothing;

insert into terms (id, tenant_id, name, starts_on, ends_on, status)
values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ترم تابستان ۱۴۰۵', '2026-06-22', '2026-09-22', 'active')
on conflict (id) do update set name = excluded.name, starts_on = excluded.starts_on, ends_on = excluded.ends_on, status = excluded.status;

insert into people (id, tenant_id, first_name, last_name, mobile, birth_date, gender) values
('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','مریم','احمدی','09121110001','1992-05-08','female'),
('50000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','سعید','کریمی','09121110002','1988-11-15','male'),
('50000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','نگار','رضایی','09121110003','1997-02-20','female'),
('50000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','علی','محمدی','09121110004','2004-08-02','male'),
('50000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','رها','حسینی','09121110005','2008-04-18','female'),
('50000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','پویا','صادقی','09121110006','1994-10-30','male'),
('50000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','آوا','میرزایی','09121110007','2010-01-12','female'),
('50000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','کیان','نوری','09121110008','2001-07-25','male'),
('50000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','سارا','شریفی','09121110009','1990-03-04','female'),
('50000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','امیر','آزاد','09121110010','2006-12-09','male'),
('50000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','الهام','سلیمانی','09121110011','1985-06-22','female'),
('50000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','فرهاد','عباسی','09121110012','1982-09-14','male')
on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name, mobile = excluded.mobile, birth_date = excluded.birth_date, gender = excluded.gender;

insert into students (id, tenant_id, person_id, student_number, status, joined_at) values
('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','1405001','active','2026-06-23'),
('60000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','1405002','active','2026-06-23'),
('60000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003','1405003','active','2026-06-24'),
('60000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000004','1405004','active','2026-06-24'),
('60000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000005','1405005','active','2026-06-25'),
('60000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000006','1405006','active','2026-06-25'),
('60000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000007','1405007','active','2026-06-26'),
('60000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000008','1405008','active','2026-06-26'),
('60000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000009','1405009','lead','2026-07-20'),
('60000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000010','1405010','frozen','2026-06-28')
on conflict (id) do update set status = excluded.status, joined_at = excluded.joined_at;

insert into instructors (id, tenant_id, person_id, bio, status) values
('70000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000011','{"specialty":"Adult English"}','active'),
('70000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000012','{"specialty":"Adult German"}','active')
on conflict (id) do update set bio = excluded.bio, status = excluded.status;

insert into classes (id, tenant_id, branch_id, term_id, level_id, instructor_id, room_id, code, capacity, fee_rials, class_type, status)
select '80000000-0000-0000-0000-000000000001', t.id, b.id, '40000000-0000-0000-0000-000000000001', l.id, '70000000-0000-0000-0000-000000000001', r.id, 'EN-A2-01', 14, 18000000, 'in_person', 'active'
from tenants t join branches b on b.tenant_id = t.id join rooms r on r.branch_id = b.id join program_levels l on l.tenant_id = t.id
where t.slug = 'demo' and r.name = 'سپیدار' and l.program_id = '20000000-0000-0000-0000-000000000001' and l.cefr_band = 'a2'
on conflict (id) do update set instructor_id = excluded.instructor_id, room_id = excluded.room_id, status = excluded.status;

insert into classes (id, tenant_id, branch_id, term_id, level_id, instructor_id, room_id, code, capacity, fee_rials, class_type, status)
select '80000000-0000-0000-0000-000000000002', t.id, b.id, '40000000-0000-0000-0000-000000000001', l.id, '70000000-0000-0000-0000-000000000002', r.id, 'DE-A1-01', 10, 20000000, 'online', 'active'
from tenants t join branches b on b.tenant_id = t.id join rooms r on r.branch_id = b.id join program_levels l on l.tenant_id = t.id
where t.slug = 'demo' and r.name = 'نارون' and l.program_id = '20000000-0000-0000-0000-000000000002' and l.cefr_band = 'a1'
on conflict (id) do update set instructor_id = excluded.instructor_id, room_id = excluded.room_id, status = excluded.status;

insert into class_sessions (id, tenant_id, class_id, instructor_id, room_id, starts_at, ends_at, recurrence_rule, meeting_provider, meeting_url, status) values
('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001',(select id from rooms where tenant_id = '00000000-0000-0000-0000-000000000001' and name = 'سپیدار'),(current_date + time '17:00')::timestamptz,(current_date + time '18:30')::timestamptz,'weekly','none',null,'scheduled'),
('90000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001',(select id from rooms where tenant_id = '00000000-0000-0000-0000-000000000001' and name = 'سپیدار'),(current_date - interval '2 days' + time '17:00')::timestamptz,(current_date - interval '2 days' + time '18:30')::timestamptz,'none','none',null,'completed'),
('90000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000002',null,(current_date + time '19:00')::timestamptz,(current_date + time '20:30')::timestamptz,'weekly','google_meet','https://meet.google.com/demo-german','scheduled')
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, status = excluded.status, meeting_provider = excluded.meeting_provider, meeting_url = excluded.meeting_url;

insert into enrollments (id, tenant_id, student_id, class_id, status) values
('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','active'),
('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','80000000-0000-0000-0000-000000000001','active'),
('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003','80000000-0000-0000-0000-000000000001','active'),
('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000004','80000000-0000-0000-0000-000000000002','active'),
('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000005','80000000-0000-0000-0000-000000000002','active'),
('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000006','80000000-0000-0000-0000-000000000002','pending')
on conflict (id) do update set status = excluded.status;

insert into attendance (tenant_id, session_id, enrollment_id, status, note) values
('00000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','present',null),
('00000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','late','۱۵ دقیقه تأخیر'),
('00000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','absent','اطلاع داده نشده')
on conflict (session_id, enrollment_id) do update set status = excluded.status, note = excluded.note, recorded_at = now();

insert into invoices (id, tenant_id, student_id, enrollment_id, number, total_rials, balance_rials, status, due_on) values
('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','INV-1405-001',18000000,0,'paid',current_date - 5),
('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','INV-1405-002',18000000,6000000,'partial',current_date + 3),
('b0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004','INV-1405-003',20000000,20000000,'issued',current_date + 7)
on conflict (id) do update set balance_rials = excluded.balance_rials, status = excluded.status, due_on = excluded.due_on;

insert into payments (id, tenant_id, invoice_id, provider, provider_reference, amount_rials, status, idempotency_key, verified_at) values
('c0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','manual','DEMO-PAID-001',18000000,'verified','demo-payment-001',now()),
('c0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','manual','DEMO-PARTIAL-002',12000000,'verified','demo-payment-002',now())
on conflict (id) do update set amount_rials = excluded.amount_rials, status = excluded.status, verified_at = excluded.verified_at;

commit;
