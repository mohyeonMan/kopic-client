# ko-pic Client Development Plan v0

## 1. 목표

이 문서는 `kopic-client` MVP 개발 계획을 정의한다.

- 캐치마인드/`skribbl.io` 계열의 멀티플레이 그림 맞히기 게임 클라이언트를 빠르게 구현하는 것이 목적이다.
- 현재 레포는 `React 19 + TypeScript + Vite` 시작 상태이므로, MVP에 필요한 화면/상태/실시간 통신 구조를 먼저 고정한다.
- 서버 문서(`Game Rules`, `Protocol Spec`, `Game Flow`)와 충돌하지 않도록 client 책임과 구현 순서를 명확히 한다.

---

## 2. 제품 범위

MVP 클라이언트는 아래 사용자 흐름을 지원해야 한다.

1. 사용자가 닉네임을 입력한다.
2. private room 생성 또는 room code로 입장한다.
3. 대기실에서 참가자 목록과 게임 설정을 본다.
4. host는 게임 설정을 바꾸고 게임을 시작한다.
5. 각 라운드마다 확정된 `drawerOrder`를 따라 모든 participant가 한 번씩 turn을 가진다.
6. 현재 turn의 drawer는 단어를 고르고 그림을 그린다.
7. 나머지 participant는 현재 turn에서 실시간 그림을 보고 정답을 입력한다.
8. 턴/라운드/게임 종료 상태를 실시간으로 반영한다.
9. 접속 직후 또는 불일치 발생 시 snapshot으로 UI를 복구한다.

MVP에서 제외해도 되는 항목:

- 친구 초대/소셜 기능
- 전적, 랭킹, 프로필
- 관전자 모드
- 모바일 앱 포장
- replay 저장, 그림 다운로드, 음성 채팅

---

## 3. 클라이언트 책임

클라이언트는 authoritative game state를 결정하지 않는다.

- HTTP로 room 생성/입장 정보를 받는다.
- WebSocket으로 runtime 이벤트를 수신하고 UI 상태를 동기화한다.
- 낙관적 업데이트보다 서버 이벤트 반영을 우선한다.
- canvas 입력, guess 입력, reconnect, snapshot 복구를 사용자에게 자연스럽게 보이게 만든다.

클라이언트가 직접 판단해도 되는 것:

- 입력 잠금 여부
- 버튼 노출/비활성화
- 로컬 드로잉 미리보기
- reconnect 중 로딩/오류 화면

클라이언트가 직접 결정하면 안 되는 것:

- 정답 판정
- 턴 종료/라운드 종료 시점
- 점수 계산
- drawer 권한 확정

---

## 4. 권장 기술 방향

현재 레포 기준 권장 선택은 아래와 같다.

- Routing: `react-router-dom`
- Server state/API: `@tanstack/react-query`
- Runtime state: 앱 전역 store 1개(`zustand` 또는 React context + reducer)
- WS transport: 앱 전용 `GameSocketClient`
- Drawing: `CanvasRenderingContext2D` 기반 2D canvas
- Validation: `zod`
- Styling: CSS Modules 또는 feature 단위 CSS

이유:

- HTTP 상태와 WS runtime 상태의 성격이 다르므로 분리하는 편이 단순하다.
- 게임 상태는 빠르게 변하므로 component tree 전체에 props로 흘리지 않는 편이 낫다.
- 캔버스는 MVP에서는 WebGL보다 2D canvas가 구현/디버깅 비용이 낮다.

---

## 5. 화면 구조

MVP 화면은 아래 5개로 나눈다.

### 5.1 Entry

- 닉네임 입력
- private room 생성 버튼
- room code 입력 후 입장
- 최근 오류 메시지 표시

### 5.2 Lobby

- room code, 공유 액션
- participant 목록
- host 표시
- 게임 설정 편집 폼
- start button

### 5.3 Game

- 상단 진행 정보(`round`, `turn`, 남은 시간)
- 현재 라운드의 `drawerOrder`와 `turnCursor`
- 중앙 drawing board
- 우측 또는 하단 guess/chat feed
- participant score board
- 현재 turn의 drawer 전용 단어 선택 또는 드로잉 툴바
- guesser 전용 정답 입력창

### 5.4 Result

- 최종 점수표
- 우승자 강조
- 다음 게임 대기 상태 진입 안내

### 5.5 Reconnect/Error Overlay

- 연결 중
- 재연결 시도 중
- snapshot 복구 중
- 치명 오류 발생 시 재입장 유도

---

## 6. 상태 모델

클라이언트 상태는 크게 4개로 분리한다.

1. `session`
- nickname
- userId
- auth/token 또는 guest session

