"use client";

import type { ClassOptions, ClassSummary, DashboardSummary, InstructorSummary, StudentSummary } from "@zabankadeh/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const fallback: DashboardSummary = {
  activeStudents: 248, activeClasses: 18, todaySessions: 7, outstandingRials: 186_500_000,
  todaySchedule: [],
  recentApplicants: [
    { id: "1", name: "کیانا محمودی", language: "en", status: "placement_ready" },
    { id: "2", name: "آراد سلیمانی", language: "de", status: "assessment_started" },
    { id: "3", name: "هلیا رضایی", language: "en", status: "placement_ready" },
  ],
};

const nav = ["نمای کلی", "زبان‌آموزان", "کلاس‌ها و برنامه", "مدرس‌ها", "حضور و غیاب", "مالی", "تعیین سطح", "گزارش‌ها"];

export function AdminDashboard() {
  const [data, setData] = useState(fallback);
  const [user, setUser] = useState<{ displayName: string }>();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(false);
  const [developmentCode, setDevelopmentCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [section, setSection] = useState<"dashboard" | "students" | "classes" | "instructors">("dashboard");
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [instructors, setInstructors] = useState<InstructorSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOptions>({ branches: [], levels: [], rooms: [], instructors: [], terms: [] });
  const [classFormOpen, setClassFormOpen] = useState(false);
  const displayName = user?.displayName ?? "مدیر آموزشگاه";
  useEffect(() => {
    fetch(`${API}/auth/session`, { method: "POST", credentials: "include" })
      .then((r) => r.ok ? r.json() : null).then((value) => value?.user && setUser(value.user)).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!user) return;
    fetch(`${API}/admin/dashboard`, { credentials: "include" }).then((r) => r.ok ? r.json() : null).then((value) => value && setData(value)).catch(() => undefined);
    void loadStudents();
    void loadInstructors();
    void loadClasses();
    void loadClassOptions();
  }, [user]);
  async function loadStudents(query = studentQuery) {
    const response = await fetch(`${API}/admin/students${query ? `?q=${encodeURIComponent(query)}` : ""}`, { credentials: "include" });
    if (!response.ok) throw new Error("دریافت فهرست زبان‌آموزان انجام نشد.");
    setStudents(await response.json() as StudentSummary[]);
  }
  async function createStudent(input: Record<string, unknown>) {
    setStudentError("");
    const response = await fetch(`${API}/admin/students`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.message ?? "ثبت زبان‌آموز انجام نشد.");
    setStudents((current) => [value as StudentSummary, ...current]);
    setStudentFormOpen(false);
  }
  async function openStudent(id: string) {
    const response = await fetch(`${API}/admin/students/${id}`, { credentials: "include" });
    if (response.ok) setSelectedStudent(await response.json() as StudentSummary);
  }
  async function updateStudent(id: string, input: Record<string, unknown>) {
    const response = await fetch(`${API}/admin/students/${id}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.message ?? "ویرایش زبان‌آموز انجام نشد.");
    setStudents((current) => current.map((student) => student.id === id ? value as StudentSummary : student)); setSelectedStudent(null);
  }
  async function loadInstructors() {
    const response = await fetch(`${API}/admin/instructors`, { credentials: "include" });
    if (response.ok) setInstructors(await response.json() as InstructorSummary[]);
  }
  async function createInstructor(input: Record<string, unknown>) {
    const response = await fetch(`${API}/admin/instructors`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const value = await response.json(); if (!response.ok) throw new Error(value.message ?? "ثبت مدرس انجام نشد.");
    setInstructors((current) => [...current, value as InstructorSummary]);
  }
  async function loadClasses() {
    const response = await fetch(`${API}/admin/classes`, { credentials: "include" });
    if (response.ok) setClasses(await response.json() as ClassSummary[]);
  }
  async function loadClassOptions() { const response = await fetch(`${API}/admin/classes/options`, { credentials: "include" }); if (response.ok) setClassOptions(await response.json() as ClassOptions); }
  async function createClass(input: Record<string, unknown>) { const response = await fetch(`${API}/admin/classes`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const value = await response.json(); if (!response.ok) throw new Error(value.message ?? "ساخت کلاس انجام نشد."); setClasses((current) => [...current, value as ClassSummary]); setClassFormOpen(false); }
  async function requestOtp() {
    setAuthError("");
    try {
      const response = await fetch(`${API}/auth/otp/request`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile }) });
      const value = await response.json();
      if (!response.ok) { setAuthError(value.message ?? "ارسال کد انجام نشد."); return; }
      setDevelopmentCode(value.developmentCode ?? ""); setChallenge(true);
    } catch {
      setAuthError("ارتباط با سرور برقرار نشد. لطفاً مطمئن شوید API در حال اجراست.");
    }
  }
  async function verifyOtp() {
    setAuthError("");
    try {
      const response = await fetch(`${API}/auth/otp/verify`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile, code }) });
      const value = await response.json();
      if (!response.ok) { setAuthError(value.message ?? "کد واردشده معتبر نیست."); return; }
      setUser(value.user);
    } catch {
      setAuthError("ارتباط با سرور برقرار نشد. لطفاً مطمئن شوید API در حال اجراست.");
    }
  }
  if (!user) return <div className="assessment-page"><div className="assessment-intro"><Link href="/" className="brand"><span className="brand-mark">ز</span><span>زبانکده</span></Link><div className="auth-card"><span className="kicker">ورود کارکنان</span><h1>خوش آمدید.</h1><p>برای ورود، شماره موبایل خود را وارد کنید.</p>{!challenge ? <form onSubmit={(event) => { event.preventDefault(); void requestOtp(); }}><label>شماره موبایل<input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" required placeholder="۰۹۱۲۱۲۳۴۵۶۷" /></label><button className="button primary wide">دریافت کد ورود</button></form> : <form onSubmit={(event) => { event.preventDefault(); void verifyOtp(); }}><label>کد پیامک‌شده<input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required maxLength={6} placeholder="۱۲۳۴۵۶" /></label>{developmentCode && <small>کد توسعه: {developmentCode}</small>}<button className="button primary wide">ورود به داشبورد</button></form>}{authError && <p className="form-error">{authError}</p>}</div></div></div>;
  const cards = [
    { label: "زبان‌آموز فعال", value: data.activeStudents.toLocaleString("fa-IR"), icon: "users" as const, note: "۱۲ نفر بیشتر از ماه قبل" },
    { label: "کلاس فعال", value: data.activeClasses.toLocaleString("fa-IR"), icon: "book" as const, note: "در ۲ شعبه" },
    { label: "جلسه امروز", value: data.todaySessions.toLocaleString("fa-IR"), icon: "calendar" as const, note: "نخستین جلسه ساعت ۱۰" },
    { label: "مانده دریافتنی", value: `${Math.round(data.outstandingRials / 10_000_000).toLocaleString("fa-IR")} م`, icon: "wallet" as const, note: "مبالغ به تومان" },
  ];
  async function logout() {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    setUser(undefined);
  }
  const schedule = data.todaySchedule;
  return <div className="admin-layout">
    <aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">ز</span><span>زبانکده</span></Link><div className="institute-chip"><span>آکادمی سپهر</span><small>شعبه مرکزی</small></div><nav>{nav.map((item, index) => <button className={(section === "dashboard" ? index === 0 : section === "students" ? index === 1 : section === "classes" ? index === 2 : index === 3) ? "active" : ""} key={item} onClick={() => { if (index === 0) setSection("dashboard"); if (index === 1) setSection("students"); if (index === 2) setSection("classes"); if (index === 3) setSection("instructors"); }}><span className="nav-dot" />{item}</button>)}</nav><div className="sidebar-bottom"><button>تنظیمات آموزشگاه</button><button onClick={() => void logout()}>خروج از حساب</button><div className="user-chip"><span>{displayName.slice(0, 1)}</span><div><strong>{displayName}</strong><small>کاربر آموزشگاه</small></div></div></div></aside>
    <main className="dashboard">{section === "students" ? <StudentManagement students={students} query={studentQuery} setQuery={setStudentQuery} onSearch={() => void loadStudents()} formOpen={studentFormOpen} setFormOpen={setStudentFormOpen} onCreate={createStudent} selected={selectedStudent} onOpen={openStudent} onClose={() => setSelectedStudent(null)} onUpdate={updateStudent} /> : section === "classes" ? <ClassManagement classes={classes} options={classOptions} formOpen={classFormOpen} setFormOpen={setClassFormOpen} onCreate={createClass} /> : section === "instructors" ? <InstructorManagement instructors={instructors} onCreate={createInstructor} /> : <><header><div><span className="mobile-brand">زبانکده</span><h1>سلام {displayName}، روزت بخیر.</h1><p>این نمای کوتاهی از وضعیت امروز آموزشگاه است.</p></div><div className="dashboard-actions"><button>اعلان‌ها</button><button className="button primary" onClick={() => { setSection("students"); setStudentFormOpen(true); }}>+ ثبت‌نام جدید</button></div></header>
      <section className="stats-grid">{cards.map((card) => <article key={card.label}><div className="stat-icon"><Icon name={card.icon} /></div><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></article>)}</section>
      <div className="dashboard-grid"><section className="panel schedule-panel"><div className="panel-title"><div><h2>برنامه امروز</h2><p>یکشنبه، ۲۸ تیر ۱۴۰۵</p></div><button>مشاهده تقویم</button></div>
        <div className="schedule-list">{schedule.length ? schedule.map((row) => <article key={row.id}><time>{new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(row.startsAt))}</time><i className={row.language} /><div><strong dir="ltr">{row.level} · {row.classCode}</strong><span>{row.instructorName ?? "مدرس تعیین نشده"} · {row.roomName ?? "اتاق تعیین نشده"}</span></div><span className="status-pill">برگزار می‌شود</span></article>) : <p className="empty-state">برای امروز جلسه‌ای ثبت نشده است.</p>}</div>
      </section>
      <section className="panel applicants-panel"><div className="panel-title"><div><h2>متقاضیان تازه</h2><p>آخرین فعالیت‌های تعیین سطح</p></div><button>همه</button></div><div className="applicant-list">{data.recentApplicants.map((person) => <article key={person.id}><span className="avatar">{person.name.slice(0, 1)}</span><div><strong>{person.name}</strong><small>{person.language === "en" ? "انگلیسی" : "آلمانی"}</small></div><span className={`applicant-status ${person.status}`}>{person.status === "placement_ready" ? "نتیجه آماده" : "در حال آزمون"}</span></article>)}</div><Link href="/assessment" className="panel-cta">ارسال لینک تعیین سطح <Icon name="arrow" size={18} /></Link></section></div>
      <section className="quick-actions"><h2>دسترسی سریع</h2><div><button onClick={() => { setSection("students"); setStudentFormOpen(true); }}><Icon name="users" />افزودن زبان‌آموز</button><button><Icon name="calendar" />ساخت کلاس جدید</button><button><Icon name="check" />ثبت حضور و غیاب</button><button><Icon name="wallet" />ثبت دریافت</button></div></section></>}</main>
  </div>;
}

function StudentManagement({ students, query, setQuery, onSearch, formOpen, setFormOpen, onCreate, selected, onOpen, onClose, onUpdate }: { students: StudentSummary[]; query: string; setQuery: (value: string) => void; onSearch: () => void; formOpen: boolean; setFormOpen: (value: boolean) => void; onCreate: (input: Record<string, unknown>) => Promise<void>; selected: StudentSummary | null; onOpen: (id: string) => Promise<void>; onClose: () => void; onUpdate: (id: string, input: Record<string, unknown>) => Promise<void> }) {
  if (selected) return <StudentDetail student={selected} onClose={onClose} onUpdate={onUpdate} />;
  return <>
    <header><div><span className="mobile-brand">مدیریت آموزشگاه</span><h1>زبان‌آموزان</h1><p>ثبت‌نام، جست‌وجو و پیگیری زبان‌آموزان آموزشگاه.</p></div><button className="button primary" onClick={() => setFormOpen(true)}>+ زبان‌آموز جدید</button></header>
    <section className="student-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} placeholder="جست‌وجوی نام، شماره تماس یا کد زبان‌آموز" /><button className="button secondary" onClick={onSearch}>جست‌وجو</button></section>
    {formOpen && <StudentForm onCancel={() => setFormOpen(false)} onCreate={onCreate} />}
    <section className="panel student-panel"><div className="panel-title"><div><h2>فهرست زبان‌آموزان</h2><p>{students.length.toLocaleString("fa-IR")} نتیجه</p></div></div><div className="student-list">{students.length ? students.map((student) => <article key={student.id} onClick={() => void onOpen(student.id)} className="student-row"><StudentAvatar student={student} /><div><strong>{student.firstName} {student.lastName}</strong><small>{student.studentNumber}{student.mobile ? ` · ${student.mobile}` : ""}{student.birthDateJalali ? ` · ${student.birthDateJalali}` : ""}</small></div><span className="student-guardian">{student.guardianName ? `ولی: ${student.guardianName}` : "بدون ولی ثبت‌شده"}</span><span className="status-pill">{student.status === "active" ? "فعال" : student.status}</span></article>) : <p className="empty-state">هنوز زبان‌آموزی ثبت نشده است.</p>}</div></section>
  </>;
}

function InstructorManagement({ instructors, onCreate }: { instructors: InstructorSummary[]; onCreate: (input: Record<string, unknown>) => Promise<void> }) {
  const [open, setOpen] = useState(false); const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [mobile, setMobile] = useState(""); const [error, setError] = useState("");
  return <><header><div><span className="mobile-brand">مدیریت آموزشگاه</span><h1>مدرس‌ها</h1><p>مدیریت اعضای تیم آموزشی.</p></div><button className="button primary" onClick={() => setOpen(true)}>+ مدرس جدید</button></header>{open && <section className="panel student-form"><div className="panel-title"><h2>ثبت مدرس</h2><button onClick={() => setOpen(false)}>بستن</button></div><form onSubmit={(event) => { event.preventDefault(); setError(""); void onCreate({ firstName, lastName, mobile }).then(() => { setOpen(false); setFirstName(""); setLastName(""); setMobile(""); }).catch((value: Error) => setError(value.message)); }}><div className="student-form-grid"><label>نام<input required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label>نام خانوادگی<input required value={lastName} onChange={(event) => setLastName(event.target.value)} /></label><label>شماره موبایل<input value={mobile} onChange={(event) => setMobile(event.target.value)} /></label></div>{error && <p className="form-error">{error}</p>}<div className="student-form-actions"><button className="button primary">ثبت مدرس</button></div></form></section>}<section className="panel student-panel"><div className="student-list">{instructors.length ? instructors.map((instructor) => <article key={instructor.id}><span className="student-avatar adult other">🧑🏻</span><div><strong>{instructor.firstName} {instructor.lastName}</strong><small>{instructor.mobile ?? "بدون شماره تماس"}</small></div><span className="status-pill">فعال</span></article>) : <p className="empty-state">هنوز مدرسی ثبت نشده است.</p>}</div></section></>;
}

function ClassManagement({ classes, options, formOpen, setFormOpen, onCreate }: { classes: ClassSummary[]; options: ClassOptions; formOpen: boolean; setFormOpen: (value: boolean) => void; onCreate: (input: Record<string, unknown>) => Promise<void> }) {
  return <><header><div><span className="mobile-brand">برنامه آموزشگاه</span><h1>کلاس‌ها و برنامه</h1><p>نمایش کلاس‌های تعریف‌شده و وضعیت برگزاری آن‌ها.</p></div><button className="button primary" onClick={() => setFormOpen(true)}>+ ساخت کلاس</button></header>{formOpen && <ClassForm options={options} onCancel={() => setFormOpen(false)} onCreate={onCreate} />}<section className="panel student-panel"><div className="panel-title"><div><h2>کلاس‌ها</h2><p>{classes.length.toLocaleString("fa-IR")} کلاس ثبت شده</p></div></div><div className="class-list">{classes.length ? classes.map((item) => <article key={item.id}><div className="class-code">{item.code}</div><div><strong>{item.level} · {item.language === "en" ? "انگلیسی" : "آلمانی"}</strong><small>{item.branchName} · {item.roomName ?? "اتاق تعیین نشده"}</small></div><div><small>مدرس</small><strong>{item.instructorName ?? "تعیین نشده"}</strong></div><div><small>ظرفیت</small><strong>{item.capacity.toLocaleString("fa-IR")} نفر</strong></div><span className="status-pill">{item.status === "active" ? "فعال" : item.status}</span></article>) : <p className="empty-state">هنوز کلاسی تعریف نشده است.</p>}</div></section></>;
}

function ClassForm({ options, onCancel, onCreate }: { options: ClassOptions; onCancel: () => void; onCreate: (input: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ code: "", branchId: options.branches[0]?.id ?? "", termId: options.terms[0]?.id ?? "", language: "en", levelId: options.levels.find((item) => item.language === "en")?.id ?? "", instructorId: "", roomId: "", capacity: "12", feeRials: "0", classType: "in_person" }); const [error, setError] = useState(""); const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value })); const levels = options.levels.filter((item) => item.language === form.language);
  return <section className="panel student-form"><div className="panel-title"><h2>ساخت کلاس جدید</h2><button onClick={onCancel}>بستن</button></div><form onSubmit={(event) => { event.preventDefault(); void onCreate({ ...form, capacity: Number(form.capacity), feeRials: Number(form.feeRials) }).catch((value: Error) => setError(value.message)); }}><div className="student-form-grid"><label>کد کلاس<input required dir="ltr" placeholder="EN-A2-01" value={form.code} onChange={(event) => update("code", event.target.value)} /></label><label>زبان<select value={form.language} onChange={(event) => { const language = event.target.value; update("language", language); update("levelId", options.levels.find((item) => item.language === language)?.id ?? ""); }}><option value="en">انگلیسی</option><option value="de">آلمانی</option></select></label><label>شعبه<select value={form.branchId} onChange={(event) => update("branchId", event.target.value)}>{options.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>ترم<select value={form.termId} onChange={(event) => update("termId", event.target.value)}>{options.terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>سطح<select value={form.levelId} onChange={(event) => update("levelId", event.target.value)}>{levels.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>نوع کلاس<select value={form.classType} onChange={(event) => update("classType", event.target.value)}><option value="in_person">حضوری</option><option value="online">آنلاین</option><option value="hybrid">ترکیبی</option></select></label><label>مدرس<select value={form.instructorId} onChange={(event) => update("instructorId", event.target.value)}><option value="">تعیین نشده</option>{options.instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>اتاق<select value={form.roomId} onChange={(event) => update("roomId", event.target.value)}><option value="">تعیین نشده</option>{options.rooms.filter((item) => !form.branchId || item.branchId === form.branchId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>ظرفیت<input type="number" min="1" value={form.capacity} onChange={(event) => update("capacity", event.target.value)} /></label><label>شهریه (ریال)<input inputMode="numeric" dir="ltr" value={formatRials(form.feeRials)} onChange={(event) => update("feeRials", event.target.value.replace(/[^0-9]/g, ""))} placeholder="50,000,000" /></label></div>{error && <p className="form-error">{error}</p>}<div className="student-form-actions"><button className="button secondary" type="button" onClick={onCancel}>انصراف</button><button className="button primary">ساخت کلاس</button></div></form></section>;
}

function formatRials(value: string) { return value ? Number(value).toLocaleString("en-US") : ""; }

function StudentDetail({ student, onClose, onUpdate }: { student: StudentSummary; onClose: () => void; onUpdate: (id: string, input: Record<string, unknown>) => Promise<void> }) {
  const detail = student as StudentSummary & { email?: string | null; nationalId?: string | null; guardianRelationship?: string | null };
  const [form, setForm] = useState({ firstName: student.firstName, lastName: student.lastName, mobile: student.mobile ?? "", email: detail.email ?? "", birthDate: student.birthDateJalali ?? "", gender: student.gender ?? "other", status: student.status, guardianName: student.guardianName ?? "", guardianMobile: student.guardianMobile ?? "", guardianRelationship: detail.guardianRelationship ?? "مادر" });
  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <><header><div><button className="detail-back" onClick={onClose}>← بازگشت به فهرست</button><h1>پرونده زبان‌آموز</h1><p>{student.studentNumber}</p></div></header><section className="panel student-form student-detail"><div className="student-detail-heading"><StudentAvatar student={{ ...student, gender: form.gender as StudentSummary["gender"], birthDateJalali: form.birthDate }} /><div><h2>{student.firstName} {student.lastName}</h2><p>تاریخ عضویت: {student.joinedAt}</p></div></div><form onSubmit={(event) => { event.preventDefault(); setError(""); const [guardianFirstName = "", ...rest] = form.guardianName.split(" "); void onUpdate(student.id, { firstName: form.firstName, lastName: form.lastName, mobile: form.mobile, email: form.email, birthDate: form.birthDate, gender: form.gender, status: form.status, guardian: form.guardianName || form.guardianMobile ? { firstName: guardianFirstName, lastName: rest.join(" "), mobile: form.guardianMobile, relationship: form.guardianRelationship } : undefined }).catch((value: Error) => setError(value.message)); }}><div className="student-form-grid"><label>نام<input required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></label><label>نام خانوادگی<input required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label><label>جنسیت<select value={form.gender} onChange={(event) => update("gender", event.target.value)}><option value="female">دختر / زن</option><option value="male">پسر / مرد</option><option value="other">سایر</option></select></label><label>تاریخ تولد<input dir="ltr" placeholder="۱۴۰۰/۰۵/۲۱" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} /></label><label>شماره موبایل<input value={form.mobile} onChange={(event) => update("mobile", event.target.value)} /></label><label>ایمیل<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label><label>وضعیت<select value={form.status} onChange={(event) => update("status", event.target.value)}><option value="active">فعال</option><option value="lead">سرنخ</option><option value="frozen">متوقف</option><option value="inactive">غیرفعال</option></select></label><label>نام کامل ولی<input value={form.guardianName} onChange={(event) => update("guardianName", event.target.value)} /></label><label>موبایل ولی<input value={form.guardianMobile} onChange={(event) => update("guardianMobile", event.target.value)} /></label><label>نسبت ولی<input value={form.guardianRelationship} onChange={(event) => update("guardianRelationship", event.target.value)} /></label></div>{error && <p className="form-error">{error}</p>}<div className="student-form-actions"><button className="button primary">ذخیره تغییرات</button></div></form></section></>;
}

function StudentForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (input: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", mobile: "", email: "", birthDate: "", gender: "female", guardianFirstName: "", guardianLastName: "", guardianMobile: "", relationship: "مادر" });
  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <section className="panel student-form"><div className="panel-title"><div><h2>ثبت زبان‌آموز جدید</h2><p>اطلاعات پایه و ولی را وارد کنید.</p></div><button onClick={onCancel}>بستن</button></div><form onSubmit={(event) => { event.preventDefault(); setError(""); void onCreate({ firstName: form.firstName, lastName: form.lastName, mobile: form.mobile, email: form.email, birthDate: form.birthDate, gender: form.gender, guardian: form.guardianFirstName || form.guardianLastName || form.guardianMobile ? { firstName: form.guardianFirstName, lastName: form.guardianLastName, mobile: form.guardianMobile, relationship: form.relationship } : undefined }).catch((value: Error) => setError(value.message)); }}><div className="student-form-grid"><label>نام<input required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></label><label>نام خانوادگی<input required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label><label>جنسیت<select value={form.gender} onChange={(event) => update("gender", event.target.value)}><option value="female">دختر / زن</option><option value="male">پسر / مرد</option><option value="other">سایر</option></select></label><label>تاریخ تولد<input dir="ltr" placeholder="۱۴۰۰/۰۵/۲۱" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} /></label><label>شماره موبایل<input inputMode="tel" value={form.mobile} onChange={(event) => update("mobile", event.target.value)} /></label><label>ایمیل<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label><label>نام ولی<input value={form.guardianFirstName} onChange={(event) => update("guardianFirstName", event.target.value)} /></label><label>نام خانوادگی ولی<input value={form.guardianLastName} onChange={(event) => update("guardianLastName", event.target.value)} /></label><label>موبایل ولی<input inputMode="tel" value={form.guardianMobile} onChange={(event) => update("guardianMobile", event.target.value)} /></label><label>نسبت<input value={form.relationship} onChange={(event) => update("relationship", event.target.value)} /></label></div>{error && <p className="form-error">{error}</p>}<div className="student-form-actions"><button type="button" className="button secondary" onClick={onCancel}>انصراف</button><button className="button primary">ثبت زبان‌آموز</button></div></form></section>;
}

function StudentAvatar({ student }: { student: StudentSummary }) {
  const age = student.birthDateJalali ? jalaliAge(student.birthDateJalali) : 18;
  const child = age < 13;
  const emoji = child ? (student.gender === "male" ? "👦" : student.gender === "female" ? "👧" : "🧒") : student.gender === "male" ? "👨🏻" : student.gender === "female" ? "👩🏻" : "🧑🏻";
  return <span className={`student-avatar ${child ? "child" : "adult"} ${student.gender ?? "other"}`} aria-label={child ? "آواتار کودک" : "آواتار بزرگسال"}>{emoji}</span>;
}

function jalaliAge(value: string) {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value);
  if (!match) return 18;
  const today = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const current = Number(today.find((part) => part.type === "year")?.value ?? 1403);
  return Math.max(0, current - Number(match[1]));
}
