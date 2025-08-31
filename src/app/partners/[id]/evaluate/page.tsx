'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  COMMON_QUESTIONS,
  OVERSEAS_QUESTIONS,
  MAX_PER_ITEM,
  toHundred,
} from '@/lib/forms';
import { classifyScore } from '@/lib/types';

type PartnerDoc = {
  scope: 'domestic' | 'overseas';
  name: string;
  country: string;
  org: string;
};

const LABELS: Record<'GOOD'|'OK'|'CAUTION'|'UNTRUSTWORTHY', string> = {
  GOOD: '굿파트너 (80~100)',
  OK: '그럭저럭 파트너 (60~80)',
  CAUTION: '주의필요 파트너 (40~60)',
  UNTRUSTWORTHY: '믿을 수 없는 파트너 (<40)',
};

export default function EvaluatePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const search = useSearchParams();
  const fromEvalId = search.get('from');



  const [partner, setPartner] = useState<PartnerDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 반드시 선택해야 하므로 기본값을 null로 시작
  const [answersCommon, setAnswersCommon] = useState<(number | null)[]>(
    Array(COMMON_QUESTIONS.length).fill(null)
  );
  const [answersOverseas, setAnswersOverseas] = useState<(number | null)[]>(
    Array(OVERSEAS_QUESTIONS.length).fill(null)
  );
  const [note, setNote] = useState(''); // 메모는 선택사항(요구사항: "모든 항목 평가" 기준 = 문항)
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 파트너 로드
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'partners', id));
      if (!snap.exists()) {
        setPartner(null);
      } else {
        const d = snap.data() as any;
        setPartner({
          scope: d.scope,
          name: d.name,
          country: d.country,
          org: d.org,
        });
      }
      setLoading(false);
    })();
  }, [id]);
  
  // 추가코드
  useEffect(() => {
    (async () => {
      if (!fromEvalId) return;
      try {
        const snap = await getDoc(doc(db, 'evaluations', fromEvalId));
        if (!snap.exists()) return;
        const e = snap.data() as any;
        
        // 메모 채우기
        setNote(typeof e.note === 'string' ? e.note : '');

        // 공통 문항 채우기
        const ac: number[] = (e.answersCommon ?? []).map((n: any) => Number(n));
        setAnswersCommon(() => {
          const next: (number | null)[] = Array(COMMON_QUESTIONS.length).fill(null);
          ac.slice(0, COMMON_QUESTIONS.length).forEach((v, i) => { next[i] = v; });
          return next;
        });
  
        // 해외 보강 문항 채우기
        const ao: number[] = (e.answersOverseas ?? []).map((n: any) => Number(n));
        setAnswersOverseas(() => {
          const next: (number | null)[] = Array(OVERSEAS_QUESTIONS.length).fill(null);
          ao.slice(0, OVERSEAS_QUESTIONS.length).forEach((v, i) => { next[i] = v; });
          return next;
        });
      } catch {
        // 무시(필수 아님)
      }
    })();
  }, [fromEvalId]);
  // 추가코드 끝

  const isOverseas = partner?.scope === 'overseas';

  // 선택 완료 여부
  const allCommonDone = useMemo(
    () => answersCommon.every((v) => Number.isFinite(v as number)),
    [answersCommon]
  );
  const allOverseasDone = useMemo(
    () => !isOverseas || answersOverseas.every((v) => Number.isFinite(v as number)),
    [answersOverseas, isOverseas]
  );
  const allDone = allCommonDone && allOverseasDone;

  // 점수 미리보기(미선택은 0으로 계산만, 저장은 막음)
  const totalScore = useMemo(() => {
    if (!partner) return 0;
    const safeCommon = answersCommon.map((v) => (Number.isFinite(v as number) ? (v as number) : 0));
    const safeOver = answersOverseas.map((v) => (Number.isFinite(v as number) ? (v as number) : 0));
    return toHundred(
      partner.scope,
      safeCommon,
      isOverseas ? safeOver : undefined
    );
  }, [partner, answersCommon, answersOverseas, isOverseas]);

  const rating = useMemo(() => classifyScore(totalScore), [totalScore]);

  const range = useMemo(() => Array.from({ length: MAX_PER_ITEM + 1 }, (_, i) => i), []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!partner) return;

    // ✅ 전부 선택 확인
    if (!allDone) {
      setErr('모든 항목을 평가해야 저장됩니다.');
      return;
    }

    if (!window.confirm('저장?')) return;

    try {
      setSaving(true);

      // 최신 버전 조회 후 +1  (인덱스 없이 동작하도록)
      const qv = query(
        collection(db, 'evaluations'),
        where('partnerId', '==', id)
      );
      const snaps = await getDocs(qv);

      let maxVersion = 0;
      snaps.forEach((d) => {
        const v = Number((d.data() as any).version) || 0;
        if (v > maxVersion) maxVersion = v;
      });
      const nextVersion = maxVersion + 1;

      const payload: any = {
        partnerId: id,
        version: nextVersion,
        scope: partner.scope,
        // 저장 시에는 null 없이 숫자만
        answersCommon: answersCommon.map((v) => (v as number)),
        totalScore,
        rating,
        note: note.trim() || undefined,
        createdAt: serverTimestamp(),
      };
      if (isOverseas) {
        payload.answersOverseas = answersOverseas.map((v) => (v as number));
      }

      // Firestore는 undefined 불가 → 키 삭제
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      await addDoc(collection(db, 'evaluations'), payload);

      router.replace(`/partners/${id}`);
    } catch (e: any) {
      setErr(e?.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }
  if (!partner) {
    return (
      <div className="min-h-screen p-6">
        <p className="mb-4">파트너를 찾을 수 없습니다.</p>
        <Link href="/partners" className="underline">← 목록으로</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">파트너 상세</h1>
        <Link href="/partners" className="underline">← 목록으로</Link>
      </div>

      <div className="rounded-2xl border p-4 mb-6">
        <div className="text-sm grid grid-cols-2 gap-3">
          <div><b>이름</b> <div>{partner.name}</div></div>
          <div><b>소속</b> <div>{partner.org}</div></div>
          <div><b>구분</b> <div>{partner.scope === 'domestic' ? '국내' : '해외'}</div></div>
          <div><b>국가</b> <div>{partner.country}</div></div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
        {/* 공통 문항 */}
        <section className="rounded-2xl border p-4">
          <h2 className="font-semibold mb-3">✅ 공통 문항</h2>
          <div className="space-y-3">
            {COMMON_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="grid grid-cols-[1fr,140px] items-center gap-3">
                <label className="text-sm">{idx + 1}. {q.text}</label>
                <select
                  className="border rounded-lg px-2 py-1"
                  value={answersCommon[idx] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value);
                    const next = answersCommon.slice();
                    next[idx] = v;
                    setAnswersCommon(next);
                  }}
                >
                  <option value="">선택</option>
                  {range.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* 해외 보강 */}
        {isOverseas && (
          <section className="rounded-2xl border p-4">
            <h2 className="font-semibold mb-3">🌍 해외 보강 문항</h2>
            <div className="space-y-3">
              {OVERSEAS_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="grid grid-cols-[1fr,140px] items-center gap-3">
                  <label className="text-sm">{q.text}</label>
                  <select
                    className="border rounded-lg px-2 py-1"
                    value={answersOverseas[idx] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      const next = answersOverseas.slice();
                      next[idx] = v;
                      setAnswersOverseas(next);
                    }}
                  >
                    <option value="">선택</option>
                    {range.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 메모 */}
        <section className="rounded-2xl border p-4">
          <label className="block text-sm mb-1">메모(선택)</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 min-h-[90px]"
            placeholder="특이사항, 리스크, 후속 액션 등"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </section>

        {/* 점수 미리보기 + 저장 버튼 */}
        <div className="rounded-2xl border p-4 flex items-center justify-between">
          <div className="text-sm">
            <div><b>점수(0~100)</b>: {totalScore}</div>
            <div><b>등급</b>: {LABELS[rating]}</div>
            {!allDone && (
              <p className="mt-2 text-red-600">
                모든 항목을 평가해야 저장됩니다.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!allDone || saving}
            className="rounded-xl border px-4 py-2 hover:shadow disabled:opacity-60"
            title="모든 항목을 선택해야 저장할 수 있습니다."
          >
            {saving ? '저장 중…' : '완료'}
          </button>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>

      <p className="mt-4 text-xs text-gray-500">
        * 저장 시 새로운 <b>버전</b>으로 이력이 기록됩니다(기존 행 수정 아님).
      </p>
    </div>
  );
}
