"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      localStorage.setItem('expenseTracker.token', res.data.token);
      localStorage.setItem('expenseTracker.user', JSON.stringify(res.data.user));
      setMessage('Login successful');
      router.push('/dashboard');
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <main className="container">
      <h1>Login</h1>
      <form onSubmit={onSubmit} className="card">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" placeholder="you@example.com" title="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" placeholder="••••••••" title="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </div>
        <div className="mt-12">
          <button className="btn" type="submit">Login</button>
        </div>
      </form>
      {message && <p className={message.toLowerCase().includes('fail') ? 'text-error' : ''}>{message}</p>}
    </main>
  );
}
