'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDocs,
  getDoc,
  doc,
} from 'firebase/firestore';
import Link from 'next/link';
import { getUserPermissions, updateLastLogin } from '@/lib/auth';
import { Permission, UserRole } from '@/lib/types';
import PartnerIcon from '@/components/PartnerIcon';

type Partner = {
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

type Evaluation = {
  id: string;
  partnerId: string;
  partnerName: string;
  totalScore: number;
  rating: 'GOOD' | 'OK' | 'CAUTION' | 'UNTRUSTWORTHY';
  version: number;
  createdAt?: Timestamp;
  note?: string;
};

const RATING_LABELS = {
  GOOD: '굿파트너',
  OK: '그럭저럭 파트너',
  CAUTION: '주의필요 파트너',
  UNTRUSTWORTHY: '믿을 수 없는 파트너',
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 대시보드 데이터
  const [partners, setPartners] = useState<Partner[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  // 사용자 권한
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('user');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        router.replace('/login'); // 미로그인 시 로그인 페이지로
        return;
      }
      
      // 사용자 권한 가져오기
      try {
        const userPermissions = await getUserPermissions(u.email!);
        setPermissions(userPermissions);
        
        // 사용자 역할 설정 (권한에서 역추적)
        if (userPermissions.canManageUsers) {
          setUserRole('admin');
        } else if (userPermissions.canExportData) {
          setUserRole('manager');
        } else {
          setUserRole('user');
        }
        
        // 로그인 시간 업데이트
        await updateLastLogin(u.email!);
      } catch (error) {
        console.error('Error loading user permissions:', error);
        // 기본 권한 설정
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
        setUserRole('user');
      }
    });
    return () => unsub();
  }, [router]);

  // 파트너 데이터 로드
  useEffect(() => {
    if (!user) return;

    const partnersQuery = query(
      collection(db, 'partners'),
      where('archived', '==', false)
    );
    
    const unsubPartners = onSnapshot(partnersQuery, (snapshot) => {
      const partnersList: Partner[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        partnersList.push({
          id: doc.id,
          scope: data.scope,
          country: data.country,
          name: data.name,
          org: data.org,
          email: data.email,
          phone: data.phone,
          createdAt: data.createdAt,
          archived: data.archived,
        });
      });
      setPartners(partnersList);
    });

    // 최근 평가 5건 로드
    const evaluationsQuery = query(
      collection(db, 'evaluations'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubEvaluations = onSnapshot(evaluationsQuery, async (snapshot) => {
      const evaluationsList: Evaluation[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as any;
        
        // 파트너 정보를 직접 Firestore에서 가져오기
        let partnerName = 'Unknown';
        try {
          const partnerDocRef = doc(db, 'partners', data.partnerId);
          const partnerDocSnap = await getDoc(partnerDocRef);
          if (partnerDocSnap.exists()) {
            const partnerData = partnerDocSnap.data() as any;
            partnerName = partnerData.name || 'Unknown';
          }
        } catch (error) {
          console.error('Error fetching partner info:', error);
        }
        
        evaluationsList.push({
          id: docSnapshot.id,
          partnerId: data.partnerId,
          partnerName: partnerName,
          totalScore: data.totalScore || 0,
          rating: data.rating || 'UNTRUSTWORTHY',
          version: data.version || 0,
          createdAt: data.createdAt,
          note: data.note,
        });
      }
      
      setEvaluations(evaluationsList);
      setDashboardLoading(false);
    });

    return () => {
      unsubPartners();
      unsubEvaluations();
    };
  }, [user]); // partners를 의존성 배열에서 제거

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">로딩…</div>
    );
  }

  if (!user) return null;

  // 대시보드 통계 계산
  const totalPartners = partners.length;
  const domesticPartners = partners.filter(p => p.scope === 'domestic').length;
  const overseasPartners = partners.filter(p => p.scope === 'overseas').length;
  
  // 평가 완료/미완료 파트너 수 (최신 평가가 있는 파트너)
  const evaluatedPartners = new Set(evaluations.map(e => e.partnerId)).size;
  const unevaluatedPartners = totalPartners - evaluatedPartners;
  
  // 등급별 분포
  const ratingCounts = evaluations.reduce((acc, evaluation) => {
    acc[evaluation.rating] = (acc[evaluation.rating] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 최근 30일 등록된 파트너
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentPartners = partners.filter(p => 
    p.createdAt && p.createdAt.toDate() > thirtyDaysAgo
  ).length;

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <PartnerIcon size={48} />
          <div>
            <h1 className="text-2xl font-bold">파트너 관리 대시보드</h1>
            <p className="text-sm text-gray-600">환영합니다, {user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/search"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            상세 검색
          </Link>
          <Link
            href="/partners"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            파트너 목록
          </Link>
          {permissions?.canViewAdmin && (
            <Link
              href="/admin"
              className="rounded-xl border px-4 py-2 hover:shadow bg-yellow-50"
            >
              관리자
            </Link>
          )}
          <button
            onClick={async () => {
              await signOut(auth);
              router.replace('/login');
            }}
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            로그아웃
          </button>
        </div>
      </div>

      {dashboardLoading ? (
        <div className="text-center py-8">대시보드 로딩 중...</div>
      ) : (
        <>
          {/* 주요 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link href="/partners" className="block">
              <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-2xl font-bold text-blue-600">{totalPartners}</div>
                <div className="text-sm text-gray-600">총 파트너 수</div>
              </div>
            </Link>
            <Link href="/partners?filter=evaluated" className="block">
              <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-2xl font-bold text-green-600">{evaluatedPartners}</div>
                <div className="text-sm text-gray-600">평가 완료</div>
              </div>
            </Link>
            <Link href="/partners?filter=unevaluated" className="block">
              <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-2xl font-bold text-orange-600">{unevaluatedPartners}</div>
                <div className="text-sm text-gray-600">평가 미완료</div>
              </div>
            </Link>
            <Link href="/partners?filter=recent" className="block">
              <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">{recentPartners}</div>
                <div className="text-sm text-gray-600">최근 30일 등록</div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 국내/해외 비율 */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h3 className="font-semibold mb-4">국내/해외 파트너 비율</h3>
              <div className="space-y-3">
                <Link href="/partners?scope=domestic" className="block">
                  <div className="flex justify-between items-center hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer">
                    <span>국내 파트너</span>
                    <span className="font-semibold">{domesticPartners}명</span>
                  </div>
                </Link>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${totalPartners > 0 ? (domesticPartners / totalPartners) * 100 : 0}%` }}
                  ></div>
                </div>
                <Link href="/partners?scope=overseas" className="block">
                  <div className="flex justify-between items-center hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer">
                    <span>해외 파트너</span>
                    <span className="font-semibold">{overseasPartners}명</span>
                  </div>
                </Link>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${totalPartners > 0 ? (overseasPartners / totalPartners) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 등급별 분포 */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h3 className="font-semibold mb-4">등급별 분포</h3>
              <div className="space-y-3">
                {Object.entries(RATING_LABELS).map(([key, label]) => (
                  <Link key={key} href={`/partners?rating=${key}`} className="block">
                    <div className="flex justify-between items-center hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer">
                      <span>{label}</span>
                      <span className="font-semibold">{ratingCounts[key] || 0}명</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 최근 평가 */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold mb-4">최근 평가 5건</h3>
            {evaluations.length === 0 ? (
              <p className="text-gray-500">아직 평가가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {evaluations.map((evaluation) => (
                  <Link 
                    key={evaluation.id} 
                    href={`/partners/${evaluation.partnerId}`}
                    className="block"
                  >
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <div>
                        <div className="font-medium">{evaluation.partnerName}</div>
                        <div className="text-sm text-gray-600">
                          {evaluation.createdAt ? evaluation.createdAt.toDate().toLocaleString() : '-'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{evaluation.totalScore}점</div>
                        <div className="text-sm text-gray-600">{RATING_LABELS[evaluation.rating]}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}