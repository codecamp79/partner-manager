// src/lib/types.ts
import type { Timestamp } from 'firebase/firestore';

// 사용자 관련 타입들
export type UserRole = 'user' | 'manager' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  displayName?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
}

// 권한 관련 타입들
export interface Permission {
  canViewPartners: boolean;
  canCreatePartners: boolean;
  canEditPartners: boolean;
  canDeletePartners: boolean;
  canEvaluatePartners: boolean;
  canViewEvaluations: boolean;
  canManageUsers: boolean;
  canViewAdmin: boolean;
  canExportData: boolean;
  canBackupData: boolean;
}

// 역할별 권한 반환 함수
export function getPermissions(role: UserRole): Permission {
  switch (role) {
    case 'admin':
      return {
        canViewPartners: true,
        canCreatePartners: true,
        canEditPartners: true,
        canDeletePartners: true,
        canEvaluatePartners: true,
        canViewEvaluations: true,
        canManageUsers: true,
        canViewAdmin: true,
        canExportData: true,
        canBackupData: true,
      };
    case 'manager':
      return {
        canViewPartners: true,
        canCreatePartners: true,
        canEditPartners: true,
        canDeletePartners: false,
        canEvaluatePartners: true,
        canViewEvaluations: true,
        canManageUsers: false,
        canViewAdmin: false,
        canExportData: true,
        canBackupData: false,
      };
    case 'user':
    default:
      return {
        canViewPartners: true,
        canCreatePartners: false,
        canEditPartners: false,
        canDeletePartners: false,
        canEvaluatePartners: false,
        canViewEvaluations: false,
        canManageUsers: false,
        canViewAdmin: false,
        canExportData: false,
        canBackupData: false,
      };
  }
}

// 국내/해외 구분
export type PartnerScope = 'domestic' | 'overseas';

// 파트너 기본 정보 (필수/옵션 반영)
export interface Partner {
  id?: string;                 // Firestore 문서 id (읽을 때 채움)
  scope: PartnerScope;         // 'domestic' | 'overseas'
  country: string;             // 국가 (국내는 'Korea' 등으로 통일)
  name: string;                // 이름
  org: string;                 // 소속
  phone?: string;              // 연락처(옵션)
  email?: string;              // 이메일(옵션)
  createdAt: Timestamp;        // 생성일
  updatedAt?: Timestamp;       // 수정일
  archived?: boolean;          // 삭제 대신 보관처리 시 true (하드삭제는 별도)
}

// 평가 결과 저장(버전 이력 관리용)
export interface Evaluation {
  id?: string;
  partnerId: string;           // 어떤 파트너의 평가인지 참조
  version: number;             // 1,2,3... (새 평가시 +1)
  scope: PartnerScope;         // 국내/해외(문항 세트 선택용)
  // 설문 점수(숫자 배열): 0~5 또는 0~10 등 UI에서 사용
  // 국내: common만 사용, 해외: common + overseas 사용
  answersCommon: number[];     // 공통 문항 점수 목록
  answersOverseas?: number[];  // 해외 보강 문항 점수 목록
  totalScore: number;          // 0~100 환산 점수
  rating: 'GOOD' | 'OK' | 'CAUTION' | 'UNTRUSTWORTHY'; // 등급
  note?: string;               // 메모
  createdAt: Timestamp;        // 저장 시각(이력 정렬용)
}

// 점수→등급 규칙 (요구사항 반영)
export function classifyScore(score: number):
  'GOOD' | 'OK' | 'CAUTION' | 'UNTRUSTWORTHY' {
  if (score >= 80) return 'GOOD';
  if (score >= 60) return 'OK';
  if (score >= 40) return 'CAUTION';
  return 'UNTRUSTWORTHY';
}