2. `room`
- roomId
- roomCode
- roomType
- participants
- hostUserId
- settings

3. `game`
- roomState(`LOBBY`, `RUNNING`, `RESULT`)
- gameId
- currentRound(`roundNo`, `drawerOrder`, `turnCursor`)
- currentTurn(`turnId`, `drawerUserId`, `phase`)
- scores
- canvas snapshot
- event sync metadata

4. `connection`
- socket status
- last rid
- reconnect attempt
- snapshot sync 상태

핵심 원칙:

- HTTP 응답으로 room 진입 컨텍스트를 만든다.
- authoritative runtime 반영은 WS 이벤트와 `408 GAME_SNAPSHOT`만 사용한다.
- 개별 이벤트 적용 로직과 snapshot 치환 로직을 분리한다.
- `currentRound`와 `currentTurn`은 별도 레벨로 관리한다.
- 현재 라운드 중간 입장자는 guess는 가능하지만 `drawerOrder`에는 포함되지 않는다.

---

## 7. 추천 폴더 구조

```text
src/
  app/
    providers/
    router/
    store/
  shared/
    api/
    lib/
    model/
    ui/
  features/
    session/
    room-entry/
    lobby-settings/
    participant-list/
    game-canvas/
    guess-chat/
    scoreboard/
    reconnect-overlay/
  entities/
    room/
    participant/
    game/
    turn/
  pages/
    entry/
    lobby/
    game/
    result/
  ws/
    client/
    protocol/
    reducers/
```

구조 원칙:

- page는 조립만 담당한다.
- feature는 사용자 액션과 화면 조각을 가진다.
- `ws/`는 이벤트 파싱, 연결, reducer 적용을 담당한다.
- canvas 로직은 별도 feature로 분리해 렌더링 비용과 복잡도를 고립한다.

---

## 8. 실시간 이벤트 처리 전략

프로토콜 문서 기준으로 아래 전략을 추천한다.

1. socket 연결 직후 서버 lifecycle join 완료를 기다린다.
2. 최초 동기화는 `408 GAME_SNAPSHOT` 기준으로 화면을 세팅한다.
3. `301`~`311`, `401`~`406`, `408` 이벤트는 모두 단일 dispatcher를 통해 store에 반영한다.
4. reducer는 "이벤트 적용"과 "stale 무시"를 함께 처리한다.
5. 턴 불일치, 누락 의심, reconnect 직후에는 즉시 `106 GAME_SNAPSHOT_REQUEST`를 보낸다.

권장 세부 규칙:

- `401 CANVAS_STROKE`는 순서대로 append만 한다.
- `402 CANVAS_CLEAR`는 현재 turn canvas를 즉시 reset 한다.
- `304 TURN_STARTED`, `305 TURN_ENDED`, `306 ROUND_ENDED`, `307 GAME_ENDED`는 UI phase 전환의 기준 이벤트다.
- `406 WORD_CHOICES`는 drawer에게만 노출되는 로컬 상태로 관리한다.
- reconnect 이후에는 개별 누락 이벤트 재생보다 snapshot 재동기화를 우선한다.
- `303 ROUND_STARTED` 시점에 그 라운드의 `drawerOrder`를 고정해서 화면에 표시할 수 있어야 한다.

---

## 9. Canvas 설계

canvas는 가장 먼저 기술 부채가 쌓이는 영역이므로 단순한 규칙으로 시작한다.

- 내부 좌표계는 프로토콜과 동일하게 정규화 좌표(`0.0..1.0`)를 사용한다.
- 렌더링 시 실제 캔버스 픽셀 크기로 변환한다.
- 로컬 사용자의 stroke는 그리는 동안 즉시 화면에 미리 보여준다.
- 서버 전송 payload는 protocol spec 배열 포맷을 그대로 사용한다.
- drawer가 아니면 pointer event를 비활성화한다.

권장 구성:

- `CanvasStage`: 실제 canvas element 소유
- `CanvasRenderer`: stroke list를 캔버스에 그림
- `CanvasInputController`: pointer 입력을 stroke로 변환
- `CanvasViewport`: resize 대응과 DPR 처리

초기 최적화 원칙:

- stroke 전체 재생이 느려지기 전까지는 단순 replay 방식으로 구현한다.
- 성능 이슈가 확인되면 turn 단위 offscreen bitmap 캐시를 추가한다.

---

## 10. API/WS 경계

HTTP와 WS 경계는 명확히 분리한다.

### 10.1 HTTP

- create private room
- join by room code
- room 진입에 필요한 `roomId`, `userId`, token/session 정보 수신

### 10.2 WS

- runtime event 수신
- `105`, `106`, `107`, `201`, `202`, `204`, `205` 송신
- ping/pong, reconnect, snapshot recovery 처리

