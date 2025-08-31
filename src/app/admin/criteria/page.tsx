'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getUserPermissions } from '@/lib/auth';
import { Permission } from '@/lib/types';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';

type EvaluationCriteria = {
  id: string;
  category: string;
  questionId: string;
  text: string;
  scope: 'common' | 'overseas';
  order: number;
  active: boolean;
  createdAt: any;
  updatedAt: any;
};

export default function CriteriaPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    loadCriteria();
  }, [user]);

  const loadCriteria = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'evaluationCriteria'));
      const criteriaList: EvaluationCriteria[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        criteriaList.push({
          id: doc.id,
          category: data.category,
          questionId: data.questionId,
          text: data.text,
          scope: data.scope,
          order: data.order,
          active: data.active,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      
      // 카테고리별, 순서별로 정렬
      criteriaList.sort((a, b) => {
        if (a.scope !== b.scope) return a.scope === 'common' ? -1 : 1;
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.order - b.order;
      });
      
      setCriteria(criteriaList);
    } catch (error) {
      console.error('Error loading criteria:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 평가 기준을 삭제하시겠습니까?')) return;
    
    setDeleting(id);
    try {
      await deleteDoc(doc(db, 'evaluationCriteria', id));
      await loadCriteria();
      alert('평가 기준이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting criteria:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'c1': '1. 이해관계 투명성',
      'c2': '2. 기여와 결과물 균형',
      'c3': '3. 법적·제도적 장치',
      'c4': '4. 실행력 검증',
      'c5': '5. Exit 전략',
      'oA': 'A. 현지 제도·법적 환경',
      'oB': 'B. 언어·문화 차이',
      'oC': 'C. 실행력·지속성',
      'oD': 'D. Exit 전략(해외 특화)',
    };
    return labels[category] || category;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }

        if (!user || !permissions?.canViewAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">평가 기준 관리</h1>
            <p className="text-sm text-gray-600">파트너 평가 기준을 관리합니다</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/criteria/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              새 기준 추가
            </Link>
            <Link
              href="/admin/criteria/init"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              평가기준초기화
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border px-4 py-2 hover:shadow"
            >
              뒤로 가기
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">평가 기준 목록</h2>
            <p className="text-sm text-gray-600 mt-1">
              총 {criteria.length}개의 평가 기준이 있습니다.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    구분
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    문항 ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    평가 문항
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순서
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {criteria.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.scope === 'common' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.scope === 'common' ? '공통' : '해외'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCategoryLabel(item.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {item.questionId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/criteria/${item.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          수정
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deleting === item.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {criteria.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p>등록된 평가 기준이 없습니다.</p>
              <Link
                href="/admin/criteria/new"
                className="mt-2 inline-block text-blue-600 hover:text-blue-800"
              >
                첫 번째 평가 기준을 추가해보세요
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
