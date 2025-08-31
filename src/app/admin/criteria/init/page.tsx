'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getUserPermissions } from '@/lib/auth';
import { Permission } from '@/lib/types';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';

// 기존 평가 기준 데이터
const INITIAL_CRITERIA = [
  // 공통 문항 (15개)
  { scope: 'common', category: 'c1', questionId: 'c1a', text: '상대의 목적이 명확한가?', order: 1 },
  { scope: 'common', category: 'c1', questionId: 'c1b', text: '우리가 빠지면 프로젝트가 진행이 불가능한가?', order: 2 },
  { scope: 'common', category: 'c1', questionId: 'c1c', text: '파트너는 우리를 동등한 파트너로 인지하는가?', order: 3 },
  
  { scope: 'common', category: 'c2', questionId: 'c2a', text: '투입(돈·시간·노력)과 상대 투입이 균형적인가?', order: 1 },
  { scope: 'common', category: 'c2', questionId: 'c2b', text: '성과물에 우리의 이름이 남는가?', order: 2 },
  { scope: 'common', category: 'c2', questionId: 'c2c', text: '결과가 상호 윈윈 구조인가?', order: 3 },
  
  { scope: 'common', category: 'c3', questionId: 'c3a', text: '계약/MoU에 권리·소유권이 명시돼 있는가?', order: 1 },
  { scope: 'common', category: 'c3', questionId: 'c3b', text: '비용·이익 분배가 서면으로 합의돼 있는가?', order: 2 },
  { scope: 'common', category: 'c3', questionId: 'c3c', text: '중도 이탈 시 책임·권리가 문서에 규정돼 있는가?', order: 3 },
  
  { scope: 'common', category: 'c4', questionId: 'c4a', text: '과거 성과·레퍼런스가 있는가?', order: 1 },
  { scope: 'common', category: 'c4', questionId: 'c4b', text: '네트워크·영향력이 실제 검증 가능한가?', order: 2 },
  { scope: 'common', category: 'c4', questionId: 'c4c', text: '끝까지 실행할 능력이 있는가?', order: 3 },
  
  { scope: 'common', category: 'c5', questionId: 'c5a', text: '틀어져도 우리가 챙길 최소 자산이 있는가?', order: 1 },
  { scope: 'common', category: 'c5', questionId: 'c5b', text: '철수·종료 조항이 계약에 포함돼 있는가?', order: 2 },
  { scope: 'common', category: 'c5', questionId: 'c5c', text: '실패해도 얻는 게 남는 구조인가?', order: 3 },
  
  // 해외 문항 (8개)
  { scope: 'overseas', category: 'oA', questionId: 'oAa', text: '현지에서 계약이 실제로 법적 효력을 가질 수 있는가?', order: 1 },
  { scope: 'overseas', category: 'oA', questionId: 'oAb', text: '정치/정부/기관과의 관계가 안정적인가?', order: 2 },
  
  { scope: 'overseas', category: 'oB', questionId: 'oBa', text: '중요한 합의는 반드시 이중 언어 문서로 남기는가?', order: 1 },
  { scope: 'overseas', category: 'oB', questionId: 'oBb', text: '문화적 오해를 줄이기 위한 현지 자문/브로커를 확보했는가?', order: 2 },
  
  { scope: 'overseas', category: 'oC', questionId: 'oCa', text: '파트너가 실행 자금을 실제로 보유하고 있는가?', order: 1 },
  { scope: 'overseas', category: 'oC', questionId: 'oCb', text: '단기 이벤트용이 아닌 지속 가능한 구조인지 확인했는가?', order: 2 },
  
  { scope: 'overseas', category: 'oD', questionId: 'oDa', text: '문제가 생겼을 때 대체 파트너를 확보할 수 있는가?', order: 1 },
  { scope: 'overseas', category: 'oD', questionId: 'oDb', text: '현지에 남긴 자산(기술·데이터·콘텐츠)을 회수 가능한가?', order: 2 },
];

export default function InitCriteriaPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [existingCount, setExistingCount] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        router.replace('/login');
        return;
      }

      try {
        const userPermissions = await getUserPermissions(u.email!);
        setPermissions(userPermissions);
        
        if (!userPermissions.canViewAdmin) {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error loading user permissions:', error);
        router.replace('/');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    checkExistingCriteria();
  }, [user]);

  const checkExistingCriteria = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'evaluationCriteria'));
      setExistingCount(snapshot.size);
    } catch (error) {
      console.error('Error checking existing criteria:', error);
    }
  };

  const handleInitialize = async () => {
    if (!user) return;
    
    if (!confirm('기존 평가 기준을 데이터베이스에 추가하시겠습니까?\n\n이 작업은 한 번만 실행해야 합니다.')) {
      return;
    }

    setInitializing(true);
    try {
      let addedCount = 0;
      
      for (const criteria of INITIAL_CRITERIA) {
        await addDoc(collection(db, 'evaluationCriteria'), {
          ...criteria,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addedCount++;
      }

      await checkExistingCriteria();
      alert(`평가 기준 초기화가 완료되었습니다.\n총 ${addedCount}개의 평가 기준이 추가되었습니다.`);
      router.push('/admin/criteria');
    } catch (error) {
      console.error('Error initializing criteria:', error);
      alert('평가 기준 초기화 중 오류가 발생했습니다.');
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }

  if (!user || !permissions?.canViewAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">평가 기준 초기화</h1>
            <p className="text-sm text-gray-600">기존 평가 기준을 데이터베이스에 추가합니다</p>
          </div>
          <Link
            href="/admin/criteria"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            목록으로
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-blue-800 mb-2">초기화 정보</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• 공통 문항: 15개 (국내·해외 공통)</p>
                <p>• 해외 문항: 8개 (해외 파트너만)</p>
                <p>• 총 23개의 평가 기준이 추가됩니다</p>
                <p>• 현재 데이터베이스에 {existingCount}개의 평가 기준이 있습니다</p>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">주의사항</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 이 작업은 한 번만 실행해야 합니다</li>
                <li>• 이미 존재하는 평가 기준과 중복될 수 있습니다</li>
                <li>• 초기화 후에는 평가 기준 관리 페이지에서 수정할 수 있습니다</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">추가될 평가 기준</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">공통 문항 (15개)</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>1. 이해관계 투명성 (c1a, c1b, c1c)</p>
                    <p>2. 기여와 결과물 균형 (c2a, c2b, c2c)</p>
                    <p>3. 법적·제도적 장치 (c3a, c3b, c3c)</p>
                    <p>4. 실행력 검증 (c4a, c4b, c4c)</p>
                    <p>5. Exit 전략 (c5a, c5b, c5c)</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">해외 문항 (8개)</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>A. 현지 제도·법적 환경 (oAa, oAb)</p>
                    <p>B. 언어·문화 차이 (oBa, oBb)</p>
                    <p>C. 실행력·지속성 (oCa, oCb)</p>
                    <p>D. Exit 전략(해외 특화) (oDa, oDb)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleInitialize}
                disabled={initializing}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {initializing ? '초기화 중...' : '평가 기준 초기화'}
              </button>
              <Link
                href="/admin/criteria"
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 text-center"
              >
                취소
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

