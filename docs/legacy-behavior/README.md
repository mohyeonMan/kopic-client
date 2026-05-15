# src_legacy 행동 명세 인벤토리

## 문서 목적
- 이 문서는 `src_legacy`의 실제 동작을 기능 명세로 고정하기 위한 기준서다.
- 이후 이관 작업에서 기능 누락 탐지, 패리티 검증, 회귀 방지의 기준으로 사용한다.

## 분석 범위
- 페이지 단위: 입장 페이지, 게임 페이지, 상단 공유/나가기 동작.
- 기능 단위: 입장, 라우팅/세션, 로비 설정, 보드/캔버스, 채팅, 참여자, 오버레이, 웹소켓.
- 사용자 행동 단위: 버튼/입력/패널 전환/모달/공유/나가기.
- 상태 흐름 단위: 세션 상태, 방 상태, 턴 상태, 채팅/캔버스 상태, 오류 상태.
- 인터랙션 단위: open/closed 클래스 전환, 포커스 이동, 스크롤 정렬, 테두리/색상 강조, 애니메이션 진입/이탈.

## 기능 인벤토리

| 문서 | 기능 | 신규 src 존재 여부 | 패리티 상태 | 핵심 위험 |
|---|---|---|---|---|
| [01-입장-참여-흐름.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/01-입장-참여-흐름.md) | 닉네임 입력, 빠른입장/방만들기/방참여, 오류 모달 | 존재 | 일부 완료, parity 미확인 | 오류 복구/중복 요청 경계 |
| [02-라우팅-세션-생명주기.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/02-라우팅-세션-생명주기.md) | `/game` 가드, 세션 유지/해제, 나가기/뒤로가기 | 존재 | 일부 완료, parity 미확인 | 연결 재시도 정책 차이 |
| [03-방-공유-초대-흐름.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/03-방-공유-초대-흐름.md) | 링크/코드 복사, 네이티브 공유, QR 모달 | 존재 | 대부분 완료, parity 미확인 | QR 실패 시 안내 일관성 |
| [04-로비-설정-게임시작.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/04-로비-설정-게임시작.md) | 호스트 설정 변경, 시작 조건 검증 | 존재 | 일부 완료, parity 미확인 | 설정 항목 누락 가능성 높음 |
| [05-보드-그리기-캔버스.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/05-보드-그리기-캔버스.md) | 펜/지우개/채우기, 청크 전송, 비밀단어 배너 | 존재 | 일부 완료, parity 미확인 | 설명 툴팁/표시 조건 누락 |
| [06-채팅-정답-제출-흐름.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/06-채팅-정답-제출-흐름.md) | 입력/전송, 특권 가시성, 자동 스크롤 | 존재 | 일부 완료, parity 미확인 | 특권 채팅 표시 손실 위험 |
| [07-참여자-패널-버블.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/07-참여자-패널-버블.md) | 참여자 카드 애니메이션, 말풍선 피드백 | 부분 존재 | 미이관 요소 큼 | 말풍선 UX 완전 누락 |
| [08-오버레이-라운드-턴-결과.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/08-오버레이-라운드-턴-결과.md) | 게임시작/라운드시작/턴시작/턴종료/결과 오버레이 | 존재 | 일부 완료, parity 미확인 | 5초 자동 프리뷰/카운트다운 차이 |
| [09-상태정규화-리듀서-흐름.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/09-상태정규화-리듀서-흐름.md) | 스냅샷 정규화, 상태 전이, 로컬 낙관 반영 | 존재 | 일부 완료, parity 미확인 | 필드 보정 로직 누락 시 회귀 |
| [10-웹소켓-프로토콜-오류복구.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/10-웹소켓-프로토콜-오류복구.md) | 연결 수명주기, heartbeat, 재연결, 이벤트 디코딩 | 존재 | 일부 완료, parity 미확인 | 재연결/오류 전환 동작 차이 |
| [11-API-이벤트-뮤테이션-매트릭스.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/11-API-이벤트-뮤테이션-매트릭스.md) | 사용자 행동-이벤트-상태전이 추적표 | 존재 | 일부 완료, parity 미확인 | 후처리 뮤테이션 누락 탐지 필요 |
| [12-인터랙션-액션-모션-명세.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/12-인터랙션-액션-모션-명세.md) | 슬라이드/카드 전환, 포커스 전환, 모션 상태머신 | 부분 존재 | parity 미충족 구간 다수 | 체감 UX 회귀 위험 높음 |
| [13-parity-execution-2026-05-16.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/legacy-behavior/13-parity-execution-2026-05-16.md) | 실제 parity 검증/수정 실행 기록 | 존재 | 핵심 범위 코드 수정 및 정적 검증 완료 | 실서버/모바일 수동 QA 필요 |

## 2026-05-16 실행 결과 요약
- `/game` 핵심 체감 범위(모바일 패널, 채팅 도크/스크롤, 참여자 카드/말풍선, 보드 비밀단어 배너, stage overlay, 로비 설정)를 실제 코드로 수정했다.
- `/` 입장 흐름의 오류 모달 우선순위, focus outline, 버튼 hover/disabled 체감을 보정했다.
- game-session runtime에 open 전 연결 실패 재시도(`최대 3회`, 지수 backoff)와 `reconnecting` 상태를 복원했다.
- 채팅 `privilegedVisible`, 입퇴장/방장변경/정답 알림 후처리를 복원했다.
- `npm run lint`, `npm run typecheck`, `npm run build` 통과.
- 남은 검증은 실서버 다중 클라이언트와 모바일 실기기 QA다.

## 다음 분석 대상 선정 기준
- 우선순위 1: 패리티 위험이 높은 기능(로비 설정, 오버레이, 채팅 특권 표시, 참여자 버블).
- 우선순위 2: 사용자 체감 UX 차이가 큰 기능(모바일 포커스/스크롤, 제스처 방지, 카운트다운).
- 우선순위 3: 상태 정합성 기능(스냅샷 보정, 연결 오류 전이).
