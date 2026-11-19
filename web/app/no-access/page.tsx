import Link from "next/link";

export default function NoAccessPage() {
  return <main className="registration-page"><section className="registration-card">
    <h1>No access</h1>
    <p>You do not have permission to access this page. Contact an administrator if you need access.</p>
    <Link href="/dashboard">Return to dashboard</Link>
  </section></main>;
}
