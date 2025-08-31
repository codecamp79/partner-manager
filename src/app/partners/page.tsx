'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUserPermissions } from '@/lib/auth';
import { Permission } from '@/lib/types';

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

const RATING_LABELS = {
  GOOD: '굿파트너',
  OK: '그럭저럭 파트너',
  CAUTION: '주의필요 파트너',
  UNTRUSTWORTHY: '믿을 수 없는 파트너',
};

function PartnersPageContent() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<Map<string, any>>(new Map());
  
  // 검색 상태
  const [searchField, setSearchField] = useState<'name' | 'org' | 'scope' | 'country' | 'email'>('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  
  // 사용자 권한
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [user, setUser] = useState<User | null>(null);



  // 사용자 권한 로드
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userPermissions = await getUserPermissions(u.email!);
          setPermissions(userPermissions);
        } catch (error) {
          console.error('Error loading user permissions:', error);
                  setPermissions({
          canViewPartners: true,
          canCreatePartners: true,
          canEditPartners: false,
          canDeletePartners: false,
          canEvaluatePartners: false,
          canViewEvaluations: true,
          canManageUsers: false,
          canViewAdmin: false,
          canExportData: false,
          canBackupData: false,
        });
        }
      }
    });
    return () => unsub();
  }, []);

  // 평가 데이터 로드
  useEffect(() => {
    const evaluationsQuery = query(collection(db, 'evaluations'));
    const unsubEvaluations = onSnapshot(evaluationsQuery, (snapshot) => {
      const evaluationsMap = new Map<string, any>();
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        const partnerId = data.partnerId;
        if (partnerId) {
          const existing = evaluationsMap.get(partnerId);
          if (!existing || (data.version || 0) > (existing.version || 0)) {
            evaluationsMap.set(partnerId, data);
          }
        }
      });
      setEvaluations(evaluationsMap);
    });
    return () => unsubEvaluations();
  }, []);

  useEffect(() => {
    const col = collection(db, 'partners');
    // 최신 등록순
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: PartnerRow[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as any;
        if (d.archived) return; // 보관처리 제외
        list.push({
          id: doc.id,
          scope: d.scope,
          country: d.country,
          name: d.name,
          org: d.org,
          email: d.email,
          phone: d.phone,
          createdAt: d.createdAt,
          archived: d.archived,
        });
      });
      setRows(list);
      setFilteredRows(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 검색 및 필터링
  useEffect(() => {
    let filtered = [...rows];
    
    // URL 쿼리 파라미터 필터 적용
    const filter = searchParams.get('filter');
    const scope = searchParams.get('scope');
    const rating = searchParams.get('rating');
    
    if (filter) {
      switch (filter) {
        case 'evaluated':
          filtered = filtered.filter(row => evaluations.has(row.id));
          break;
        case 'unevaluated':
          filtered = filtered.filter(row => !evaluations.has(row.id));
          break;
        case 'recent':
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          filtered = filtered.filter(row => 
            row.createdAt && row.createdAt.toDate() > thirtyDaysAgo
          );
          break;
      }
    }
    
    // scope 필터 (국내/해외)
    if (scope) {
      filtered = filtered.filter(row => row.scope === scope);
    }
    
    // rating 필터 (등급별)
    if (rating) {
      filtered = filtered.filter(row => {
        const evaluation = evaluations.get(row.id);
        return evaluation && evaluation.rating === rating;
      });
    }
    
    // 검색어 필터 적용
    if (appliedSearchTerm.trim()) {
      filtered = filtered.filter(row => {
        const value = row[searchField];
        if (!value) return false;
        
        const searchLower = appliedSearchTerm.toLowerCase();
        const valueLower = String(value).toLowerCase();
        
        return valueLower.includes(searchLower);
      });
    }
    
    setFilteredRows(filtered);
  }, [rows, searchField, appliedSearchTerm, evaluations, searchParams]);

  const fmtDate = (t?: Timestamp) =>
    t ? t.toDate().toLocaleString() : '-';

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">
          파트너 목록
          {searchParams.get('filter') && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({searchParams.get('filter') === 'evaluated' && '평가 완료'}
              {searchParams.get('filter') === 'unevaluated' && '평가 미완료'}
              {searchParams.get('filter') === 'recent' && '최근 30일 등록'})
            </span>
          )}
          {searchParams.get('scope') && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({searchParams.get('scope') === 'domestic' && '국내 파트너'}
              {searchParams.get('scope') === 'overseas' && '해외 파트너'})
            </span>
          )}
          {searchParams.get('rating') && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({RATING_LABELS[searchParams.get('rating') as keyof typeof RATING_LABELS] || searchParams.get('rating')})
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            대시보드
          </Link>

          <Link
            href="/partners/new"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            + 새 파트너
          </Link>
        </div>
      </div>


      {/* 검색 기능 */}
      <div className="mb-6 p-4 border rounded-2xl bg-gray-50">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">검색 필드</label>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as any)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="name">이름</option>
              <option value="org">소속</option>
              <option value="scope">구분</option>
              <option value="country">국가</option>
              <option value="email">이메일</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">검색어</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setAppliedSearchTerm(searchTerm)}
              placeholder="검색어를 입력하세요"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <button
            onClick={() => setAppliedSearchTerm(searchTerm)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            검색
          </button>
          <button
            onClick={() => {
              setSearchTerm('');
              setAppliedSearchTerm('');
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            초기화
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">
        검색 결과: <b>{filteredRows.length}</b> / 전체: <b>{rows.length}</b>
      </p>

      {loading ? (
        <div>로딩…</div>
      ) : filteredRows.length === 0 ? (
        <div className="text-sm text-gray-600">
          {appliedSearchTerm ? '검색 결과가 없습니다.' : '아직 등록된 파트너가 없습니다.'}
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">이름</th>
                <th className="text-left p-3">소속</th>
                <th className="text-left p-3">구분</th>
                <th className="text-left p-3">국가</th>
                <th className="text-left p-3">이메일</th>
                <th className="text-left p-3">연락처</th>
                <th className="text-left p-3">등록일</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3"><Link href={`/partners/${r.id}`} className="underline hover:no-underline">{r.name}</Link></td>
                  <td className="p-3">{r.org}</td>
                  <td className="p-3">{r.scope === 'domestic' ? '국내' : '해외'}</td>
                  <td className="p-3">{r.country}</td>
                  <td className="p-3">{r.email ?? '-'}</td>
                  <td className="p-3">{r.phone ?? '-'}</td>
                  <td className="p-3">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        * 상세/평가/검색/CSV/삭제/복원은 다음 단계에서 차례대로 붙입니다.
      </div>
    </div>
  );
}

export default function PartnersPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <PartnersPageContent />
    </Suspense>
  );
}