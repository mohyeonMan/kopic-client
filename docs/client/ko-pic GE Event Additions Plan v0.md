# ko-pic GE Event Additions Plan v0

## 1. 목적

이 문서는 `../kopic-ge-k3s` 기준으로 `kopic-client`에 추가 적용해야 하는 GE 이벤트 번호를 정리한다.

이번 패스의 목표는 아래 2가지다.

- 이미 들어와 있는 처리 경로는 건드리지 않는다.
- GE에서 실제로 추가 송신하는 이벤트 번호만 별도로 수용한다.

---

## 2. 변경 범위

### 이번 패스에 포함

- GE outbound 추가 이벤트 `200`, `202`, `203`, `205`, `206`, `207`, `208`
- 위 이벤트를 `kopic-client` 상태 모델에 반영하는 decoder / reducer / handler 추가
- protocol panel에 표시할 `serverEventMeta` 추가

### 이번 패스에서 제외

- 이미 동작 중인 기존 처리 경로 정리/삭제
- 기존 요청 이벤트 번호 재정렬
- `408` snapshot payload 구조를 GE `snap.game` 형태에 맞게 전면 재작성하는 작업
- legacy 이벤트(`303`, `304`, `305`, `306`, `307`, `308`, `310`, `402`, `406`) 제거

즉, 이번 변경은 "기존 코드 수정"보다 "GE 추가 코드 수용"에만 집중한다.

---

## 3. 유지할 기존 처리

현재 client 쪽에서 그대로 유지할 대상:

- `408` snapshot 진입 경로
- `301` room joined
- `302` room left
- `107` settings update
- `201` canvas stroke / clear marker
- `204` chat
- `1999` error

위 항목은 이번 패스에서 동작을 바꾸지 않는다.

또한 아래 legacy 수신 코드는 삭제하지 않고 그대로 둔다.

- `307`
- `308`
- `310`
- `402`

GE 추가 이벤트는 이들과 병행해서 붙인다.

---

## 4. 추가 적용 이벤트 목록

| Code | GE 의미 | GE payload |
| --- | --- | --- |
| `200` | 게임 시작 알림 | `{ gid }` |
| `202` | 라운드 시작 | `{ gid, round, roundId, drawerSids }` |
| `203` | 단어 선택 오픈 | drawer: `{ sid, wordChoiceSec, words }`, others: `{ sid, wordChoiceSec }` |
| `205` | 턴 결과 | `{ gid, turn, reason, answer?, earnedPoints? }` |
| `206` | 게임 결과 화면 시작 | `{ gid, resultSec, totalPoints? }` |
| `207` | 로비 복귀 / 퀵 재시작 안내 | `{ gid, reason, restartSec? }` |
| `208` | 드로잉 시작 | drawer: `{ gid, drawSec, drawerSid, answer }`, others: `{ gid, drawSec, drawerSid, answerLength }` |

### 진행 체크리스트

- [x] `200 GAME_STARTED`
- [x] `202 ROUND_STARTED`
- [x] `203 WORD_CHOICE_OPEN`
- [x] `208 DRAWING_STARTED`
- [x] `205 TURN_ENDED`
- [x] `206 GAME_RESULT`
- [x] `207 RETURN_TO_LOBBY`

---

## 5. 이벤트별 적용 방식

### `200 GAME_STARTED`

처리 원칙:

- `roomState`를 `RUNNING`으로 전환한다.
- `gameId`를 `gid`로 갱신한다.
- `currentRound`, `currentTurn`은 여기서 강제로 만들지 않는다.

이유:

- GE `200` payload는 `{ gid }`만 주므로 라운드/턴 정보를 위조하면 이후 `202`, `203`, `208`과 충돌할 수 있다.
- 현재 UI는 `RUNNING` + `currentTurn === null` 상태를 견딜 수 있다.

권장 상태 반영:

- `room.roomState = 'RUNNING'`
- `room.gameId = gid`
- `room.chat`에 system message 1건 추가

### `202 ROUND_STARTED`

처리 원칙:

- `currentRound`를 생성한다.
- `currentTurn`은 비워둔다.

권장 상태 반영:

- `roundNo = payload.round`
- `totalRounds = state.room.settings.roundCount`
- `turnCursor = 0`
- `drawerOrder = payload.drawerSids`
- `currentTurn = null`

비고:

- GE payload에 `totalRounds`가 없으므로 현재 로컬 settings 값을 사용한다.

### `203 WORD_CHOICE_OPEN`

처리 원칙:

- `currentTurn.phase = 'WORD_CHOICE'`
- drawer에게만 `wordChoices`를 채운다.
- guesser는 `wordChoices = []`로 둔다.

권장 상태 반영:

- `drawerSessionId = payload.sid`
- `remainingSec = payload.wordChoiceSec`
- `selectedWord = null`
- `wordChoices = payload.words ?? []`
- `canvasStrokes`는 기존 turn이 있으면 유지, 없으면 `[]`

로컬 파생 규칙:

- `turnNo`는 `currentRound.turnCursor + 1`을 기본값으로 사용한다.
- `turnId`는 GE live payload에 없으므로 `ge:${gameId}:r${roundNo}:t${turnNo}` 형태의 synthetic id를 허용한다.
- 직전 `currentTurn.phase`가 `TURN_END`였다면, 새 `203` word choice를 적용하기 전에 `currentRound.turnCursor`를 1 증가시킨다.

### `208 DRAWING_STARTED`

처리 원칙:

- `currentTurn.phase = 'DRAWING'`
- drawer payload의 `answer`는 정답 문자열로 저장한다.
- guesser payload의 `answerLength`는 길이 정보만 보존한다.

권장 상태 반영:

- `drawerSessionId = payload.drawerSid`
- `remainingSec = payload.drawSec`
- `wordChoices`는 직전 turn 값 유지
- `selectedWord = payload.answer ?? currentTurn.selectedWord ?? null`
- `canvasStrokes = []`

추가 모델 보강 권장:

- `TurnSummary`에 `answerLength?: number` 필드를 추가한다.
- guesser는 `selectedWord` 대신 `answerLength`를 사용해 마스킹 UI를 유지한다.

이유:

- GE는 guesser에게 실제 정답을 주지 않는다.
- 현재 client는 `selectedWord` 기반이라 길이만 받은 경우 정보가 손실된다.

### `205 TURN_ENDED`

처리 원칙:

- `currentTurn.phase = 'TURN_END'`
- `answer`가 있으면 turn에 저장한다.
- `earnedPoints`가 있으면 참가자 점수를 누적 반영한다.
- `correctSessionIds`는 `earnedPoints`의 key 목록으로 갱신한다.

권장 상태 반영:

- `remainingSec = 0`
- `turnId = payload.turn`
- `selectedWord = payload.answer ?? currentTurn.selectedWord`
- `correctSessionIds = Object.keys(payload.earnedPoints ?? {})`
- `participants[].score += earnedPoints[sessionId]`
- `chat`에 `reason` 포함 system message 추가

주의:

- 여기서는 누적 합산만 한다.
- 최종 authoritative total score는 `206.totalPoints`가 오면 overwrite 한다.

### `206 GAME_RESULT`

처리 원칙:

- `roomState = 'RESULT'`
- `totalPoints`가 있으면 참가자 점수를 최종값으로 덮어쓴다.
- `currentTurn`은 결과 화면에서 필요 없으므로 `null` 처리 가능하다.

권장 상태 반영:

- `participants[].score = totalPoints[sessionId] ?? participants[].score`
- `room.roomState = 'RESULT'`
- `room.currentTurn = null`
- `chat`에 `resultSec` 포함 system message 추가

### `207 RETURN_TO_LOBBY`

처리 원칙:

- 게임 상태를 로비 상태로 되돌린다.
- quick restart 카운트다운 UI는 이번 패스에서 만들지 않는다.

권장 상태 반영:

- `roomState = 'LOBBY'`
- `gameId = null`
- `currentRound = null`
- `currentTurn = null`
- `lobbyCanvasStrokes = []`
- `chat`에 `reason`과 `restartSec`를 담은 system message 추가

---

## 6. 파일별 수정안

### `src/ws/protocol/events.ts`

수정 내용:

- `serverEventMeta`에 GE 추가 이벤트를 append 한다.

권장 이름:

- `200 GE_GAME_STARTED`
- `202 GE_ROUND_STARTED`
- `203 GE_WORD_CHOICE_OPEN`
- `205 GE_TURN_ENDED`
- `206 GE_GAME_RESULT`
- `207 GE_RETURN_TO_LOBBY`
- `208 GE_DRAWING_STARTED`

이름을 GE prefix로 두는 이유:

- 기존 legacy `303/310/307`과 의미가 겹친다.
- protocol panel에서 출처를 구분하기 쉽다.

### `src/app/store/appStateContextValue.ts`

수정 내용:

- GE live event 전용 payload type 추가
- 기존 `ServerGameStartedPayload`, `ServerWordChoicePayload`는 유지

