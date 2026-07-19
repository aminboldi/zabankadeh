"use client";

import type { AgeBand, AssessmentAttempt, AssessmentResult, TargetLanguage } from "@zabankadeh/contracts";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export function AssessmentFlow() {
  const [step, setStep] = useState<"intro" | "test" | "result">("intro");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [language, setLanguage] = useState<TargetLanguage>("en");
  const [ageBand, setAgeBand] = useState<AgeBand>("adult");
  const [attempt, setAttempt] = useState<AssessmentAttempt>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);

  async function start() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/public/assessments/attempts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ candidateName: name, mobile, language, ageBand }) });
      if (!response.ok) throw new Error("آزمون در حال حاضر در دسترس نیست.");
      setAttempt(await response.json()); setStep("test");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "خطایی رخ داد."); } finally { setBusy(false); }
  }

  async function finish() {
    if (!attempt) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/public/assessments/attempts/${attempt.id}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionIds: [optionId] })) }) });
      if (!response.ok) throw new Error("ثبت پاسخ‌ها انجام نشد. دوباره تلاش کنید.");
      setResult(await response.json()); setStep("result");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "خطایی رخ داد."); } finally { setBusy(false); }
  }

  if (step === "result" && result) return <div className="assessment-page"><div className="result-card">
    <div className="result-seal"><Icon name="spark" size={30} /></div><span className="kicker">نتیجه اولیه تعیین سطح</span>
    <h1>{result.recommendedBand.toUpperCase()}</h1><p>امتیاز شما <strong>{result.score} از ۱۰۰</strong> است.</p>
    <div className="result-note">این نتیجه بر اساس واژگان، دستور و درک مطلب است و به‌عنوان پیشنهاد اولیه ثبت می‌شود.</div>
    <div className="skill-bars">{Object.entries(result.skillScores).map(([skill, score]) => <div key={skill}><span>{skill}</span><i><b style={{ width: `${score}%` }} /></i><strong>{score}%</strong></div>)}</div>
    <div className="result-actions"><button className="button primary">مشاهده کلاس‌های پیشنهادی</button><Link className="button secondary" href="/">بازگشت به خانه</Link></div>
  </div></div>;

  if (step === "test" && attempt) {
    const question = attempt.questions[index];
    const last = index === attempt.questions.length - 1;
    return <div className="assessment-page"><div className="test-shell" dir="ltr">
      <div className="test-top"><Link href="/" className="brand"><span className="brand-mark">Z</span><span>Zabankadeh</span></Link><span><Icon name="clock" size={18} /> 45:00</span></div>
      <div className="progress"><i style={{ width: `${((index + 1) / attempt.questions.length) * 100}%` }} /></div>
      <div className="question-meta"><span>{question.skill}</span><strong>{index + 1} / {attempt.questions.length}</strong></div>
      <article className="question-card">{question.passage && <blockquote>{question.passage}</blockquote>}<h1>{question.prompt}</h1>
        <div className="answer-list">{question.options.map((option) => <button className={answers[question.id] === option.id ? "selected" : ""} key={option.id} onClick={() => setAnswers((old) => ({ ...old, [question.id]: option.id }))}><span>{option.id.toUpperCase()}</span>{option.label}<Icon name="check" /></button>)}</div>
      </article>
      {error && <p className="form-error">{error}</p>}
      <div className="test-nav"><button disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Previous</button><button className="button primary" disabled={!answers[question.id] || busy} onClick={() => last ? finish() : setIndex((i) => i + 1)}>{busy ? "Saving…" : last ? "Finish test" : "Next question"}</button></div>
    </div></div>;
  }

  return <div className="assessment-page"><div className="assessment-intro">
    <Link href="/" className="brand"><span className="brand-mark">ز</span><span>زبانکده</span></Link>
    <div className="assessment-grid"><section><span className="kicker">تعیین سطح آنلاین</span><h1>بهترین نقطه برای<br />شروع را پیدا کنیم.</h1><p>آزمون حدود ۱۵ دقیقه زمان می‌برد. در محیطی آرام و بدون کمک دیگران پاسخ دهید تا پیشنهاد دقیق‌تری دریافت کنید.</p><ul><li><Icon name="check" /> نتیجه فوری و رایگان</li><li><Icon name="check" /> مناسب انگلیسی و آلمانی</li><li><Icon name="check" /> بدون نمره منفی</li></ul></section>
      <form onSubmit={(event) => { event.preventDefault(); void start(); }}><h2>مشخصات زبان‌آموز</h2><label>نام و نام خانوادگی<input value={name} onChange={(event) => setName(event.target.value)} required placeholder="مثلاً سارا احمدی" /></label><label>شماره موبایل<input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" placeholder="۰۹۱۲۱۲۳۴۵۶۷" /></label>
        <fieldset><legend>زبان مورد نظر</legend><div className="choice-row"><button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>🇬🇧 انگلیسی</button><button type="button" className={language === "de" ? "active" : ""} onClick={() => setLanguage("de")}>🇩🇪 آلمانی</button></div></fieldset>
        <fieldset><legend>گروه سنی</legend><div className="choice-row three"><button type="button" className={ageBand === "child" ? "active" : ""} onClick={() => setAgeBand("child")}>کودک</button><button type="button" className={ageBand === "teen" ? "active" : ""} onClick={() => setAgeBand("teen")}>نوجوان</button><button type="button" className={ageBand === "adult" ? "active" : ""} onClick={() => setAgeBand("adult")}>بزرگسال</button></div></fieldset>
        {error && <p className="form-error">{error}</p>}<button className="button primary wide" disabled={busy}>{busy ? "در حال آماده‌سازی…" : "آغاز آزمون"}<Icon name="arrow" /></button>
      </form></div>
  </div></div>;
}
