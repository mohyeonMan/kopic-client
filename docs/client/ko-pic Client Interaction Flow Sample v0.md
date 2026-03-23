# ko-pic Client Interaction Flow Sample v0

## 1. 목적

이 문서는 `ko-pic Game Rules` 기준으로 클라이언트 화면 이동과 주요 상호작용 흐름을 샘플로 정리한다.

- 목표는 "어떤 이벤트에서 어떤 화면/오버레이/입력 상태가 보여야 하는가"를 빠르게 맞추는 것이다.
- private room MVP를 기준으로 작성한다.

---

## 2. 큰 화면 흐름

1. `Entry`
2. `Lobby`
3. `Game`
5. `Lobby` 복귀

주의:

- private room은 게임 종료 후 바로 방이 사라지는 것이 아니라 결과 화면을 보여준 뒤 다시 lobby로 돌아간다.
- `Game` 화면 안에서 `round`, `turn`, `drawer`, `word choice`, `drawing`, `turn result`, `game result`가 계속 바뀐다.

---

## 3. Entry -> Lobby

### 3.1 Entry 화면

사용자 입력:

- nickname 입력
- room create 또는 room code join

성공 시:

- HTTP 응답으로 `roomId`, `roomCode`, `userId` 등 진입 컨텍스트 확보
- WS 연결 시작
- 화면은 즉시 `Lobby` 또는 `Game` shell로 이동 가능
- 단, 실데이터 렌더링은 `408 GAME_SNAPSHOT` 수신 후 확정

실패 시:

- Entry 화면에 에러 메시지 유지

---

## 4. Lobby 화면

### 4.1 공통 표시

- room code
- participant 목록
- host 표시
- private room 설정 값

### 4.2 host 상호작용

- `107 GAME_SETTINGS_UPDATE_REQUEST`
- `105 GAME_START_REQUEST`

클라이언트 규칙:

- host만 설정 폼과 start 버튼을 활성화한다.
- non-host는 read-only로 본다.
- 설정 값은 lobby 상태에서만 수정 가능하다.

### 4.3 participant 변화

수신 이벤트:

- `301 ROOM_JOINED`
- `309 ROOM_LEFT`

화면 반응:

- participant 목록 즉시 갱신
- host가 나가면 새 host 표시 갱신
- 현재 lobby에서 "다음 round drawer order는 현재 participant snapshot으로 결정된다"는 안내를 보여주는 편이 좋다.

---

## 5. Game 시작 흐름

### 5.1 game start

수신 이벤트:

- `302 GAME_STARTED`

화면 반응:

- `Lobby -> Game` 전환
- scoreboard 초기화
- "게임 시작" 전환 상태 노출

### 5.2 first round start

수신 이벤트:

- `303 ROUND_STARTED`

화면 반응:

- `roundNo`
- 현재 라운드의 `drawerOrder`
- `turnCursor = 0`

중요:

- 이 시점에 현재 라운드의 drawer 순서를 rail 또는 stepper처럼 고정 표시하는 게 맞다.
- 중간 입장자는 이 round의 `drawerOrder`에는 들어가지 않는다.

---

## 6. Turn 샘플 흐름

### 6.1 turn started

수신 이벤트:

- `304 TURN_STARTED`

화면 반응:

- 현재 drawer 강조
- turn 번호 갱신
- canvas 초기화
- guess input은 잠시 비활성 또는 "단어 선택 대기" 상태

### 6.2 word choice

drawer 수신:

- `406 WORD_CHOICES`

guesser 수신:

- `311 TURN_STATE(WORD_CHOICES_GIVEN)`

화면 반응:

- drawer: 단어 선택 모달/패널 표시
- guesser: "drawer가 단어를 고르는 중" 오버레이 표시

### 6.3 drawing started

drawer 수신:

- `310 DRAWING_STARTED`

guesser 수신:

- `311 TURN_STATE(DRAWING_STARTED)`

화면 반응:

- drawer: canvas 입력 활성화, 툴바 활성화
- guesser: canvas 관전 상태, guess input 활성화
- 공통: 남은 시간 표시

### 6.4 drawing interaction

drawer 입력:

- `201 DRAW_STROKE`
- `202 DRAW_CLEAR`

guesser 입력:

- `204 GUESS_SUBMIT`

화면 반응:

- canvas는 현재 turn의 stroke만 유지
- 정답자가 아닌 사용자의 메시지는 전체 공개
- 정답 처리된 사용자 이후 메시지는 정답자 집합 + drawer에게만 공개
- drawer 메시지도 정답자 집합 + drawer에게만 공개

### 6.5 correct guess

수신 이벤트:

- `404 GUESS_CORRECT`

화면 반응:

- 맞힌 사용자 표시
- guess input 상태 갱신
- `FIRST_CORRECT`면 곧바로 turn 종료 준비

### 6.6 turn ended

수신 이벤트:

- `305 TURN_ENDED`

화면 반응:

- turn 결과 패널
- 이번 turn earnedScores
- 최신 scoreboard
- 최소 3초 유지

중요:

- `TURN_ENDED`는 단순 토스트가 아니라 turn result 상태로 3초간 명확히 보여야 한다.

---

## 7. 다음 turn / 다음 round / 게임 종료

### 7.1 다음 turn

조건:

- 현재 round의 `drawerOrder`에 아직 남은 drawer가 있음

화면 반응:

- `turnCursor + 1`
- 다음 drawer 강조
- 다시 `304 -> 406/311 -> 310/311` 순환

### 7.2 round ended

수신 이벤트:

- `306 ROUND_ENDED`

화면 반응:

- round 종료 상태를 짧게 표시
- 다음 round가 있으면 새 `drawerOrder`로 갱신

### 7.3 game ended

수신 이벤트:

- `307 GAME_ENDED`

화면 반응:

- `Game -> Result`
- ranking 표시
- 결과 화면 8초 유지

### 7.4 result view end

private room 기준:

- result 유지 후 다시 `Lobby`
- 이전 게임의 runtime 상태 제거
- 다음 게임 설정 수정 가능

---

## 8. 중간 입장 흐름

### 8.1 join during running game

수신 이벤트:

- 기존 참여자: `301 ROOM_JOINED`
- joiner: `408 GAME_SNAPSHOT`

화면 반응:

- joiner는 곧바로 `Game` 화면으로 들어온다.
- 현재 turn canvas 전체 stroke를 snapshot으로 받아 즉시 재구성한다.
- joiner는 현재 turn에서 guess 가능하다.
- 단, 현재 round의 drawer rail에는 포함되지 않고 "next round부터 draw"로 표시하는 편이 좋다.

---

## 9. snapshot recovery 흐름

트리거:

- 새로고침
- reconnect
- stale event 의심

클라이언트 입력:

- `106 GAME_SNAPSHOT_REQUEST`

수신 이벤트:

- `408 GAME_SNAPSHOT`

화면 반응:

- 현재 화면을 유지하되 runtime state만 authoritative snapshot으로 치환
- 현재 turn, canvas, scoreboard, participants, host, settings를 전부 다시 맞춘다.

---

## 10. 화면 설계 포인트

화면 구조는 아래처럼 잡는 편이 자연스럽다.

1. 좌측 메인: turn 중심 canvas 영역
2. 상단 또는 좌측 상단: round / turn / timer / drawer
3. 우측 상단: 이번 round의 drawer order rail
4. 우측 중단: participant + scoreboard
5. 우측 하단: guess/chat
6. 전면 오버레이: word choice, reconnect, turn result

핵심은 "방 화면"보다 "현재 turn 상태"가 화면의 주인이어야 한다는 점이다.
