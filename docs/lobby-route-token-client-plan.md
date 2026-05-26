# Lobby routeToken client 전환 계획

## 1. 목표

`kopic-client`의 입장 흐름을 기존 WS query parameter 직접 전달 방식에서 Lobby route API 기반 `routeToken` 방식으로 전환한다.

현재 WS는 `routeToken`만 검증해 `action`, `nickname`, `geId`, 선택적 `roomCode`를 복원하도록 변경되어 있다. 따라서 client는 더 이상 WS URL에 `geId`, `nickname`, `action`, `roomCode`를 직접 싣지 않는다.

```text
Client
  -> Lobby: route 요청
  <- Lobby: { routeToken }
Client
  -> WS: /ws?routeToken={routeToken}
WS
  -> token 검증 후 GE로 초기 join/create 이벤트 전달
```

## 2. 현재 client 상태

관련 파일:

- `src/pages/entry/EntryPage.tsx`
- `src/app/store/lib/appStateActions.ts`
- `src/app/store/lib/appStateSession.ts`
- `src/app/router/useAppRouter.ts`
- `src/features/game-session/api/wsSessionManager.ts`
- `src/features/game-session/model/useWsSessionSubscription.ts`

현재 흐름:

1. Entry 화면에서 `actions.requestJoin({ action, roomCode? })` 호출
2. session state에 `joinPending`, `joinAction`, `joinRoomCode` 저장
3. `useAppRouter`가 `joinPending || joinAccepted` 상태를 보고 `wsSessionManager.acquire(...)` 호출
4. `wsSessionManager.resolveWsUrl()`이 WS URL에 아래 query를 직접 추가
   - `geId`
   - `nickname`
   - `action`
   - `roomCode`
   - 기존 auth 용도로 보이는 `token`

이 방식은 routeToken 기반 WS와 호환되지 않는다.

## 3. 확정된 계약

Lobby route API:

```http
POST /routes/quick
{ "nickname": "pobi" }
```

```http
POST /routes/private
{ "nickname": "pobi" }
```

```http
POST /routes/private/join
{ "nickname": "pobi", "roomCode": "ABCDEF" }
```

성공 응답:

```json
{ "routeToken": "..." }
```

실패 응답:

```json
{ "reason": "...", "message": "..." }
```

WS 연결:

```text
/ws?routeToken={routeToken}
```

routeToken payload의 action 매핑:

- quick join: `action = 0`
- private join: `action = 0`, `roomCode` 포함
- private create: `action = 1`

Client는 routeToken payload를 해석하지 않는다.

## 4. 구현 범위

이번 client 작업에서 구현할 범위:

- Lobby route API 호출 client 추가
- 기존 join 요청 상태를 Lobby route 종류로 매핑
- WS 연결 URL에 `routeToken`만 전달
- route 발급 실패를 기존 `joinError` UI에 연결
- routeToken 발급 성공 후 기존 WS 연결/수신 처리 흐름 유지
- 기존 `GAME_SNAPSHOT` 수신 후 game 화면으로 이동하는 흐름 유지
- `VITE_GE_ID` 기반 client-side GE 지정 제거
- Lobby route 발급, WS 연결, 초기 join 성공 응답 수신까지를 하나의 join attempt로 보고 retry 처리

이번 작업에서 구현하지 않을 범위:

- routeToken payload client-side decode
- JWT 검증
- GE 선택 로직
- room 상태 조회 UI
- 새로운 Lobby 화면
- invite link 형식 변경
- 문서에 정의된 범위를 넘는 추가 retry/backoff 정책
- 과한 상태 구조 리팩토링

## 5. 권장 구현 구조

### 5.1 Lobby route client 추가

새 파일:

- `src/features/game-session/api/lobbyRouteClient.ts`

책임:

- route 종류에 맞는 Lobby endpoint 선택
- HTTP POST 요청 수행
- 성공 시 `routeToken` 반환
- 실패 시 `{ reason, message }` 형태로 정규화

예상 타입:

```ts
type LobbyRouteKind = 'quick' | 'private-create' | 'private-join'

type LobbyRouteRequest = {
  kind: LobbyRouteKind
  nickname: string
  roomCode?: string
}

type LobbyRouteSuccess = {
  routeToken: string
}

type LobbyRouteFailure = {
  reason: string
  message: string
}
```

환경 변수:

- `VITE_LOBBY_URL`: 명시된 경우 absolute Lobby base URL로 사용
- `VITE_LOBBY_PATH`: 없으면 `${BASE_URL}/routes` 또는 `/routes`를 기본값으로 사용

