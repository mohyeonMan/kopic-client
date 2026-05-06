# Mobile iOS Chat UI Stabilization Plan

## Goal
- iPhone Safari 기준으로 채팅 입력 시 레이아웃 붕괴(채팅 가림/사라짐)와 스크롤 포커스 문제를 해결한다.
- 기존 `지우기` 버튼을 `전송` 버튼으로 롤백한다.
- 게임 화면 상단 헤더(`KOPIC`, `나가기`)가 별도 고정처럼 보이지 않고 화면과 함께 스크롤되도록 수정한다.

## Constraints
- iOS Safari의 키보드 보조바(`이전/다음/완료`)는 웹(PWA/모바일 브라우저)에서 완전 제거를 보장할 수 없다.
- 따라서 `완료` 자체 제거 대신, 실제 사용 흐름에서 `전송` 버튼/엔터 전송 중심으로 동작하고 화면 점프를 최소화하는 방향으로 처리한다.

## Work Items

### 1) 채팅 액션 버튼 롤백
- Status: `done`
- Change:
  - `지우기` 버튼 제거
  - `전송` 버튼 복원 (`빈 입력 시 비활성`)
- Files:
  - `src/pages/game/components/GameChatPanel.tsx`
  - `src/pages/game/components/GameChatPanel.css`

### 2) 상단 헤더 스크롤 동기화
- Status: `done`
- Change:
  - 모바일에서 실제 스크롤 컨테이너를 `page-frame`에서 `app-shell-game`으로 이동
  - 헤더가 동일 스크롤 컨텍스트에 포함되도록 수정
- Files:
  - `src/app/ui/AppLayout.css`

### 3) 키보드 포커스 시 상단 기준점 수정
- Status: `done`
- Change:
  - 입력 포커스 시 `window.scrollTo(0,0)` 제거
  - 라운드/시간 상태바를 스크롤 앵커로 사용
- Files:
  - `src/pages/game/GamePage.tsx`
  - `src/pages/game/components/GameStatusBar.tsx`

### 4) 입력창이 채팅을 가리는 문제 해결
- Status: `done`
- Change:
  - 모바일 채팅 패널의 하단 여백 계산에서 `keyboardInset` 이중 반영 제거
  - 채팅 리스트가 항상 입력창 위에서 보이도록 여백/최대높이 재조정
- Files:
  - `src/pages/game/components/GameChatPanel.css`

### 5) 키보드 노출 시 채팅 내용 소실 방지
- Status: `done`
- Change:
  - 키보드 활성화 시 채팅 패널 높이/스크롤 확보
  - `chat-focus` 모드 높이 제한 완화
- Files:
  - `src/pages/game/components/GameChatPanel.css`

### 6) 검증
- Status: `in_progress`
- Automated checks:
  - `npm run typecheck` 통과
  - `npm run build` 통과
- Checkpoints:
  - iPhone Safari에서 입력 포커스 시 상단 기준이 상태바인지
  - 입력창이 채팅을 덮지 않는지
  - 키보드 표시 중에도 채팅 메시지가 보이고 스크롤 가능한지
  - `전송` 버튼 및 엔터 전송 정상 동작하는지

## Completion Criteria
- 타입체크/빌드 통과
- iPhone Safari 실기기 시나리오 체크 완료
