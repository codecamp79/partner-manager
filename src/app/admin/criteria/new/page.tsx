'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getUserPermissions } from '@/lib/auth';
import { Permission } from '@/lib/types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';

const CATEGORIES = {
  common: [
    { value: 'c1', label: '1. 이해관계 투명성' },
    { value: 'c2', label: '2. 기여와 결과물 균형' },
    { value: 'c3', label: '3. 법적·제도적 장치' },
    { value: 'c4', label: '4. 실행력 검증' },
    { value: 'c5', label: '5. Exit 전략' },
  ],
  overseas: [
    { value: 'oA', label: 'A. 현지 제도·법적 환경' },
    { value: 'oB', label: 'B. 언어·문화 차이' },
    { value: 'oC', label: 'C. 실행력·지속성' },
    { value: 'oD', label: 'D. Exit 전략(해외 특화)' },
  ],
};

export default function NewCriteriaPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [scope, setScope] = useState<'common' | 'overseas'>('common');
  const [category, setCategory] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [text, setText] = useState('');
  const [order, setOrder] = useState(1);
  const [active, setActive] = useState(true);

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

  // scope가 변경되면 category 초기화
  useEffect(() => {
    setCategory('');
  }, [scope]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // 유효성 검사
    if (!category || !questionId || !text.trim()) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'evaluationCriteria'), {
        scope,
        category,
        questionId,
        text: text.trim(),
        order: Number(order),
        active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert('평가 기준이 추가되었습니다.');
      router.push('/admin/criteria');
    } catch (error) {
      console.error('Error adding criteria:', error);
      alert('평가 기준 추가 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-bold">새 평가 기준 추가</h1>
            <p className="text-sm text-gray-600">새로운 평가 기준을 추가합니다</p>
          </div>
          <Link
            href="/admin/criteria"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            목록으로
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 구분 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                구분 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="common"
                    checked={scope === 'common'}
                    onChange={(e) => setScope(e.target.value as 'common' | 'overseas')}
                    className="mr-2"
                  />
                  <span>공통 (국내·해외 공통)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="overseas"
                    checked={scope === 'overseas'}
                    onChange={(e) => setScope(e.target.value as 'common' | 'overseas')}
                    className="mr-2"
                  />
                  <span>해외 (해외 파트너만)</span>
                </label>
              </div>
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">카테고리를 선택하세요</option>
                {CATEGORIES[scope].map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 문항 ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                문항 ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                placeholder="예: c1a, oAa"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                카테고리 코드 + 알파벳 (예: c1a, c1b, oAa, oAb)
              </p>
            </div>

            {/* 평가 문항 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                평가 문항 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="평가 문항을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* 순서 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                순서
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                같은 카테고리 내에서의 표시 순서
              </p>
            </div>

            {/* 활성 상태 */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">활성 상태</span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                비활성으로 설정하면 평가에서 제외됩니다
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <Link
                href="/admin/criteria"
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 text-center"
              >
                취소
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

