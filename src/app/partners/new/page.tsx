'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createPartner } from '@/lib/repo';
import type { PartnerScope } from '@/lib/types';

export default function NewPartnerPage() {
  const router = useRouter();
  const [scope, setScope] = useState<PartnerScope>('domestic');
  const [country, setCountry] = useState('Korea');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const id = await createPartner({
        scope,
        country: country.trim(),
        name: name.trim(),
        org: org.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setMsg(`저장 완료! id: ${id}`);
      // 나중에 상세 페이지로 이동 연결 예정
    } catch (err: any) {
      setMsg(err?.message ?? '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-xl font-semibold mb-4">파트너 등록</h1>

      <form onSubmit={onSubmit} className="space-y-3 max-w-md">
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={scope === 'domestic'}
              onChange={() => setScope('domestic')}
            />
            국내
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={scope === 'overseas'}
              onChange={() => setScope('overseas')}
            />
            해외
          </label>
        </div>

        <div>
          <label className="block text-sm mb-1">국가</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">이름</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">소속</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">연락처(선택)</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">이메일(선택)</label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border px-4 py-2 hover:shadow disabled:opacity-60"
        >
          {loading ? '저장 중…' : '저장'}
        </button>
      </form>

      {msg && <p className="mt-3 text-sm">{msg}</p>}

      <button
        className="mt-6 underline"
        onClick={() => router.push('/')}
      >
        ← 홈으로
      </button>
    </div>
  );
}