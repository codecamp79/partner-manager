'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

type Rating = 'GOOD' | 'OK' | 'CAUTION' | 'UNTRUSTWORTHY';
const LABELS: Record<Rating, string> = {
  GOOD: '굿파트너 (80~100)',
  OK: '그럭저럭 파트너 (60~80)',
  CAUTION: '주의필요 파트너 (40~60)',
  UNTRUSTWORTHY: '믿을 수 없는 파트너 (<40)',
};

type HistoryRow = {
  id: string;
  version: number;
  totalScore: number;
  rating: Rating;
  createdAt?: Timestamp;
};

export default function EvalHistoryPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const qv = query(collection(db, 'evaluations'), where('partnerId', '==', id));
      const snaps = await getDocs(qv);
      const list: HistoryRow[] = [];
      snaps.forEach((s) => {
        const d = s.data() as any;
        list.push({
          id: s.id,
          version: Number(d.version) || 0,
          totalScore: Number(d.totalScore) || 0,
          rating: (d.rating as Rating) ?? 'UNTRUSTWORTHY',
          createdAt: d.createdAt,
        });
      });
      // 최신 버전이 위로 오도록 정렬
      list.sort((a, b) => b.version - a.version);
      setRows(list);
      setLoading(false);
    })();
  }, [id]);

  const fmt = (t?: Timestamp) => (t ? t.toDate().toLocaleString() : '-');

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">평가 이력</h1>
        <div className="flex gap-3">
          <Link href={`/partners/${id}`} className="underline">← 상세로</Link>
          <button
            className="rounded-xl border px-4 py-2 hover:shadow"
            onClick={() => router.push(`/partners/${id}/evaluate`)}
          >
            재평가하기
          </button>
        </div>
      </div>

      {loading ? (
        <div>로딩…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">아직 등록된 평가가 없습니다.</div>
      ) : (
        <div className="overflow-auto rounded-2xl border">
          <table className="min-w-[680px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">버전</th>
                <th className="text-left p-3">총점</th>
                <th className="text-left p-3">등급</th>
                <th className="text-left p-3">평가일</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.version}</td>
                  <td className="p-3"><Link href={`/evaluations/${r.id}`} className="underline hover:no-underline">v{r.version}</Link></td>
                  <td className="p-3">{r.totalScore}</td>
                  <td className="p-3">{LABELS[r.rating]}</td>
                  <td className="p-3">{fmt(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        * 최신 평가가 가장 위에 표시됩니다. (각 버전은 별도 행으로 저장되어 이력 관리됩니다.)
      </p>
    </div>
  );
}
