// src/lib/forms.ts
import type { PartnerScope } from './types';

// 문항 타입
export type FormQuestion = { id: string; text: string };

// 0~5 점수(0=전혀 아님, 5=매우 그렇다)
export const MAX_PER_ITEM = 5 as const;

// ✅ 공통(국내·해외 공통) — 15문항
export const COMMON_QUESTIONS: FormQuestion[] = [
  // 1. 이해관계 투명성
  { id: 'c1a', text: '상대의 목적이 명확한가?' },
  { id: 'c1b', text: '우리가 빠지면 프로젝트가 진행이 불가능한가?' },
  { id: 'c1c', text: '파트너는 우리를 동등한 파트너로 인지하는가?' },

  // 2. 기여와 결과물 균형
  { id: 'c2a', text: '투입(돈·시간·노력)과 상대 투입이 균형적인가?' },
  { id: 'c2b', text: '성과물에 우리의 이름이 남는가?' },
  { id: 'c2c', text: '결과가 상호 윈윈 구조인가?' },

  // 3. 법적·제도적 장치
  { id: 'c3a', text: '계약/MoU에 권리·소유권이 명시돼 있는가?' },
  { id: 'c3b', text: '비용·이익 분배가 서면으로 합의돼 있는가?' },
  { id: 'c3c', text: '중도 이탈 시 책임·권리가 문서에 규정돼 있는가?' },

  // 4. 실행력 검증
  { id: 'c4a', text: '과거 성과·레퍼런스가 있는가?' },
  { id: 'c4b', text: '네트워크·영향력이 실제 검증 가능한가?' },
  { id: 'c4c', text: '끝까지 실행할 능력이 있는가?' },

  // 5. Exit 전략
  { id: 'c5a', text: '틀어져도 우리가 챙길 최소 자산이 있는가?' },
  { id: 'c5b', text: '철수·종료 조항이 계약에 포함돼 있는가?' },
  { id: 'c5c', text: '실패해도 얻는 게 남는 구조인가?' },
];

// 🌍 해외 보강 — 8문항
export const OVERSEAS_QUESTIONS: FormQuestion[] = [
  // A. 현지 제도·법적 환경
  { id: 'oAa', text: '현지에서 계약이 실제로 법적 효력을 가질 수 있는가?' },
  { id: 'oAb', text: '정치/정부/기관과의 관계가 안정적인가?' },

  // B. 언어·문화 차이
  { id: 'oBa', text: '중요한 합의는 반드시 이중 언어 문서로 남기는가?' },
  { id: 'oBb', text: '문화적 오해를 줄이기 위한 현지 자문/브로커를 확보했는가?' },

  // C. 실행력·지속성
  { id: 'oCa', text: '파트너가 실행 자금을 실제로 보유하고 있는가?' },
  { id: 'oCb', text: '단기 이벤트용이 아닌 지속 가능한 구조인지 확인했는가?' },

  // D. Exit 전략(해외 특화)
  { id: 'oDa', text: '문제가 생겼을 때 대체 파트너를 확보할 수 있는가?' },
  { id: 'oDb', text: '현지에 남긴 자산(기술·데이터·콘텐츠)을 회수 가능한가?' },
];

// 점수 배열을 0~100으로 환산 (국내=공통만, 해외=공통+해외)
export function toHundred(
  scope: PartnerScope,
  answersCommon: number[],
  answersOverseas?: number[]
): number {
  const usedCommon = answersCommon.slice(0, COMMON_QUESTIONS.length);
  const usedOverseas =
    scope === 'overseas' ? (answersOverseas ?? []).slice(0, OVERSEAS_QUESTIONS.length) : [];

  const sum = [...usedCommon, ...usedOverseas].reduce(
    (a, b) => a + (Number.isFinite(b) ? b : 0),
    0
  );

  const itemCount =
    scope === 'overseas'
      ? COMMON_QUESTIONS.length + OVERSEAS_QUESTIONS.length
      : COMMON_QUESTIONS.length;

  const max = itemCount * MAX_PER_ITEM;
  const pct = max === 0 ? 0 : (sum / max) * 100;
  // 소수점 1자리 반올림
  return Math.round(pct * 10) / 10;
}
