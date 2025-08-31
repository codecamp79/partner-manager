'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUser } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Firebase Auth로 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Firestore에 사용자 정보 저장 (pending 상태)
      await createUser(email, 'user', displayName);
      
      // 로그아웃 (승인 전까지는 로그인 불가)
      await auth.signOut();
      
      // 더 자세한 안내 메시지
      const message = `회원가입이 완료되었습니다!

📧 이메일: ${email}
👤 이름: ${displayName || '미입력'}

⚠️ 관리자 승인이 필요합니다.
승인 완료 후 로그인이 가능합니다.

관리자가 없다면 Firebase Console에서 직접 사용자를 생성하거나, 
다른 이메일로 관리자 계정을 만들어주세요.`;
      
      alert(message);
      router.push('/login');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다. 로그인 페이지에서 로그인을 시도하거나, 관리자에게 문의하세요.');
      } else if (error.code === 'auth/weak-password') {
        setError('비밀번호는 6자 이상이어야 합니다.');
      } else if (error.code === 'auth/invalid-email') {
        setError('유효하지 않은 이메일입니다.');
      } else {
        setError('회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">회원가입</h2>
          <p className="mt-2 text-sm text-gray-600">
            파트너 관리 시스템에 가입하세요
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                이름
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="6자 이상"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
        </form>

        {/* 안내사항 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">📋 회원가입 안내</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 회원가입 후 관리자 승인이 필요합니다.</li>
            <li>• 승인 완료 시 이메일로 알림을 받습니다.</li>
            <li>• 승인 전까지는 로그인이 제한됩니다.</li>
            <li>• 관리자가 없다면 Firebase Console에서 직접 사용자를 생성하세요.</li>
          </ul>
        </div>

        {/* 관리자 계정 생성 안내 */}
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">🔑 관리자 계정 생성</h3>
          <p className="text-sm text-yellow-700 mb-2">
            첫 번째 관리자 계정을 생성하려면:
          </p>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>회원가입 후 Firebase Console에 접속</li>
            <li>Authentication &gt; Users에서 해당 사용자 찾기</li>
            <li>Firestore Database &gt; users 컬렉션에서 해당 문서 찾기</li>
            <li>role 필드를 &apos;admin&apos;으로 변경</li>
            <li>status 필드를 &apos;approved&apos;로 변경</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
