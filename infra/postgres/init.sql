create extension if not exists pgcrypto;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fa text not null,
  name_en text not null,
  status text not null default 'active' check (status in ('active','suspended')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table branches (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  name_fa text not null, name_en text not null, phone text, address jsonb not null default '{}'::jsonb,
  status text not null default 'active', unique (tenant_id, name_fa)
);
create table rooms (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), branch_id uuid not null references branches(id),
  name text not null, capacity integer not null check (capacity > 0), unique (branch_id, name)
);
create table users (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  mobile text not null, display_name text not null, locale text not null default 'fa', status text not null default 'active',
  created_at timestamptz not null default now(), unique (tenant_id, mobile)
);
create table user_roles (
  tenant_id uuid not null references tenants(id), user_id uuid not null references users(id), branch_id uuid references branches(id),
  role text not null check (role in ('owner','branch_manager','registrar','finance','academic_supervisor','instructor','student','guardian')),
  primary key (user_id, role, branch_id)
);

create table auth_otp_challenges (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  mobile text not null, code_hash text not null, expires_at timestamptz not null,
  consumed_at timestamptz, attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now()
);
create index auth_otp_challenges_lookup_idx on auth_otp_challenges (tenant_id, mobile, created_at desc);

create table auth_sessions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id), token_hash text not null unique,
  expires_at timestamptz not null, revoked_at timestamptz,
  created_at timestamptz not null default now(), last_seen_at timestamptz not null default now()
);
create index auth_sessions_user_idx on auth_sessions (tenant_id, user_id, expires_at);
create table people (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  first_name text not null, last_name text not null, mobile text, email text, birth_date date, gender text check (gender in ('female','male','other')), national_id text,
  preferred_locale text not null default 'fa', created_at timestamptz not null default now()
);
create index people_tenant_name_idx on people (tenant_id, last_name, first_name);
create table students (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), person_id uuid not null references people(id),
  student_number text not null, status text not null default 'active' check (status in ('lead','active','frozen','inactive')),
  joined_at date not null default current_date, unique (tenant_id, student_number), unique (tenant_id, person_id)
);
create table guardians (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), person_id uuid not null references people(id),
  unique (tenant_id, person_id)
);
create table student_guardians (
  tenant_id uuid not null references tenants(id), student_id uuid not null references students(id), guardian_id uuid not null references guardians(id),
  relationship text not null, can_collect boolean not null default true, receives_finance_messages boolean not null default true,
  primary key (student_id, guardian_id)
);
create table instructors (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), person_id uuid not null references people(id),
  bio jsonb not null default '{}'::jsonb, status text not null default 'active', unique (tenant_id, person_id)
);
create table programs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  language text not null check (language in ('en','de')), age_band text not null check (age_band in ('child','teen','adult')),
  name_fa text not null, name_en text not null, status text not null default 'active'
);
create table program_levels (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), program_id uuid not null references programs(id),
  code text not null, name_fa text not null, name_en text not null, cefr_band text, sort_order integer not null,
  unique (program_id, code)
);
create table terms (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  name text not null, starts_on date not null, ends_on date not null, status text not null default 'draft', check (ends_on >= starts_on)
);
insert into terms (tenant_id, name, starts_on, ends_on, status)
select id, 'ترم تابستان ۱۴۰۵', '2026-06-22', '2026-09-22', 'active'
from tenants where slug = 'demo' and not exists (select 1 from terms where tenant_id = tenants.id);
create table classes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), branch_id uuid not null references branches(id),
  term_id uuid not null references terms(id), level_id uuid not null references program_levels(id), instructor_id uuid references instructors(id),
  room_id uuid references rooms(id), code text not null, capacity integer not null check (capacity > 0),
  fee_rials bigint not null check (fee_rials >= 0), class_type text not null default 'in_person' check (class_type in ('in_person','online','hybrid')), status text not null default 'draft' check (status in ('draft','active','completed','cancelled')),
  unique (tenant_id, code)
);
create table class_sessions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), class_id uuid not null references classes(id),
  instructor_id uuid references instructors(id), room_id uuid references rooms(id), starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'scheduled', check (ends_at > starts_at)
);
create index class_sessions_conflict_idx on class_sessions (tenant_id, starts_at, ends_at);
create table enrollments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), student_id uuid not null references students(id),
  class_id uuid not null references classes(id), status text not null default 'active' check (status in ('pending','active','frozen','transferred','cancelled','completed')),
  enrolled_at timestamptz not null default now(), unique (student_id, class_id)
);
create table attendance (
  tenant_id uuid not null references tenants(id), session_id uuid not null references class_sessions(id), enrollment_id uuid not null references enrollments(id),
  status text not null check (status in ('present','absent','late','excused')), note text, recorded_at timestamptz not null default now(),
  primary key (session_id, enrollment_id)
);
create table invoices (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), student_id uuid not null references students(id),
  enrollment_id uuid references enrollments(id), number text not null, total_rials bigint not null check (total_rials >= 0),
  balance_rials bigint not null check (balance_rials >= 0), status text not null check (status in ('draft','issued','partial','paid','void','refunded')),
  due_on date, created_at timestamptz not null default now(), unique (tenant_id, number)
);
create table payments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), invoice_id uuid not null references invoices(id),
  provider text not null, provider_reference text, amount_rials bigint not null check (amount_rials > 0),
  status text not null check (status in ('created','pending','verified','failed','refunded')),
  idempotency_key text not null, verified_at timestamptz, created_at timestamptz not null default now(), unique (tenant_id, idempotency_key)
);
create unique index payments_provider_reference_idx on payments (provider, provider_reference) where provider_reference is not null;