기본값은 같은 origin 배포를 우선한다.

```text
dev 명시 설정: VITE_LOBBY_URL=http://localhost:8081/routes
prod 기본:     {origin}{BASE_URL}/routes
```

### 5.2 route 종류 매핑

현재 state는 `joinAction?: 0 | 1`, `joinRoomCode?: string`를 갖고 있다. MVP에서는 이 구조를 유지하고 Lobby API 호출 직전에만 route 종류로 변환한다.

```text
joinAction === 1
  -> POST /routes/private

joinAction !== 1 && joinRoomCode 있음
  -> POST /routes/private/join

joinAction !== 1 && joinRoomCode 없음
  -> POST /routes/quick
```

추후 정리할 수 있으면 `joinAction` 대신 `joinKind`로 바꾼다. 다만 첫 전환에서는 변경 범위를 줄이기 위해 기존 상태 이름을 유지한다.

### 5.3 wsSessionManager 변경

추천 변경:

- `wsSessionManager.acquire(owner, nickname, roomCode, action)` 시그니처는 우선 유지
- 내부 `connectIfNeeded()`에서 WS를 열기 직전에 Lobby route API를 호출
- route 발급 성공 시 `new WebSocket(resolveWsUrl(routeToken))`
- `resolveWsUrl()`은 아래 query만 붙임
  - `routeToken`
- 기존 `geId`, `nickname`, `action`, `roomCode` query 추가 제거
- `VITE_GE_ID` 관련 코드 제거

이 구조의 장점:

- 기존 `useAppRouter`와 entry state 흐름을 크게 바꾸지 않는다.
- 기존 reconnect 흐름이 새 연결 시도마다 새 routeToken을 받을 수 있다.
- 만료된 routeToken 재사용을 피한다.

주의할 점:

- `connectIfNeeded()`가 async 흐름을 갖게 되므로 중복 호출 방지가 필요하다.
- `owners.size === 0`이 되거나 query 값이 바뀐 경우, 진행 중인 route 요청 결과를 폐기해야 한다.
- `AbortController` 또는 monotonically increasing request id를 사용해 stale route 응답을 무시한다.

### 5.4 에러 처리

Lobby route 실패:

- HTTP 503 등 실패 응답 body에서 `reason`, `message`를 읽는다.
- 읽을 수 없으면 기본값을 사용한다.

```ts
{
  reason: 'ROUTE_REQUEST_FAILED',
  message: '입장 경로를 발급받을 수 없습니다.'
}
```

연결 실패:

- route 발급 전 실패는 `joinFailed`로 처리하는 편이 사용자 경험상 자연스럽다.
- WS handshake 실패 또는 socket 연결 실패는 기존 `connectionErrorReported` 흐름을 유지한다.

현재 `useWsSessionSubscription`은 `wsSessionManager`의 `error` event를 `connectionError`로만 dispatch한다. route 발급 실패를 `joinError`로 보여주려면 둘 중 하나가 필요하다.

1. `SessionEvent`에 `joinError` 타입 추가
2. `error` payload에 별도 marker를 두고 subscription에서 `local/joinFailed`로 dispatch

권장안은 `SessionEvent`에 명시적인 타입을 추가하는 것이다.

```ts
type SessionEvent =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'message'; data: string }
  | { type: 'error'; error: unknown }
  | { type: 'join-error'; error: { reason: string; message: string } }
```

### 5.5 join attempt retry와 routeToken TTL

routeToken TTL은 짧다. 따라서 routeToken을 state나 localStorage에 저장하지 않는다.

규칙:

- 하나의 join attempt는 Lobby route 발급, WS 연결, 초기 join 성공 응답 수신까지로 본다.
- WS 연결 요청 후 3초 안에 GE join 성공 응답을 받지 못하면 해당 attempt는 실패로 본다.
- 초기 join 성공 응답은 `304 GAME_SNAPSHOT`으로 통일한다.
- 실패하면 기존 routeToken을 재사용하지 않고 Lobby route 요청부터 다시 시작한다.
- retry는 1초 간격으로 최대 3회 수행한다.
- 3회 모두 실패하면 마지막 실패 사유를 사용자에게 표시한다.
- `joinAccepted` 이후에는 join용 연결 파라미터를 지운다.
- 이미 열린 WS 연결은 token 만료와 무관하게 유지한다.

기존 `wsSessionManager`의 reconnect는 socket 단절 중심으로 동작한다. routeToken 전환 후에는 join 단계에서는 위 join attempt retry 규칙이 우선이며, join 성공 이후의 세션 단절은 기존 connection error 흐름을 유지한다.

