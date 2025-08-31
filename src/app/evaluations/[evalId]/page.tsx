'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { COMMON_QUESTIONS, OVERSEAS_QUESTIONS } from '@/lib/forms';

type Rating = 'GOOD' | 'OK' | 'CAUTION' | 'UNTRUSTWORTHY';
const LABELS: Record<Rating, string> = {
  GOOD: '굿파트너 (80~100)',
  OK: '그럭저럭 파트너 (60~80)',
  CAUTION: '주의필요 파트너 (40~60)',
  UNTRUSTWORTHY: '믿을 수 없는 파트너 (<40)',
};

type EvalDoc = {
  partnerId: string;
  version: number;
  totalScore: number;
  rating: Rating;
  scope: 'domestic' | 'overseas';
  answersCommon: number[];
  answersOverseas?: number[];
  note?: string;
  createdAt?: Timestamp;
};

type PartnerDoc = {
  name: string;
  org: string;
  scope: 'domestic' | 'overseas';
  country: string;
};

export default function EvaluationDetailPage() {
  const { evalId } = useParams() as { evalId: string };
  const router = useRouter();

  const [evalDoc, setEvalDoc] = useState<EvalDoc | null>(null);
  const [partner, setPartner] = useState<PartnerDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 평가 불러오기
      const esnap = await getDoc(doc(db, 'evaluations', evalId));
      if (!esnap.exists()) {
        setEvalDoc(null);
        setLoading(false);
        return;
      }
      const e = esnap.data() as any;
      const evalData: EvalDoc = {
        partnerId: e.partnerId,
        version: Number(e.version) || 0,
        totalScore: Number(e.totalScore) || 0,
        rating: (e.rating as Rating) ?? 'UNTRUSTWORTHY',
        scope: (e.scope as 'domestic' | 'overseas') ?? 'domestic',
        answersCommon: (e.answersCommon ?? []) as number[],
        answersOverseas: (e.answersOverseas ?? undefined) as number[] | undefined,
        note: e.note,
        createdAt: e.createdAt as Timestamp | undefined,
      };
      setEvalDoc(evalData);

      // 파트너 불러오기
      const psnap = await getDoc(doc(db, 'partners', evalData.partnerId));
      if (psnap.exists()) {
        const p = psnap.data() as any;
        setPartner({
          name: p.name,
          org: p.org,
          scope: p.scope,
          country: p.country,
        });
      }
      setLoading(false);
    })();
  }, [evalId]);

  const fmt = (t?: Timestamp) => (t ? t.toDate().toLocaleString() : '-');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }
  if (!evalDoc || !partner) {
    return (
      <div className="min-h-screen p-6">
        <p className="mb-4">평가 데이터를 찾을 수 없습니다.</p>
        <Link href="/partners" className="underline">← 파트너 목록</Link>
      </div>
    );
  }

  const isOverseas = evalDoc.scope === 'overseas';

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">평가 상세 (v{evalDoc.version})</h1>
        <div className="flex gap-3">
          <Link href={`/partners/${evalDoc.partnerId}/history`} className="underline">← 이력으로</Link>
          <Link href={`/partners/${evalDoc.partnerId}`} className="underline">상세로</Link>
        </div>
      </div>

      {/* 파트너 정보 */}
      <div className="rounded-2xl border p-4 mb-6 max-w-3xl">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><b>이름</b><div>{partner.name}</div></div>
          <div><b>소속</b><div>{partner.org}</div></div>
          <div><b>구분</b><div>{partner.scope === 'domestic' ? '국내' : '해외'}</div></div>
          <div><b>국가</b><div>{partner.country}</div></div>
          <div><b>총점</b><div>{evalDoc.totalScore}</div></div>
          <div><b>등급</b><div>{LABELS[evalDoc.rating]}</div></div>
          <div><b>평가일</b><div>{fmt(evalDoc.createdAt)}</div></div>
          <div><b>버전</b><div>{evalDoc.version}</div></div>
        </div>
        {evalDoc.note && (
          <div className="mt-3 text-sm">
            <b>메모</b>
            <div className="whitespace-pre-wrap">{evalDoc.note}</div>
          </div>
        )}
      </div>

      {/* 공통 문항 */}
      <section className="rounded-2xl border p-4 mb-6 max-w-3xl">
        <h2 className="font-semibold mb-3">✅ 공통 문항</h2>
        <div className="space-y-2 text-sm">
          {COMMON_QUESTIONS.map((q, idx) => (
            <div key={q.id} className="grid grid-cols-[1fr,80px] items-center gap-3">
              <div>{idx + 1}. {q.text}</div>
              <div className="text-right font-mono">{evalDoc.answersCommon?.[idx] ?? '-'}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 해외 보강 문항 */}
      {isOverseas && (
        <section className="rounded-2xl border p-4 mb-6 max-w-3xl">
          <h2 className="font-semibold mb-3">🌍 해외 보강 문항</h2>
          <div className="space-y-2 text-sm">
            {OVERSEAS_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="grid grid-cols-[1fr,80px] items-center gap-3">
                <div>{q.text}</div>
                <div className="text-right font-mono">{evalDoc.answersOverseas?.[idx] ?? '-'}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-3">
        <button
          className="rounded-xl border px-4 py-2 hover:shadow"
          onClick={() =>
            router.push(`/partners/${evalDoc.partnerId}/evaluate?from=${evalId}`)
          }
          title="이 평가를 바탕으로 재평가합니다(다음 단계에서 미리채움 연결)."
        >
          재평가하기
        </button>
        <Link
          href={`/partners/${evalDoc.partnerId}/history`}
          className="rounded-xl border px-4 py-2 hover:shadow inline-block"
        >
          이력으로
        </Link>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        * 다음 단계에서 이력 목록 행을 클릭하면 이 상세 화면으로 이동하도록 연결하고,
        재평가 시 이전 답안을 미리 채우는 기능을 붙입니다.
      </p>
    </div>
  );
}