create table assessment_questions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  language text not null check (language in ('en','de')), age_band text not null check (age_band in ('all','child','teen','adult')),
  skill text not null check (skill in ('grammar','vocabulary','reading','listening')), proposed_band text not null,
  prompt text not null, passage text, audio_url text, options jsonb not null, correct_options text[] not null,
  points integer not null default 1 check (points > 0), source text not null, license text not null,
  validation_status text not null default 'draft' check (validation_status in ('draft','expert_reviewed','pilot_validated')),
  version integer not null default 1, status text not null default 'draft' check (status in ('draft','published','retired')),
  created_at timestamptz not null default now()
);
create index assessment_questions_pool_idx on assessment_questions (tenant_id, language, age_band, status);
create table assessment_attempts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  candidate_name text not null, candidate_mobile text, language text not null, age_band text not null,
  question_ids uuid[] not null, scoring_version text not null, answers jsonb not null default '[]'::jsonb,
  score integer, recommended_band text, confidence text, skill_scores jsonb,
  expires_at timestamptz not null, submitted_at timestamptz, override_band text, override_reason text, overridden_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table website_pages (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), slug text not null,
  title jsonb not null, body jsonb not null, status text not null default 'draft', sort_order integer not null default 0,
  unique (tenant_id, slug)
);
create table outbox_jobs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), topic text not null,
  payload jsonb not null, status text not null default 'pending', attempts integer not null default 0,
  available_at timestamptz not null default now(), processed_at timestamptz
);
create table audit_events (
  id bigserial primary key, tenant_id uuid not null references tenants(id), actor_user_id uuid references users(id),
  action text not null, entity_type text not null, entity_id text not null, before_data jsonb, after_data jsonb,
  occurred_at timestamptz not null default now()
);
create index audit_events_entity_idx on audit_events (tenant_id, entity_type, entity_id, occurred_at desc);

insert into tenants (id, slug, name_fa, name_en, settings) values
('00000000-0000-0000-0000-000000000001', 'demo', 'آکادمی زبان سپهر', 'Sepehr Language Academy',
 '{"tagline":{"fa":"زبان تازه، افق تازه","en":"A new language, a wider world"},"primaryColor":"#12372a","phone":"021-8877-2211","address":{"fa":"تهران، میدان ونک","en":"Vanak Square, Tehran"}}');
insert into branches (id, tenant_id, name_fa, name_en, phone) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','شعبه مرکزی','Central branch','021-8877-2211');
insert into rooms (tenant_id, branch_id, name, capacity) values
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','سپیدار',14),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','نارون',10);

insert into programs (id, tenant_id, language, age_band, name_fa, name_en) values
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','en','adult','انگلیسی بزرگسالان','Adult English'),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','de','adult','آلمانی بزرگسالان','Adult German'),
('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','en','child','انگلیسی کودکان','Children English'),
('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','de','child','آلمانی کودکان','Children German');
insert into program_levels (tenant_id, program_id, code, name_fa, name_en, cefr_band, sort_order)
select '00000000-0000-0000-0000-000000000001', p.id, upper(p.language)||'-'||upper(b), upper(b), upper(b), b, ord
from programs p cross join (values ('a1',1),('a2',2),('b1',3),('b2',4),('c1',5)) as levels(b,ord);