## 6. 단계별 구현 순서

### 1단계: Lobby route API client 추가

작업:

- `lobbyRouteClient.ts` 생성
- base URL/path resolver 작성
- `requestLobbyRoute()` 구현
- 실패 body 정규화 함수 작성

확인:

- unit test 또는 최소 typecheck
- 잘못된 JSON 응답도 기본 에러로 변환되는지 확인

### 2단계: wsSessionManager에 routeToken 연결 적용

작업:

- `resolveWsUrl(routeToken: string)` 형태로 변경
- `geId`, `nickname`, `action`, `roomCode` query 제거
- `VITE_GE_ID` 제거
- `connectIfNeeded()`에서 Lobby route 발급 후 WebSocket 생성
- route 요청 중복/stale 방지 처리

확인:

- quick/private/private join에 대해 올바른 Lobby endpoint를 호출하는지 확인
- WS URL에 `routeToken`만 들어가는지 확인

### 3단계: join error 흐름 연결

작업:

- `SessionEvent`에 `join-error` 추가
- `useWsSessionSubscription`에서 `local/joinFailed` dispatch
- route 발급 실패 시 `joinPending=false`로 돌아오는지 확인
- 초기 join timeout이나 retry 초과가 `joinFailed`로 이어지도록 연결

확인:

- Entry 화면의 기존 `joinError` modal에 Lobby 실패 메시지가 보이는지 확인

### 4단계: join attempt retry 구현

작업:

- route 발급, WS open, 초기 join 성공 응답 수신을 하나의 attempt로 묶는다.
- WS 연결 요청 후 3초 timeout을 둔다.
- timeout, route 발급 실패, handshake 실패, 초기 join reject를 attempt 실패로 처리한다.
- 실패 시 1초 후 Lobby route 요청부터 다시 시작한다.
- 최대 3회 실패하면 마지막 실패 사유를 `joinError`로 표시한다.
- retry 중 매번 새 routeToken을 발급받는다.

확인:

- routeToken이 retry 간 재사용되지 않는지 확인
- 3초 안에 `304 GAME_SNAPSHOT` 수신 시 retry timer가 정리되는지 확인
- 3회 실패 후 마지막 실패 사유가 Entry 화면에 표시되는지 확인

### 5단계: 환경 변수 및 문서 정리

작업:

- README 또는 배포 env에 `VITE_LOBBY_URL` / `VITE_LOBBY_PATH` 정리
- 더 이상 필요한 client env가 아니라면 `VITE_GE_ID` 제거

확인:

- local dev에서 Lobby/WS endpoint가 서로 맞는지 확인
- prod ingress path 기준으로 same-origin path가 맞는지 확인

### 6단계: 검증

명령:

```bash
npm run typecheck
npm run lint
npm run build
```

수동 확인:

- 빠른 입장
- 방 만들기
- 방 코드 입장
- 잘못된 방 코드
- Lobby route 실패
- WS handshake 실패
- 초기 join timeout 후 retry
- retry 3회 초과 후 실패 표시
- 초대 링크로 진입 후 방 코드 modal 자동 표시

## 7. 예상 변경 파일

생성:

- `src/features/game-session/api/lobbyRouteClient.ts`

수정:

- `src/features/game-session/api/wsSessionManager.ts`
- `src/features/game-session/model/useWsSessionSubscription.ts`
- `src/app/store/lib/appStateReducer.ts`
- 필요 시 `src/app/store/lib/appStateSession.ts`
- 필요 시 `src/app/store/appStateContextValue.ts`
- 필요 시 `README.md`

가능하면 UI 파일인 `EntryPage.tsx`는 최소 수정으로 둔다.

## 8. 검토 포인트

- Client가 routeToken을 decode하지 않는가
- WS URL에 `geId`, `nickname`, `action`, `roomCode`가 남아 있지 않은가
- routeToken을 localStorage/sessionStorage에 저장하지 않는가
- reconnect 시 기존 routeToken을 재사용하지 않는가
- 초기 join 성공 응답을 3초 안에 받지 못하면 Lobby route부터 재시도하는가
- retry는 1초 간격, 최대 3회로 제한되는가
- Lobby 실패가 `joinError`로 표시되는가
- WS 연결 실패가 기존 `connectionError`로 표시되는가
- 기존 game event 송수신 코드를 건드리지 않았는가

## 9. 보류 항목

아래는 routeToken 전환 후 별도 판단한다.

- `joinAction` 이름을 `joinKind`로 변경하는 리팩토링
- Lobby 상태/공지 UI
- 방 목록 또는 관전 기능
- token payload 기반 client 표시 기능
