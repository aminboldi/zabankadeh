import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "زبانکده | مدیریت هوشمند آموزش زبان",
  description: "ثبت‌نام، تعیین سطح و مدیریت آموزشگاه زبان در یک تجربه یکپارچه",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
