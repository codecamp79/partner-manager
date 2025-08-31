'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc,         
  serverTimestamp, 
} from 'firebase/firestore';

type PartnerDoc = {
  id: string;
  scope: 'domestic' | 'overseas';
  country: string;
  name: string;
  org: string;
  email?: string;
  phone?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  archived?: boolean;
};

type Rating = 'GOOD' | 'OK' | 'CAUTION' | 'UNTRUSTWORTHY';
const LABELS: Record<Rating, string> = {
  GOOD: '굿파트너 (80~100)',
  OK: '그럭저럭 파트너 (60~80)',
  CAUTION: '주의필요 파트너 (40~60)',
  UNTRUSTWORTHY: '믿을 수 없는 파트너 (<40)',
};

type EvalSummary = {
  version: number;
  totalScore: number;
  rating: Rating;
  createdAt?: Timestamp;
};

export default function PartnerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [p, setP] = useState<PartnerDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [latestEval, setLatestEval] = useState<EvalSummary | null>(null);
  const [evalLoading, setEvalLoading] = useState(true);

  // 파트너 기본 정보 실시간 구독
  useEffect(() => {
    const ref = doc(db, 'partners', id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setP(null);
      } else {
        const d = snap.data() as any;
        setP({
          id: snap.id,
          scope: d.scope,
          country: d.country,
          name: d.name,
          org: d.org,
          email: d.email,
          phone: d.phone,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          archived: d.archived,
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  // 최신 평가 1건만 클라이언트에서 선별(인덱스 없이 동작)
  useEffect(() => {
    (async () => {
      try {
        const qv = query(collection(db, 'evaluations'), where('partnerId', '==', id));
        const snaps = await getDocs(qv);

        let best: EvalSummary | null = null;
        snaps.forEach((s) => {
          const d = s.data() as any;
          const ver = Number(d.version) || 0;
          if (!best || ver > best.version) {
            best = {
              version: ver,
              totalScore: Number(d.totalScore) || 0,
              rating: (d.rating as Rating) ?? 'UNTRUSTWORTHY',
              createdAt: d.createdAt,
            };
          }
        });

        setLatestEval(best);
      } finally {
        setEvalLoading(false);
      }
    })();
  }, [id]);

  const fmt = (t?: Timestamp) => (t ? t.toDate().toLocaleString() : '-');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }
  if (!p) {
    return (
      <div className="min-h-screen p-6">
        <p className="mb-4">해당 파트너를 찾을 수 없습니다.</p>
        <Link href="/partners" className="underline">← 목록으로</Link>
      </div>
    );
  }

  const hasEval = !!latestEval;

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">파트너 상세</h1>
        <div className="flex gap-2">
          <Link
            href="/partners"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            ← 목록으로
          </Link>
          <Link
            href="/partners/trash"
            className="rounded-xl border px-4 py-2 hover:shadow"
            title="보관(삭제)된 파트너 보기"
          >
            휴지통
          </Link>
          <Link
            href="/partners/new"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            + 새 파트너
          </Link>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="rounded-2xl border p-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><b>이름</b><div>{p.name}</div></div>
          <div><b>소속</b><div>{p.org}</div></div>
          <div><b>구분</b><div>{p.scope === 'domestic' ? '국내' : '해외'}</div></div>
          <div><b>국가</b><div>{p.country}</div></div>
          <div><b>이메일</b><div>{p.email ?? '-'}</div></div>
          <div><b>연락처</b><div>{p.phone ?? '-'}</div></div>
          <div><b>등록일</b><div>{fmt(p.createdAt)}</div></div>
          <div><b>수정일</b><div>{fmt(p.updatedAt)}</div></div>
        </div>
      </div>

      {/* 최신 평가 요약 */}
      <div className="rounded-2xl border p-4 mt-6 max-w-2xl">
        <h2 className="font-semibold mb-3">최근 평가</h2>
        {evalLoading ? (
          <div>로딩…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><b>총점</b><div>{hasEval ? latestEval!.totalScore : '-'}</div></div>
            <div><b>등급</b><div>{hasEval ? LABELS[latestEval!.rating] : '-'}</div></div>
            <div><b>버전</b><div>{hasEval ? latestEval!.version : '-'}</div></div>
            <div><b>평가일</b><div>{hasEval ? fmt(latestEval!.createdAt) : '-'}</div></div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
      <button
        className="rounded-xl border px-4 py-2 hover:shadow"
        onClick={async () => {
          try {
            // 이 파트너의 최신 평가 문서 id 찾기
            const snaps = await getDocs(
              query(collection(db, 'evaluations'), where('partnerId', '==', p.id))
            );
            let bestId: string | null = null;
            let maxVersion = -1;
            snaps.forEach((s) => {
              const v = Number((s.data() as any).version) || 0;
              if (v > maxVersion) {
                maxVersion = v;
                bestId = s.id;
              }
            });

            // 최신 평가가 있으면 ?from=ID 쿼리로 이동
            const target = bestId
              ? `/partners/${p.id}/evaluate?from=${bestId}`
              : `/partners/${p.id}/evaluate`;

            router.push(target);
          } catch {
            // 실패해도 평가 페이지로는 이동
            router.push(`/partners/${p.id}/evaluate`);
          }
        }}
      >
        {hasEval ? '재평가하기' : '평가하기'}
      </button>


        <Link
          href={`/partners/${p.id}/history`}
          className="rounded-xl border px-4 py-2 hover:shadow inline-block"
        >
          이력 보기
        </Link>
        <button
          className="rounded-xl border px-4 py-2 hover:shadow"
          onClick={async () => {
            const ok = window.confirm('정말 삭제하시겠습니까?');
            if (!ok) return;
            try {
              await updateDoc(doc(db, 'partners', p.id), {
                archived: true,
                updatedAt: serverTimestamp(),
              });
              router.replace('/partners'); // 목록으로 이동
            } catch (e) {
              alert('삭제 중 오류가 발생했습니다.');
            }
          }}
        >
          삭제
        </button>

      </div>


      <p className="mt-4 text-xs text-gray-500">
        * 다음 단계에서 “평가 이력(버전별 목록)”과 “삭제/복원, CSV 다운로드”를 연결합니다.
      </p>
    </div>
  );
}
