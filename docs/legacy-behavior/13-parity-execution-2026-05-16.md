# 2026-05-16 Parity 실행 기록

## 목적
- `src_legacy`와 신규 `src` 사이의 실제 사용자 경험 차이를 줄이기 위한 실행 기록이다.
- 이번 세션은 분석 문서 재작성 목적이 아니라, 문서화된 parity inventory를 기준으로 실제 코드 수정과 재검증을 수행한 결과를 남긴다.

## 검증 완료 범위
- `/game` route: 상태바, 보드, 채팅, 참여자, 모바일 패널 전환, 참여자 말풍선, 오버레이, 로비 설정.
- `/` entry route: 초대 코드 기반 방 참여 모달, 오류 모달 우선순위, 입력 focus/hover/disabled 상태.
- game-session runtime: 채팅 후처리, 참여자 입퇴장 알림, 정답 알림, open 전 연결 실패 재시도.
- room invite/share: 기존 구현 유지 확인. 메뉴 외부 클릭, ESC, QR body scroll lock, clipboard/native share fallback은 신규 구조에 존재한다.

## 1차 기능 parity 검증 및 수정
- 채팅 submit 흐름을 legacy와 맞춰 입력창을 항상 사용할 수 있게 하고, 공백만 submit 차단하도록 조정했다.
- `isComposing` 및 `keyCode=229` 상태에서 Enter submit을 건너뛰어 한글 조합 입력 중 오동작을 방지했다.
- 서버 채팅 수신 시 `senderSessionId` 기준으로 닉네임, `mine`, `privilegedVisible`을 재계산하도록 복원했다.
- 로컬 정답 채팅에도 `privilegedVisible` 계산을 적용했다.
- 참여자 입장/퇴장, 방장 변경, 정답자 발생 시 legacy처럼 알림 채팅을 생성하도록 복원했다.
- 로비 설정에서 누락됐던 `wordChoiceCount`, `hintLetterCount`, `drawerOrderMode`, `endMode`, `customWordMode`, `customWordsRaw` 조작을 복원했다.
- private room 시작 조건을 복원했다: 최소 2명, `CUSTOM_ONLY` 모드에서 커스텀 단어 1자 이상.
- WebSocket open 전 close/생성 실패에 대해 최대 3회 지수 backoff 재시도를 복원하고, 상태값에 `reconnecting`을 추가했다.

## 2차 interaction/motion/css parity 검증 및 수정
- 모바일 패널 전환 버튼에 active, active press, focus-visible 상태를 복원했다.
- 모바일 채팅 입력 focus 시 채팅 패널을 우선 활성화하고, `scrollIntoView`와 `focus({ preventScroll: true })` 흐름을 복원했다.
- 모바일에서 채팅 패널이 비활성 상태여도 입력 도크가 하단 fixed로 남도록 복원했다.
- 채팅 리스트 하단 이탈 감지와 `최신 채팅 이동` floating 버튼을 복원했다.
- 채팅 tone별 색상(`correct`, `sealed`, `alert`, `alert-success`, highlighted)을 복원했다.
- 참여자 카드 enter/exit slide animation을 복원했다.
- 참여자 카드 내 카드, 출제자, 정답자 강조 색상/테두리 상태를 복원했다.
- 참여자별 최근 채팅 말풍선 레이어와 3초 fade motion을 복원했다.
- 보드 정답자 하이라이트 테두리/glow를 복원했다.
- DRAWING 단계 비밀단어/힌트 배너 drop motion을 복원했다.
- 출제자 전용 제시어 설명 `?` 버튼, 설명 bubble, 외부 pointerdown 닫힘, 내부 스크롤을 복원했다.
- stage overlay를 단순 조건 렌더링에서 open/closed transition과 5초 transient preview 흐름으로 변경했다.
- 단어 선택 버튼 hover lift와 결과 화면 shutter/border flash 성격의 motion을 추가했다.
- entry 입력 focus outline과 버튼 hover lift를 복원했다.

## 3차 운영 품질 및 디자인 완성도 검증 및 수정
- `npm run lint` 통과.
- `npm run typecheck` 통과.
- `npm run build` 통과.
- React hooks lint 기준에 맞추기 위해 effect 내부 동기 setState를 raf/timeout 기반으로 조정했다.
- 채팅/참여자/오버레이 로직은 legacy UX를 복원하되 `src_legacy` runtime import 없이 신규 feature/entity 경계를 유지했다.
- WebSocket 재시도는 legacy 정책과 동일하게 open 전 실패에만 적용하고, open 후 close는 세션 끊김으로 분류한다.

## 수정한 코드 범위
- `src/pages/game/GamePage.tsx`, `src/pages/game/GamePage.css`
- `src/features/game-chat/*`
- `src/features/participants/*`
- `src/features/game-board/*`
- `src/features/room-lobby/*`
- `src/features/game-session/*`
- `src/entities/game/api/*`, `src/entities/game/model/*`
- `src/entities/session/model/sessionTypes.ts`
- `src/features/entry-join/ui/*`

## Parity 상태
- 기능 parity: 핵심 사용자 흐름 기준으로 완료. 실서버 event payload 조합에 대한 다중 클라이언트 수동 확인은 필요하다.
- interaction/motion/css parity: 문서화된 고위험 체감 항목 기준으로 완료.
- 운영 품질: lint/typecheck/build 통과로 정적 품질 기준 완료.

## 남은 문제 및 실서버 QA 항목
- 실제 WebSocket 서버에서 2명 이상 접속 후 open 전 실패 재시도, open 후 세션 끊김 오류 전환을 확인해야 한다.
- 실제 모바일 Safari/Chrome에서 fixed 채팅 도크, 키보드 등장 후 scroll anchor, 더블탭/핀치 억제 체감을 확인해야 한다.
- 서버가 sender에게 채팅 echo를 보내는 경우 로컬 optimistic 메시지와 서버 echo가 중복 표시되는지 확인해야 한다. 현재 legacy와 동일하게 로컬 optimistic 메시지는 유지된다.
- 커스텀 단어 설정은 UI parity를 복원했지만, 서버가 compact settings 전체를 그대로 반영하는지 실서버 스냅샷으로 확인해야 한다.

## 다음 검증 범위
- 실서버 다중 브라우저 세션으로 `/game` end-to-end smoke 검증.
- 모바일 실기기에서 채팅 도크/패널 전환/캔버스 제스처 체감 검증.
- 서버 echo 정책 확인 후 필요 시 optimistic 채팅 dedupe 정책 추가 여부 결정.
