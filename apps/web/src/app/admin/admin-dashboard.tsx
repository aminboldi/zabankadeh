"use client";

import type { DashboardSummary } from "@zabankadeh/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const fallback: DashboardSummary = {
  activeStudents: 248, activeClasses: 18, todaySessions: 7, outstandingRials: 186_500_000,
  recentApplicants: [
    { id: "1", name: "کیانا محمودی", language: "en", status: "placement_ready" },
    { id: "2", name: "آراد سلیمانی", language: "de", status: "assessment_started" },
    { id: "3", name: "هلیا رضایی", language: "en", status: "placement_ready" },
  ],
};

const nav = ["نمای کلی", "زبان‌آموزان", "کلاس‌ها و برنامه", "مدرس‌ها", "حضور و غیاب", "مالی", "تعیین سطح", "گزارش‌ها"];

export function AdminDashboard() {
  const [data, setData] = useState(fallback);
  useEffect(() => { fetch(`${API}/admin/dashboard`, { headers: { "x-admin-key": "demo-admin" } }).then((r) => r.ok ? r.json() : null).then((value) => value && setData(value)).catch(() => undefined); }, []);
  const cards = [
    { label: "زبان‌آموز فعال", value: data.activeStudents.toLocaleString("fa-IR"), icon: "users" as const, note: "۱۲ نفر بیشتر از ماه قبل" },
    { label: "کلاس فعال", value: data.activeClasses.toLocaleString("fa-IR"), icon: "book" as const, note: "در ۲ شعبه" },
    { label: "جلسه امروز", value: data.todaySessions.toLocaleString("fa-IR"), icon: "calendar" as const, note: "نخستین جلسه ساعت ۱۰" },
    { label: "مانده دریافتنی", value: `${Math.round(data.outstandingRials / 10_000_000).toLocaleString("fa-IR")} م`, icon: "wallet" as const, note: "مبالغ به تومان" },
  ];
  return <div className="admin-layout">
    <aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">ز</span><span>زبانکده</span></Link><div className="institute-chip"><span>آکادمی سپهر</span><small>شعبه مرکزی</small></div><nav>{nav.map((item, index) => <button className={index === 0 ? "active" : ""} key={item}><span className="nav-dot" />{item}</button>)}</nav><div className="sidebar-bottom"><button>تنظیمات آموزشگاه</button><div className="user-chip"><span>م‌ن</span><div><strong>مریم نادری</strong><small>مدیر آموزشگاه</small></div></div></div></aside>
    <main className="dashboard"><header><div><span className="mobile-brand">زبانکده</span><h1>سلام مریم، روزت بخیر.</h1><p>این نمای کوتاهی از وضعیت امروز آموزشگاه است.</p></div><div className="dashboard-actions"><button>۲ اعلان</button><button className="button primary">+ ثبت‌نام جدید</button></div></header>
      <section className="stats-grid">{cards.map((card) => <article key={card.label}><div className="stat-icon"><Icon name={card.icon} /></div><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></article>)}</section>
      <div className="dashboard-grid"><section className="panel schedule-panel"><div className="panel-title"><div><h2>برنامه امروز</h2><p>یکشنبه، ۲۸ تیر ۱۴۰۵</p></div><button>مشاهده تقویم</button></div>
        <div className="schedule-list">{[
          ["۱۰:۰۰", "English A2 · 104", "سارا محمدی", "کلاس سپیدار", "en"], ["۱۲:۳۰", "Deutsch A1 · 207", "امیر شریفی", "کلاس نارون", "de"], ["۱۵:۰۰", "Kids English · 310", "نگار مرادی", "کلاس سپیدار", "en"], ["۱۷:۳۰", "English B1 · 112", "پویا رضوی", "کلاس نارون", "en"],
        ].map((row) => <article key={row[0]}><time>{row[0]}</time><i className={row[4]} /><div><strong dir="ltr">{row[1]}</strong><span>{row[2]} · {row[3]}</span></div><span className="status-pill">برگزار می‌شود</span></article>)}</div>
      </section>
      <section className="panel applicants-panel"><div className="panel-title"><div><h2>متقاضیان تازه</h2><p>آخرین فعالیت‌های تعیین سطح</p></div><button>همه</button></div><div className="applicant-list">{data.recentApplicants.map((person) => <article key={person.id}><span className="avatar">{person.name.slice(0, 1)}</span><div><strong>{person.name}</strong><small>{person.language === "en" ? "انگلیسی" : "آلمانی"}</small></div><span className={`applicant-status ${person.status}`}>{person.status === "placement_ready" ? "نتیجه آماده" : "در حال آزمون"}</span></article>)}</div><Link href="/assessment" className="panel-cta">ارسال لینک تعیین سطح <Icon name="arrow" size={18} /></Link></section></div>
      <section className="quick-actions"><h2>دسترسی سریع</h2><div><button><Icon name="users" />افزودن زبان‌آموز</button><button><Icon name="calendar" />ساخت کلاس جدید</button><button><Icon name="check" />ثبت حضور و غیاب</button><button><Icon name="wallet" />ثبت دریافت</button></div></section>
    </main>
  </div>;
}