권장 타입:

- `GeGameStartedPayload`
- `GeRoundStartedPayload`
- `GeDrawingStartedPayload`
- `GeWordChoiceOpenedPayload`
- `GeTurnEndedPayload`
- `GeGameResultPayload`
- `GeReturnToLobbyPayload`

비고:

- public `server` API는 굳이 늘리지 않아도 된다.
- 내부 reducer action만 추가하는 쪽이 영향 범위가 작다.

### `src/app/store/AppStateContext.tsx`

수정 내용:

- GE 전용 decoder 추가
- GE 전용 reducer action 추가
- `handleServerEnvelope`에 `200`, `202`, `203`, `205`, `206`, `207`, `208` case 추가

권장 helper:

- `decodeGeGameStartedPayload`
- `decodeGeRoundStartedPayload`
- `decodeGeWordChoiceOpenedPayload`
- `decodeGeDrawingStartedPayload`
- `decodeGeTurnEndedPayload`
- `decodeGeGameResultPayload`
- `decodeGeReturnToLobbyPayload`
- `applyEarnedPointsToParticipants`
- `applyTotalPointsToParticipants`

권장 reducer action:

- `server/geGameStartedApplied`
- `server/geRoundStartedApplied`
- `server/geWordChoiceOpenedApplied`
- `server/geDrawingStartedApplied`
- `server/geTurnEndedApplied`
- `server/geGameResultApplied`
- `server/geReturnToLobbyApplied`

핵심 원칙:

- 기존 `case 300/408/301/302/107/1999/204/201`은 그대로 둔다.
- 기존 `case 307/310/402/308`도 제거하지 않는다.
- GE 케이스를 별도 추가해서 병행 지원한다.

### `src/app/store/mockAppState.ts`

수정 권장:

- `TurnSummary`에 `answerLength?: number` 추가

이유:

- GE `208` drawing start의 guesser payload는 `answerLength`만 제공한다.
- 현재 모델은 `selectedWord`만 있어 길이 기반 마스킹을 자연스럽게 유지하기 어렵다.

### `src/pages/game/GamePage.tsx`

필요 시 최소 수정:

- `selectedWord`가 없어도 `answerLength`가 있으면 마스킹 단어 길이를 렌더링

이번 패스에서 권장하는 최소 변경:

- `getMaskedWord()` 또는 banner 계산부에서 `answerLength` fallback 추가

---

## 7. 구현 순서

- [ ] `events.ts`에 GE 추가 수신 코드 등록
- [ ] `AppStateContext.tsx`에 GE decoder 추가
- [ ] reducer action 추가
- [ ] `handleServerEnvelope`에 신규 case 연결
- [ ] `TurnSummary.answerLength` 보강
- [ ] `GamePage.tsx` 마스킹 fallback 최소 수정

---

## 8. 주의할 점

### 1. `203`과 `208`은 역할이 분리됐다

- `203`은 단어 선택 오픈 전용이다.
- `208`은 드로잉 시작 전용이다.

기존에 `203` 단일 분기로 가정한 코드는 모두 수정해야 한다.

### 2. GE live payload는 turn metadata가 얇다

- `203`, `208`에 `turnId`, `turnNo`, `roundNo`가 모두 충분히 들어오지 않는다.
- 로컬에서 `currentRound.turnCursor` 기반 파생이 필요하다.

### 3. `205`는 delta, `206`은 total이다

- `205.earnedPoints`는 turn 단위 증분
- `206.totalPoints`는 게임 종료 시 최종 누적값

둘을 같은 방식으로 처리하면 점수가 두 번 반영될 수 있다.

### 4. 이번 패스는 request code 정렬을 하지 않는다

현재 client outbound와 GE inbound의 번호 차이:

- game start: client `105`, GE `200`
- word choice: client `205`, GE `203`

이 항목은 별도 follow-up으로 다루는 것이 안전하다.

---

## 9. 결론

이번 패스는 기존에 이미 붙어 있는 처리 경로를 건드리지 않고, GE에서 추가로 실제 송신하는 `200`, `202`, `203`, `205`, `206`, `207`, `208`만 client에 병행 수용하는 작업이다.

가장 중요한 포인트는 아래 3가지다.

- `203`은 단어 선택, `208`은 드로잉 시작으로 분리 처리할 것
- `205`는 점수 delta, `206`은 점수 total로 분리 적용할 것
- legacy 코드 제거 없이 GE 추가 코드만 붙일 것