insert into assessment_questions
(tenant_id, language, age_band, skill, proposed_band, prompt, passage, options, correct_options, points, source, license, validation_status, status) values
('00000000-0000-0000-0000-000000000001','en','all','grammar','a1','She ___ from Tehran.',null,'[{"id":"a","label":"is"},{"id":"b","label":"are"},{"id":"c","label":"be"}]','{a}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','en','all','vocabulary','a1','Choose the opposite of “expensive”.',null,'[{"id":"a","label":"cheap"},{"id":"b","label":"heavy"},{"id":"c","label":"quiet"}]','{a}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','en','all','grammar','a2','I have lived here ___ 2022.',null,'[{"id":"a","label":"for"},{"id":"b","label":"since"},{"id":"c","label":"during"}]','{b}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','en','all','reading','a2','Why did Mina take the bus?','Mina usually walks to work, but it was raining heavily this morning, so she took the bus.','[{"id":"a","label":"She was late"},{"id":"b","label":"It was raining"},{"id":"c","label":"Her car broke down"}]','{b}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','en','all','grammar','b1','If I ___ more time, I would learn German too.',null,'[{"id":"a","label":"have"},{"id":"b","label":"had"},{"id":"c","label":"would have"}]','{b}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','en','all','vocabulary','b1','The meeting was ___ until Tuesday.',null,'[{"id":"a","label":"put off"},{"id":"b","label":"put out"},{"id":"c","label":"put up"}]','{a}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','en','all','reading','b2','What does the writer imply?','Although remote work offers flexibility, its success depends less on location than on clear expectations and deliberate communication.','[{"id":"a","label":"Remote work always improves communication"},{"id":"b","label":"Location is the only important factor"},{"id":"c","label":"Working practices determine success"}]','{c}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','en','all','grammar','c1','Hardly ___ the announcement when questions began.',null,'[{"id":"a","label":"they had finished"},{"id":"b","label":"had they finished"},{"id":"c","label":"they finished"}]','{b}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','de','all','grammar','a1','Ich ___ aus Teheran.',null,'[{"id":"a","label":"komme"},{"id":"b","label":"kommt"},{"id":"c","label":"kommen"}]','{a}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','de','all','vocabulary','a1','Was ist das Gegenteil von „teuer“?',null,'[{"id":"a","label":"billig"},{"id":"b","label":"schwer"},{"id":"c","label":"leise"}]','{a}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','de','all','grammar','a2','Wir wohnen ___ drei Jahren hier.',null,'[{"id":"a","label":"seit"},{"id":"b","label":"vor"},{"id":"c","label":"ab"}]','{a}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','de','all','reading','a2','Warum fährt Lena mit dem Bus?','Normalerweise geht Lena zu Fuß. Heute regnet es stark, deshalb fährt sie mit dem Bus.','[{"id":"a","label":"Sie ist müde"},{"id":"b","label":"Es regnet"},{"id":"c","label":"Sie hat viel Gepäck"}]','{b}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','de','all','grammar','b1','Wenn ich mehr Zeit ___, würde ich öfter lesen.',null,'[{"id":"a","label":"habe"},{"id":"b","label":"hätte"},{"id":"c","label":"hatte"}]','{b}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','de','all','vocabulary','b1','Die Sitzung wurde auf Dienstag ___.',null,'[{"id":"a","label":"verschoben"},{"id":"b","label":"versprochen"},{"id":"c","label":"verstanden"}]','{a}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','de','all','reading','b2','Was ist die Kernaussage?','Flexibles Arbeiten gelingt nicht automatisch. Entscheidend sind klare Ziele und eine bewusste Kommunikation im Team.','[{"id":"a","label":"Flexibilität reicht aus"},{"id":"b","label":"Gute Arbeitsweisen sind entscheidend"},{"id":"c","label":"Teams sollten nie online arbeiten"}]','{b}',1,'Original demo item','Proprietary demo','expert_reviewed','published'),
('00000000-0000-0000-0000-000000000001','de','all','grammar','c1','Kaum ___ er angekommen, begann die Besprechung.',null,'[{"id":"a","label":"war"},{"id":"b","label":"ist"},{"id":"c","label":"wäre"}]','{a}',1,'Original demo item','Proprietary demo','expert_reviewed','published');

insert into website_pages (tenant_id, slug, title, body, status, sort_order) values
('00000000-0000-0000-0000-000000000001','about','{"fa":"درباره ما","en":"About us"}','{"fa":"آموزش کاربردی زبان برای زندگی واقعی.","en":"Practical language learning for real life."}','published',1),
('00000000-0000-0000-0000-000000000001','contact','{"fa":"تماس با ما","en":"Contact"}','{"fa":"برای مشاوره با ما تماس بگیرید.","en":"Contact us for a consultation."}','published',2);
