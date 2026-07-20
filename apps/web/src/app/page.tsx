import Link from "next/link";
import { Icon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";

const courses = [
  { code: "EN", title: "انگلیسی بزرگسالان", detail: "از پایه تا پیشرفته", tone: "mint" },
  { code: "DE", title: "آلمانی بزرگسالان", detail: "مسیر هدفمند مهاجرت و تحصیل", tone: "sand" },
  { code: "JR", title: "زبان برای کودکان", detail: "یادگیری شاد و سن‌محور", tone: "lilac" },
];

export default function Home() {
  return (
    <main>
      <div className="landing-shell">
        <SiteHeader />
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Icon name="spark" size={17} /> ثبت‌نام ترم جدید آغاز شد</div>
            <h1>زبان تازه،<br /><em>افق تازه.</em></h1>
            <p>با یک تعیین سطح دقیق شروع کنید و در کلاسی قرار بگیرید که واقعاً برای شما ساخته شده است.</p>
            <div className="hero-actions">
              <Link className="button primary" href="/assessment">شروع تعیین سطح <Icon name="arrow" /></Link>
              <a className="button secondary" href="#courses">مشاهده دوره‌ها</a>
            </div>
            <div className="trust-row">
              <div className="avatars"><span>م</span><span>ر</span><span>س</span></div>
              <div><strong>+۲,۴۰۰</strong><small>زبان‌آموز همراه ما</small></div>
            </div>
          </div>
          <div className="hero-art" aria-label="Abstract language learning illustration">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="word-card card-hello"><small>ENGLISH</small><strong>Hello!</strong><span>/həˈləʊ/</span></div>
            <div className="word-card card-hallo"><small>DEUTSCH</small><strong>Hallo!</strong><span>/haˈloː/</span></div>
            <div className="letter-shape">ض</div>
            <div className="floating-dot dot-one" /><div className="floating-dot dot-two" />
          </div>
        </section>
      </div>

      <section className="steps" id="method">
        <div className="section-heading"><span>شروع ساده</span><h2>سه قدم تا کلاس مناسب شما</h2></div>
        <div className="step-grid">
          <article><span className="step-number">۰۱</span><Icon name="book" size={28} /><h3>تعیین سطح آنلاین</h3><p>آزمونی کوتاه و هوشمند، متناسب با زبان و گروه سنی شما.</p></article>
          <article><span className="step-number">۰۲</span><Icon name="calendar" size={28} /><h3>انتخاب زمان کلاس</h3><p>از میان کلاس‌های مناسب سطح خود، بهترین زمان را انتخاب کنید.</p></article>
          <article><span className="step-number">۰۳</span><Icon name="check" size={28} /><h3>آغاز یادگیری</h3><p>ثبت‌نام را تکمیل کنید و با یک برنامه روشن پیش بروید.</p></article>
        </div>
      </section>

      <section className="courses" id="courses">
        <div className="section-heading row"><div><span>دوره‌های فعال</span><h2>مسیر یادگیری خود را پیدا کنید</h2></div><a href="#">همه دوره‌ها ←</a></div>
        <div className="course-grid">
          {courses.map((course) => <article className={`course-card ${course.tone}`} key={course.code}>
            <span className="course-code">{course.code}</span><div><h3>{course.title}</h3><p>{course.detail}</p></div><Icon name="arrow" />
          </article>)}
        </div>
      </section>

      <section className="quote" id="about"><p>«اینجا فقط زبان یاد نمی‌گیریم؛<br />جرئتِ حرف زدن پیدا می‌کنیم.»</p><span>— تیم آموزشی زبانکده</span></section>
      <footer><div className="brand"><span className="brand-mark">ز</span><span>زبانکده</span></div><p>یک تجربه یکپارچه برای آموزشگاه، زبان‌آموز و خانواده.</p><small>© ۱۴۰۵ زبانکده</small></footer>
    </main>
  );
}