권장 연결 흐름:

1. entry/lobby API 호출
2. room context 저장
3. WS 연결
4. `408 GAME_SNAPSHOT` 수신 대기
5. game/lobby 화면 활성화

---

## 11. 구현 단계

### Phase 1. 프로젝트 기반 정리

- Vite 기본 화면 제거
- 라우터, 전역 스타일, 에러 바운더리, 기본 레이아웃 추가
- 환경 변수 구조 정의(`VITE_API_BASE_URL`, `VITE_WS_BASE_URL`)
- 문서 기준 이벤트 코드/타입 정의

완료 기준:

- entry/lobby/game/result 라우트 껍데기가 존재한다.
- mock 상태로 화면 전환이 가능하다.

### Phase 2. Lobby/Entry MVP

- 닉네임 입력 플로우
- room 생성/입장 form
- room participant 목록/설정 화면
- host 전용 시작/설정 변경 UI

완료 기준:

- HTTP mock 또는 실제 API로 private room 입장까지 가능하다.

### Phase 3. WS 런타임 동기화

- `GameSocketClient` 구현
- envelope parser, event dispatcher, reconnect 정책 구현
- `408` snapshot 적용
- 주요 room/game 이벤트 reducer 구현

완료 기준:

- refresh 또는 재연결 후 snapshot 기반으로 상태가 복구된다.

### Phase 4. Canvas/Guess 상호작용

- drawer canvas 입력
- stroke/clear 송신
- guess 입력 및 feed 반영
- 턴 상태별 입력 잠금

완료 기준:

- 두 명 이상이 같은 room에서 그림과 추측을 실시간으로 주고받을 수 있다.

### Phase 5. 게임 진행 UI 완성

- 라운드/턴 전환 애니메이션
- `drawerOrder` rail, `turnCursor`, 현재 drawer 강조
- word choice UI
- scoreboard 갱신
- result 화면

완료 기준:

- `GAME_STARTED`부터 `GAME_ENDED`까지 전 구간을 UI에서 끊김 없이 경험할 수 있다.
- 한 라운드 안에서 모든 participant의 turn이 순서대로 소비되는 구조가 화면에서 명확하다.

### Phase 6. 안정화

- reconnect overlay
- 예외 케이스 처리
- throttling/debouncing
- 접근성, 반응형, 기본 테스트 추가

완료 기준:

- 네트워크 일시 끊김, stale event, 잘못된 권한 상태에서 앱이 무너지지 않는다.

---

## 12. 우선 구현 순서

실행 순서는 아래가 가장 안전하다.

1. protocol type 정의
2. app shell + router
3. room entry/lobby mock UI
4. ws client + snapshot reducer
5. game phase UI
6. canvas 입력/렌더링
7. guess/chat feed
8. reconnect/error handling
9. 테스트/다듬기

이 순서를 추천하는 이유:

- 화면을 먼저 만들면 서버 이벤트를 어디에 반영할지 빨리 고정할 수 있다.
- snapshot reducer를 먼저 고정하면 이후 이벤트 reducer 설계가 단순해진다.
- canvas를 너무 일찍 만들면 프로토콜/상태 구조가 흔들릴 가능성이 크다.

---

## 13. 테스트 전략

최소 테스트 범위는 아래를 권장한다.

- reducer unit test
- protocol parser test
- canvas stroke serializer test
- reconnect 후 snapshot recovery test
- host/non-host 권한별 UI gating test

수동 QA 시나리오:

1. 2인 private room 생성 후 게임 시작
2. drawer 단어 선택 시간 초과
3. guesser 정답 입력 성공
4. 턴 종료 직전 clear/stroke 입력
5. 게임 중 새로고침 후 snapshot 복구
6. host가 아닌 사용자의 설정 변경/시작 시도

---

## 14. 첫 구현 스프린트 제안

첫 스프린트는 아래 범위로 자르는 것이 적절하다.

- `src` 기본 구조 재배치
- 라우터/레이아웃 추가
- protocol event type 정의
- entry/lobby/game page skeleton 작성
- mock store 기반 participant, settings, scoreboard UI 작성

첫 스프린트 산출물:

- 디자이너 없이도 흐름을 검증할 수 있는 clickable prototype
- 이후 WS 연결을 붙일 수 있는 안정된 화면 골격

---

## 15. 다음 문서 후보

클라이언트 구현 전에 아래 문서가 추가되면 개발 속도가 더 빨라진다.

- `Client Screen Spec`
- `Client State Reducer Spec`
- `Client WS Event Mapping`
- `Canvas Interaction Spec`
- `Lobby/Entry HTTP API Contract`
