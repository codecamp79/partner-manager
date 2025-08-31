'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUserPermissions } from '@/lib/auth';
import { getPermissions } from '@/lib/types';
import { Permission, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';

const ROLE_LABELS = {
  admin: '관리자',
  manager: '매니저',
  user: '일반 사용자',
};

const PERMISSION_LABELS = {
  canViewPartners: '파트너 조회',
  canCreatePartners: '파트너 생성',
  canEditPartners: '파트너 수정',
  canDeletePartners: '파트너 삭제',
  canViewEvaluations: '평가 조회',
  canCreateEvaluations: '평가 생성',
  canEditEvaluations: '평가 수정',
  canDeleteEvaluations: '평가 삭제',
  canExportData: 'CSV 다운로드',
  canViewAdmin: '관리자 페이지 접근',
  canManageUsers: '사용자 관리',
};

export default function RolesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userPermissions = await getUserPermissions(u.email!);
          setPermissions(userPermissions);
          
          if (!userPermissions.canManageUsers) {
            router.replace('/');
            return;
          }
        } catch (error) {
          console.error('Error loading user permissions:', error);
          router.replace('/');
          return;
        }
      } else {
        router.replace('/login');
        return;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const rolePermissions = getPermissions(selectedRole);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }

  if (!permissions?.canManageUsers) {
    return <div className="min-h-screen flex items-center justify-center">접근 권한이 없습니다.</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">권한 설정</h1>
          <p className="text-sm text-gray-600">역할별 권한을 확인하고 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            관리자 메인
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 역할 선택 */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold mb-4">역할 선택</h3>
            <div className="space-y-3">
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <label key={role} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-gray-600">
                      {role === 'admin' && '모든 기능 접근 가능'}
                      {role === 'manager' && '대부분 기능 접근 가능'}
                      {role === 'user' && '기본 기능만 접근 가능'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 권한 상세 */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold mb-4">
              {ROLE_LABELS[selectedRole]} 권한 상세
            </h3>
            
            <div className="space-y-4">
              {/* 파트너 관리 권한 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">파트너 관리</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(PERMISSION_LABELS)
                    .filter(([key]) => key.startsWith('can') && key.includes('Partners'))
                    .map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{label}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rolePermissions[key as keyof Permission] 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rolePermissions[key as keyof Permission] ? '허용' : '거부'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* 평가 관리 권한 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">평가 관리</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(PERMISSION_LABELS)
                    .filter(([key]) => key.startsWith('can') && key.includes('Evaluations'))
                    .map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{label}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rolePermissions[key as keyof Permission] 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rolePermissions[key as keyof Permission] ? '허용' : '거부'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* 시스템 권한 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">시스템 권한</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(PERMISSION_LABELS)
                    .filter(([key]) => key.startsWith('can') && !key.includes('Partners') && !key.includes('Evaluations'))
                    .map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{label}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rolePermissions[key as keyof Permission] 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rolePermissions[key as keyof Permission] ? '허용' : '거부'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 권한 설명 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">👤 일반 사용자</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 파트너 조회 및 생성</li>
            <li>• 평가 조회 및 생성</li>
            <li>• 기본적인 업무 수행</li>
          </ul>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200">
          <h4 className="font-semibold text-orange-800 mb-2">👨‍💼 매니저</h4>
          <ul className="text-sm text-orange-700 space-y-1">
            <li>• 파트너 수정 및 CSV 다운로드</li>
            <li>• 평가 수정</li>
            <li>• 팀 관리 및 보고서 작성</li>
          </ul>
        </div>
        
        <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
          <h4 className="font-semibold text-red-800 mb-2">👑 관리자</h4>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• 모든 기능 접근</li>
            <li>• 사용자 관리</li>
            <li>• 시스템 설정 및 관리</li>
          </ul>
        </div>
      </div>

      {/* 주의사항 */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">ℹ️ 권한 시스템 안내</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 권한은 역할별로 자동 설정되며 수동 변경은 불가능합니다.</li>
          <li>• 사용자별 권한 변경은 "사용자 목록"에서 역할을 변경하세요.</li>
          <li>• 권한 변경은 즉시 적용되며 별도 재로그인이 필요할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}
