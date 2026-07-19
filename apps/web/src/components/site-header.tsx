"use client";

import Link from "next/link";
import { useState } from "react";

export function SiteHeader() {
  const [english, setEnglish] = useState(false);
  return (
    <header className="site-header" dir={english ? "ltr" : "rtl"}>
      <Link href="/" className="brand" aria-label="Zabankadeh home">
        <span className="brand-mark">ز</span>
        <span>{english ? "Zabankadeh" : "زبانکده"}</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <a href="#courses">{english ? "Courses" : "دوره‌ها"}</a>
        <a href="#method">{english ? "Our method" : "روش آموزش"}</a>
        <a href="#about">{english ? "About" : "درباره ما"}</a>
      </nav>
      <div className="header-actions">
        <button className="language-toggle" onClick={() => setEnglish((value) => !value)}>{english ? "فا" : "EN"}</button>
        <Link href="/admin" className="login-link">{english ? "Staff panel" : "پنل آموزشگاه"}</Link>
      </div>
    </header>
  );
}
