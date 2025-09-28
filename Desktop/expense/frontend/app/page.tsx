export default function HomePage() {
  return (
    <main className="container">
      <h1>Expense Tracker</h1>
      <p>Welcome! This Next.js frontend talks to your existing Express API.</p>
      <ul>
        <li><a href="/login">Login</a></li>
        <li><a href="/dashboard">Dashboard</a></li>
      </ul>
    </main>
  );
}
