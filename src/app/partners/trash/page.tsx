'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

type PartnerRow = {
  id: string;
  scope: 'domestic' | 'overseas';
  country: string;
  name: string;
  org: string;
  email?: string;
  phone?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export default function TrashPartnersPage() {
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qv = query(collection(db, 'partners'), where('archived', '==', true));
    const unsub = onSnapshot(qv, (snap) => {
      const list: PartnerRow[] = [];
      snap.forEach((d) => {
        const v = d.data() as any;
        list.push({
          id: d.id,
          scope: v.scope,
          country: v.country,
          name: v.name,
          org: v.org,
          email: v.email,
          phone: v.phone,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        });
      });
      // 최신 업데이트가 위로 오게 클라이언트에서 정렬
      list.sort((a, b) => {
        const at = a.updatedAt?.toMillis?.() ?? 0;
        const bt = b.updatedAt?.toMillis?.() ?? 0;
        return bt - at;
      });
      setRows(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const fmt = (t?: Timestamp) => (t ? t.toDate().toLocaleString() : '-');

  const restore = async (id: string) => {
    const ok = window.confirm('이 파트너를 복원하시겠습니까?');
    if (!ok) return;
    await updateDoc(doc(db, 'partners', id), {
      archived: false,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">휴지통(보관 처리된 파트너)</h1>
        <Link href="/partners" className="underline">
          ← 파트너 목록
        </Link>
      </div>

      {loading ? (
        <div>로딩…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">보관(삭제)된 파트너가 없습니다.</div>
      ) : (
        <div className="overflow-auto rounded-2xl border">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">이름</th>
                <th className="text-left p-3">소속</th>
                <th className="text-left p-3">구분</th>
                <th className="text-left p-3">국가</th>
                <th className="text-left p-3">이메일</th>
                <th className="text-left p-3">연락처</th>
                <th className="text-left p-3">수정일</th>
                <th className="text-left p-3">복원</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.org}</td>
                  <td className="p-3">{r.scope === 'domestic' ? '국내' : '해외'}</td>
                  <td className="p-3">{r.country}</td>
                  <td className="p-3">{r.email ?? '-'}</td>
                  <td className="p-3">{r.phone ?? '-'}</td>
                  <td className="p-3">{fmt(r.updatedAt)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => restore(r.id)}
                      className="rounded-lg border px-3 py-1 hover:shadow"
                    >
                      복원
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        * 이 페이지에서 <b>복원</b>하면 목록(/partners)에 다시 나타납니다.
      </p>
    </div>
  );
}
