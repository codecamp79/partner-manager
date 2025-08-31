'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { COMMON_QUESTIONS, OVERSEAS_QUESTIONS } from '@/lib/forms';

type Rating = 'GOOD' | 'OK' | 'CAUTION' | 'UNTRUSTWORTHY';
const LABELS: Record<Rating, string> = {
  GOOD: '굿파트너 (80~100)',
  OK: '그럭저럭 파트너 (60~80)',
  CAUTION: '주의필요 파트너 (40~60)',
  UNTRUSTWORTHY: '믿을 수 없는 파트너 (<40)',
};

type PartnerRow = {
  id: string;
  scope: 'domestic' | 'overseas';
  country: string;
  name: string;
  org: string;
  email?: string;
  phone?: string;
  createdAt?: Timestamp;
  archived?: boolean;
};

type LatestEval = {
  id: string;
  version: number;
  totalScore: number;
  rating: Rating;
  createdAt?: Timestamp;
  answersCommon: number[];
  answersOverseas?: number[];
  note?: string;
  scope: 'domestic' | 'overseas';
};

export default function SearchPage() {
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [latestByPid, setLatestByPid] = useState<Map<string, LatestEval>>(new Map());
  const [open, setOpen] = useState<Record<string, boolean>>({}); // 펼치기 상태

  // 파트너 실시간 구독(보관 제외)
  useEffect(() => {
    const col = collection(db, 'partners');
    const unsub = onSnapshot(col, (snap) => {
      const list: PartnerRow[] = [];
      snap.forEach((d) => {
        const v = d.data() as any;
        if (v.archived) return;
        list.push({
          id: d.id,
          scope: v.scope,
          country: v.country,
          name: v.name,
          org: v.org,
          email: v.email,
          phone: v.phone,
          createdAt: v.createdAt,
          archived: v.archived,
        });
      });
      setRows(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 텍스트 필터(이름/소속/국가/이메일, 부분일치)
  const filtered = useMemo(() => {
    const key = appliedQ.trim().toLowerCase();
    if (!key) return rows;
    return rows.filter((r) =>
      [r.name, r.org, r.country, r.email ?? '']
        .map((v) => (v ?? '').toLowerCase())
        .some((txt) => txt.includes(key))
    );
  }, [appliedQ, rows]);

  // 필터된 파트너의 "최신 평가 1건"만 로드
  useEffect(() => {
    const work = async () => {
      const map = new Map<string, LatestEval>();
      await Promise.all(
        filtered.map(async (p) => {
          const snaps = await getDocs(
            query(collection(db, 'evaluations'), where('partnerId', '==', p.id))
          );
          let best: LatestEval | null = null;
          let maxVer = -1;
          snaps.forEach((s) => {
            const e = s.data() as any;
            const ver = Number(e.version) || 0;
            if (ver > maxVer) {
              maxVer = ver;
              best = {
                id: s.id,
                version: ver,
                totalScore: Number(e.totalScore) || 0,
                rating: (e.rating as Rating) ?? 'UNTRUSTWORTHY',
                createdAt: e.createdAt as Timestamp | undefined,
                answersCommon: (e.answersCommon ?? []) as number[],
                answersOverseas: (e.answersOverseas ?? undefined) as number[] | undefined,
                note: typeof e.note === 'string' ? e.note : '',
                scope: (e.scope as any) ?? p.scope,
              };
            }
          });
          if (best) map.set(p.id, best);
        })
      );
      setLatestByPid(map);
    };
    work();
  }, [filtered]);

  const fmtDate = (t?: Timestamp) => (t ? t.toDate().toLocaleString() : '-');

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">평가 상세 검색</h1>
        <Link href="/" className="underline">← 대시보드</Link>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        파트너의 평가 세부사항을 검색하고 분석할 수 있습니다. 
        문항별 점수, 메모, 평가 이력을 확인할 수 있습니다.
      </p>

      <div className="mb-6 p-4 border rounded-2xl bg-gray-50">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">검색어</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setAppliedQ(q)}
              placeholder="국가/이름/소속/이메일 검색"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <button
            onClick={() => setAppliedQ(q)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            검색
          </button>
          <button
            onClick={() => {
              setQ('');
              setAppliedQ('');
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            초기화
          </button>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-sm text-gray-600">
          검색 결과: <b>{filtered.length}</b> 명
        </span>
      </div>

      {loading ? (
        <div>로딩…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-600">
          {appliedQ ? '검색 결과가 없습니다.' : '등록된 파트너가 없습니다.'}
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">파트너</th>
                <th className="text-left p-3">구분/국가</th>
                <th className="text-left p-3">이메일/연락처</th>
                <th className="text-left p-3">최신 평가</th>
                <th className="text-left p-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const ev = latestByPid.get(p.id) || null;
                const isOpen = !!open[p.id];

                return (
                  <tr key={p.id} className="border-t align-top">
                    <td className="p-3">
                      <div className="font-medium">
                        <Link href={`/partners/${p.id}`} className="underline hover:no-underline">
                          {p.name}
                        </Link>{' '}
                        <span className="text-gray-500">/ {p.org}</span>
                      </div>
                      <div className="text-xs text-gray-500">등록일: {fmtDate(p.createdAt)}</div>
                    </td>
                    <td className="p-3">
                      {p.scope === 'domestic' ? '국내' : '해외'} / {p.country}
                    </td>
                    <td className="p-3">
                      <div>{p.email ?? '-'}</div>
                      <div className="text-gray-500">{p.phone ?? '-'}</div>
                    </td>
                    <td className="p-3">
                      {ev ? (
                        <div className="space-y-1">
                          <div>총점: <b>{ev.totalScore}</b></div>
                          <div>등급: {LABELS[ev.rating]}</div>
                          <div>버전: v{ev.version}</div>
                          <div>평가일: {fmtDate(ev.createdAt)}</div>
                          <button
                            className="mt-2 text-xs underline"
                            onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}
                          >
                            {isOpen ? '세부 접기' : '세부 보기(문항별 점수/메모)'}
                          </button>

                          {isOpen && (
                            <div className="mt-2 rounded-xl border p-3">
                              <div className="font-semibold mb-2 text-xs">✅ 공통 문항</div>
                              <div className="space-y-1 text-xs">
                                {COMMON_QUESTIONS.map((q, i) => (
                                  <div key={q.id} className="grid grid-cols-[1fr,50px] gap-2">
                                    <div>{i + 1}. {q.text}</div>
                                    <div className="text-right font-mono">{ev.answersCommon?.[i] ?? '-'}</div>
                                  </div>
                                ))}
                              </div>
                              {ev.scope === 'overseas' && (
                                <>
                                  <div className="font-semibold mt-3 mb-2 text-xs">🌍 해외 보강</div>
                                  <div className="space-y-1 text-xs">
                                    {OVERSEAS_QUESTIONS.map((q, i) => (
                                      <div key={q.id} className="grid grid-cols-[1fr,50px] gap-2">
                                        <div>{q.text}</div>
                                        <div className="text-right font-mono">{ev.answersOverseas?.[i] ?? '-'}</div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                              <div className="mt-3 text-xs">
                                <b>메모</b>
                                <div className="whitespace-pre-wrap">{ev.note || '-'}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500">아직 평가 없음</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/partners/${p.id}/history`}
                          className="rounded-lg border px-3 py-1 text-center hover:shadow"
                        >
                          이력 보기
                        </Link>
                        <Link
                          href={
                            ev
                              ? `/partners/${p.id}/evaluate?from=${ev.id}`
                              : `/partners/${p.id}/evaluate`
                          }
                          className="rounded-lg border px-3 py-1 text-center hover:shadow"
                          title={ev ? '직전 답안을 미리 채워 재평가' : '새 평가'}
                        >
                          {ev ? '재평가' : '평가'}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
