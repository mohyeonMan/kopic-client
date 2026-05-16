# src_legacy -> src 구조 이전 매뉴얼

이 문서는 `src_legacy`를 원본 구현으로 삼아, 기능과 디자인을 하나도 바꾸지 않고 새 `src` 구조로 이전하기 위한 작업 매뉴얼이다.

전제는 다음과 같다.

- `src`는 아직 없다고 가정한다.
- `src_legacy`가 유일한 동작 기준이다.
- 목표는 리디자인, UX 개선, 로직 개선이 아니라 구조 이전이다.
- 기능 parity와 디자인 parity가 구조 개선보다 우선한다.
- 작업자는 사람일 수도 있고 다른 AI일 수도 있다. 따라서 모든 변경은 작은 단위로 검증 가능해야 한다.

## 최우선 원칙

1. 동작을 바꾸지 않는다.
2. 화면을 바꾸지 않는다.
3. 서버 프로토콜을 바꾸지 않는다.
4. CSS class name, DOM depth, aria, focus, scroll, animation 타이밍을 임의로 바꾸지 않는다.
5. 한 번에 구조와 동작을 같이 바꾸지 않는다.
6. 먼저 그대로 옮기고, 그 다음 파일 위치와 책임만 나눈다.
7. 각 단계는 `npm run lint`, `npm run typecheck`, `npm run build`가 통과해야 한다.
8. 실제 WebSocket 서버가 필요한 흐름은 문서화된 수동 QA 체크리스트로 확인한다.

## 금지사항

다음은 구조 이전 중 하지 않는다.

- 버튼 문구 변경
- CSS 색상, spacing, radius, shadow 변경
- class name 변경
- markup 계층 변경
- 이벤트 코드 변경
- WebSocket query parameter 이름 변경
- 서버 payload key를 임의로 단순화
- legacy fallback 제거
- mock fallback 제거
- reducer 동작을 Zustand/React hook으로 재해석하면서 동시에 파일 이동
- 공통화 명목으로 서로 다른 feature의 상태를 하나로 합치기
- `src_legacy`를 수정해서 parity를 맞추기

## 기준 문서

작업 전 반드시 다음 문서를 읽고, 체크리스트처럼 사용한다.

- `docs/legacy-behavior/01-입장-참여-흐름.md`
- `docs/legacy-behavior/02-라우팅-세션-생명주기.md`
- `docs/legacy-behavior/03-방-공유-초대-흐름.md`
- `docs/legacy-behavior/04-로비-설정-게임시작.md`
- `docs/legacy-behavior/05-보드-그리기-캔버스.md`
- `docs/legacy-behavior/06-채팅-정답-제출-흐름.md`
- `docs/legacy-behavior/07-참여자-패널-버블.md`
- `docs/legacy-behavior/08-오버레이-라운드-턴-결과.md`
- `docs/legacy-behavior/09-상태정규화-리듀서-흐름.md`
- `docs/legacy-behavior/10-웹소켓-프로토콜-오류복구.md`
- `docs/legacy-behavior/11-API-이벤트-뮤테이션-매트릭스.md`
- `docs/legacy-behavior/12-인터랙션-액션-모션-명세.md`

이 문서들이 맞고 코드가 다르면, 먼저 `src_legacy` 코드가 실제로 어떤지 확인한다. 최종 기준은 실행 중인 `src_legacy` 동작이다.

## 권장 목표 구조

새 `src`는 다음 계층으로 구성한다.

```text
src/
  main.tsx
  App.tsx
  index.css
  app/
    AppShell.tsx
    layout/
    providers/
    router/
  pages/
    entry/
    game/
  features/
    entry-join/
      model/
      ui/
    game-session/
      api/
      model/
      ui/
    room-invite/
      model/
      ui/
    room-lobby/
      model/
      ui/
    game-board/
      model/
      ui/
    drawing-canvas/
      model/
      ui/
    game-chat/
      model/
      ui/
    participants/
      model/
      ui/
    game-progress/
      model/
      ui/
  entities/
    session/
      model/
    game/
      api/
      model/
  shared/
    api/
      ws/
```

각 계층의 책임은 다음과 같다.

| 계층 | 책임 | 금지 |
| --- | --- | --- |
| `app` | provider, shell, router, layout 조립 | feature 내부 로직 |
| `pages` | route 단위 feature 조립 | WebSocket protocol 처리 |
| `features` | 사용자 유스케이스 단위 UI/model/api | 전역 domain type 재정의 |
| `entities` | session/game domain state, normalizer, type | page UI 의존 |
| `shared` | domain 독립 인프라 | game/session 의미 해석 |

## 이전 방식 요약

가장 안전한 방법은 두 단계다.

1. `src_legacy`를 `src`에 거의 그대로 복제해서 동작 기준을 맞춘다.
2. 동작이 같은 상태에서 파일을 기능 단위로 이동하고, import만 정리한다.

처음부터 새 구조로 재작성하지 않는다. 재작성은 거의 항상 작은 UX 차이와 protocol 누락을 만든다.

## Phase 0. 기준선 고정

작업자는 먼저 현재 legacy 기준을 고정한다.

1. 현재 브랜치와 커밋을 기록한다.
2. `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
3. legacy 앱을 실행해서 주요 화면 스크린샷을 남긴다.
4. 빠른 입장, 방 만들기, 방 참여를 실제 서버로 확인한다.
5. 모바일 viewport와 desktop viewport를 모두 캡처한다.

기록할 최소 viewport:

- desktop: `1440x900`
- tablet: `1024x768`
- mobile: `390x844`
- narrow mobile: `360x740`

기록할 최소 상태:

- entry 초기 화면
- entry 닉네임 입력 focus
- 방 참여 모달
- 입장 실패 모달
- 연결 실패 모달
- lobby
- lobby 설정 overlay
- game running, word choice
- game running, drawing
- turn end overlay
- result overlay
- mobile chat active
- mobile participants active
- chat composer focused

## Phase 1. src 초기 생성

`src`가 없다는 가정에서 시작한다.

첫 단계에서는 구조 분리를 하지 말고 legacy를 그대로 옮긴다.

```text
src/
  main.tsx
  App.tsx
  index.css
  app/
  entities/
  features/
  pages/
  ws/
```

처음 복제 시에는 `src_legacy`의 구조를 최대한 유지한다.

예시:

```text
src_legacy/app/store/AppStateContext.tsx
-> src/app/store/AppStateContext.tsx

src_legacy/pages/game/GamePage.tsx
-> src/pages/game/GamePage.tsx

src_legacy/ws/client/wsSessionManager.ts
-> src/ws/client/wsSessionManager.ts
```

이 단계의 목표는 `src_legacy`와 `src`가 같은 구조여도 상관없다. 중요한 것은 앱이 `src` entrypoint로 실행되고 같은 화면을 보여주는 것이다.

완료 조건:

- `src/main.tsx`가 앱 entrypoint다.
- `src_legacy` import가 `src`에서 사라진다.
- 빌드가 통과한다.
- legacy와 첫 화면이 동일하다.

## Phase 2. 공통 타입과 초기 상태 분리

legacy 기준 파일:

- `src_legacy/entities/game/model/types.ts`
- `src_legacy/entities/game/model/state.ts`
- `src_legacy/entities/game/model/index.ts`

목표 위치:

```text
src/entities/game/model/gameTypes.ts
src/entities/game/model/gameDefaults.ts
src/entities/session/model/sessionTypes.ts
```

주의사항:

- type 이름을 바꾸지 않는 것이 우선이다.
- 이름을 바꿔야 한다면 type alias를 먼저 만들어 migration 범위를 줄인다.
- `initialAppState`를 한 번에 쪼개지 않는다.
- 먼저 `session`, `room`, `connectionStatus`의 shape를 문서화한다.

작업 순서:

1. legacy type을 그대로 복사한다.
2. `SessionState`, `RoomSnapshot`, `GameSettings`, `Participant`, `ChatMessage`, `CanvasStroke`를 분리한다.
3. default 값은 legacy의 `initialAppState`와 동일하게 둔다.
4. default room code, mock chat, mock session id처럼 개발용 기본값이 있다면 제거하지 말고 목적을 기록한다.

완료 조건:

- type 분리 후 동작 변화가 없다.
- reducer/state 사용처가 compile된다.
- runtime에서 room/chat/participant 기본값이 legacy와 동일하다.

## Phase 3. WebSocket transport와 protocol 분리

legacy 기준 파일:

- `src_legacy/ws/client/wsSessionManager.ts`
- `src_legacy/ws/protocol/events.ts`
- `src_legacy/ws/protocol/outgoingLogger.ts`
- `src_legacy/app/store/lib/appStateWsAdapter.ts`
- `src_legacy/app/store/lib/appStatePayloadDecoders.ts`

목표 위치:

```text
src/shared/api/ws/wsTransport.ts
src/features/game-session/api/gameSessionApi.ts
src/features/game-session/model/gameSessionTypes.ts
src/entities/game/api/*
```

가장 중요한 규칙:

- 서버 이벤트 번호를 바꾸지 않는다.
- client event 번호를 바꾸지 않는다.
- `roomCode`, `action`, `geId`, `nickname`, `token` query parameter를 바꾸지 않는다.
- heartbeat `{"e":1}`와 pong `e=2` 처리를 유지한다.
- open 전 close와 open 후 close의 오류 분류를 유지한다.

서버 수신 이벤트 최소 목록:

| 코드 | 의미 | 처리 |
| --- | --- | --- |
| `2` | pong | 상위 상태로 전달하지 않음 |
| `1999` | join failed | join error, room clear |
| `300` | join accepted / snapshot | join accepted + snapshot apply |
| `408` | game snapshot | join accepted + snapshot apply |
| `301` | participant joined | participant add/update + system chat |
| `302` | participant left | participant remove + host change |
| `107`, `308` | settings/snapshot류 | settings 또는 snapshot apply |
| `200` | game started | game state update |
| `202` | round started | round update |
| `203` | word choice opened/selected | overlay/update |
| `204`, `403` | chat | chat append |
| `201`, `402` | canvas stroke/clear | canvas update |
| `205` | turn ended | turn end state |
| `206` | game result | result state |
| `207` | return to lobby | lobby reset |
| `208` | drawing started | drawing state |
| `209` | turn started | turn state |
| `210` | guess correct | correct state + alert |
| `211` | hint revealed | hint update |

주의할 함정:

- `300/408`은 snapshot 정규화 성공 후에만 화면 이동하는 것이 아니라, legacy에서는 입장 성공 처리와 강하게 연결되어 있다.
- snapshot payload에 `snap` wrapper가 있을 수 있다.
- session id key는 `sid`, `sessionId`, `mySid`, `mySessionId` 변형이 있다.
- participant key는 `sid`, `sessionId`, `userId` 변형이 있다.
- nickname key는 `n`, `nickname` 변형이 있다.
- color key는 `ci`, `colorIndex`, `color`, `c` 변형이 있다.
- room code가 payload 바깥이나 `room` 안에 있을 수 있다.
- 일부 snapshot은 `roomCode`가 비어 있을 수 있으므로 request의 roomCode fallback을 고려한다.

완료 조건:

- 빠른 입장 성공 시 `/game`으로 이동한다.
- 방 만들기 성공 시 `/game`으로 이동한다.
- 방 참여 성공 시 `/game`으로 이동한다.
- `1999` 수신 시 입장 실패 모달이 뜬다.
- 서버 연결 실패 시 연결 실패 모달이 뜬다.
- open 전 실패는 최대 3회 재시도한다.
- open 후 close는 세션 끊김으로 처리한다.

## Phase 4. app shell과 router 이전

legacy 기준 파일:

- `src_legacy/app/AppShell.tsx`
- `src_legacy/app/router/AppRouter.tsx`
- `src_legacy/app/router/routes.ts`
- `src_legacy/app/router/useAppRouter.ts`
- `src_legacy/app/ui/AppLayout.tsx`
- `src_legacy/app/ui/AppLayout.css`

목표 위치:

```text
src/app/AppShell.tsx
src/app/router/*
src/app/layout/*
```

반드시 유지할 동작:

- `/`는 entry page다.
- `/game`은 joined 상태일 때만 접근 가능하다.
- `/{roomCode}` invite path를 읽는다.
- `?roomCode=` invite query를 읽는다.
- `/game` 직접 진입인데 join accepted가 아니면 `/`로 replace한다.
- game route에서 나가면 room cache를 정리한다.
- game route에서 body/html class, gesture/touch 정책이 legacy와 같아야 한다.
- leave button 동작이 legacy와 같아야 한다.
- topbar room code, share button, copy/share UX가 같아야 한다.

라우터 이전 주의사항:

- `pushState`와 `replaceState` 차이를 유지한다.
- `popstate` listener 해제를 유지한다.
- invite route는 route enum에 없더라도 entry page로 해석되어야 한다.
- base path가 있을 때 `BASE_URL`을 고려한다.

완료 조건:

- `/`, `/game`, `/{roomCode}`, `?roomCode=` 모두 legacy와 동일하다.
- 브라우저 뒤로가기/앞으로가기 동작이 동일하다.
- game page 이탈 시 이전 room/chat/canvas 잔상이 남지 않는다.

## Phase 5. entry page와 join feature 분리

legacy 기준 파일:

- `src_legacy/pages/entry/EntryPage.tsx`
- `src_legacy/pages/entry/EntryPage.css`
- `src_legacy/app/store/lib/appStateSession.ts`

목표 위치:

```text
src/pages/entry/EntryPage.tsx
src/features/entry-join/model/*
src/features/entry-join/ui/*
src/entities/session/model/*
```

분리 기준:

- `pages/entry`는 route와 store를 연결한다.
- `features/entry-join/ui`는 form과 modal UI만 가진다.
- `features/entry-join/model`은 nickname/roomCode validation과 submit payload만 만든다.
- `entities/session/model`은 join 상태 shape와 mutation을 가진다.
- WebSocket 연결은 entry feature에 넣지 않는다.

반드시 유지할 UX:

- 닉네임은 10자 제한이다.
- 공백 nickname은 입장 버튼 비활성이다.
- 빠른 입장 클릭 시 `action=0`.
- 방 만들기 클릭 시 `action=1`.
- 방 참여 클릭 시 modal open.
- invite link 진입 시 modal 자동 open.
- 방 코드 입력은 대문자 정규화.
- join pending 중 모든 입장 버튼 비활성.
- pending 중 빠른 입장 버튼 문구는 `입장 중...`.
- join error가 있으면 방 참여 modal을 닫고 error modal을 우선 표시.
- connection error는 join error가 없을 때만 표시.
- error modal은 확인 버튼과 backdrop click으로 닫힌다.

완료 조건:

- legacy entry screenshot과 pixel 차이가 없어야 한다.
- keyboard focus outline이 같다.
- button hover/disabled가 같다.
- invite flow가 같다.

## Phase 6. room invite/share 분리

legacy 기준 파일:

- `src_legacy/app/ui/AppLayout.tsx`
- `src_legacy/app/ui/AppLayout.css`
- `src_legacy/app/router/routes.ts`

목표 위치:

```text
src/features/room-invite/model/*
src/features/room-invite/ui/*
src/app/layout/*
src/app/router/routes.ts
```

유지할 동작:

- room code가 비어 있으면 공유 불가.
- invite URL은 `buildInvitePath(roomCode)` 기준이다.
- clipboard copy fallback을 유지한다.
- Web Share API 지원 시 share를 사용한다.
- 공유 실패/복사 실패 처리가 legacy와 같아야 한다.
- QR 코드가 있으면 렌더링 크기와 표시 조건을 유지한다.

완료 조건:

- room code 복사 성공/실패 UX가 같다.
- invite link 복사 성공/실패 UX가 같다.
- share menu open/close 동작이 같다.

## Phase 7. game page shell 이전

legacy 기준 파일:

- `src_legacy/pages/game/GamePage.tsx`
- `src_legacy/pages/game/GamePage.css`
- `src_legacy/pages/game/gamePageShared.ts`
- `src_legacy/pages/game/hooks/useMobileViewport.ts`
- `src_legacy/pages/game/hooks/useSideSyncHeight.ts`

목표 위치:

```text
src/pages/game/GamePage.tsx
src/pages/game/GamePage.css
src/pages/game/model/*
```

유지할 동작:

- desktop 3-column layout.
- mobile chat/participants panel switcher.
- chat input focus 시 scroll anchor.
- mobile viewport inset 보정.
- side panel height sync.
- game page body/html scroll policy.
- double tap/pinch gesture 방지.

중요:

- 이 단계에서는 feature 내부 컴포넌트를 아직 분해하지 말고 layout shell부터 동일하게 만든다.
- CSS custom property 이름과 값은 유지한다.
- mobile breakpoint를 바꾸지 않는다.

완료 조건:

- desktop layout이 legacy와 같다.
- mobile tab 전환이 legacy와 같다.
- keyboard 등장 후 chat input 위치가 legacy와 같다.

## Phase 8. participant feature 분리

legacy 기준 파일:

- `src_legacy/pages/game/components/ParticipantPanel.tsx`
- `src_legacy/pages/game/components/ParticipantPanel.css`
- `src_legacy/pages/game/components/ParticipantBubbleLayer.tsx`
- `src_legacy/pages/game/components/ParticipantBubbleLayer.css`
- `src_legacy/pages/game/hooks/useParticipantBubbles.ts`
- `src_legacy/pages/game/hooks/useAnimatedParticipants.ts`

목표 위치:

```text
src/features/participants/model/*
src/features/participants/ui/*
```

유지할 동작:

- participant 정렬 순서.
- host 표시.
- score 표시.
- online/offline 표시.
- join/leave animation.
- participant bubble 발생 조건.
- bubble 위치 계산.
- mobile participant panel scroll.
- drawer/correct/highlight 표시.

주의:

- animation class 이름을 바꾸지 않는다.
- `joinOrder` fallback을 바꾸지 않는다.
- host 변경 시 시스템 메시지와 UI 표시가 같이 변해야 한다.

완료 조건:

- 참여자 입장 시 카드 animation이 같다.
- 참여자 퇴장 시 카드 animation이 같다.
- 채팅 bubble 표시 위치와 지속 시간이 같다.

## Phase 9. game chat feature 분리

legacy 기준 파일:

- `src_legacy/pages/game/components/GameChatPanel.tsx`
- `src_legacy/pages/game/components/GameChatPanel.css`
- `src_legacy/pages/game/hooks/useChatAutoScroll.ts`
- `src_legacy/app/store/lib/appStateChat.ts`
- `src_legacy/app/store/lib/appStateHelpers.ts`

목표 위치:

```text
src/features/game-chat/model/*
src/features/game-chat/ui/*
src/entities/game/api/chatMessageNormalizer.ts
```

유지할 동작:

- system message 표시/숨김 정책.
- mine message 표시.
- sealed/privileged message 표시.
- 정답자/출제자 privileged visibility.
- input max length 50.
- IME composing 중 Enter submit 방지.
- submit 시 optimistic local message.
- send 실패 시 fallback behavior.
- scroll-to-bottom button 표시 조건.
- 새 메시지 도착 시 stick-to-bottom 동작.
- mobile touch focus handling.

주의:

- Zustand selector 또는 external store selector 안에서 `filter`, `map`, object literal을 바로 반환하지 않는다.
- React 19에서는 `useSyncExternalStore` snapshot이 매번 새 reference면 무한 루프가 날 수 있다.
- selector는 원본 배열/객체만 가져오고, 파생 배열은 `useMemo`에서 계산한다.

완료 조건:

- 메시지 수, 표시 순서, scroll 동작이 같다.
- 정답 제출이 서버로 `204`를 보낸다.
- 정답자 발생 후 chat visibility가 legacy와 같다.

## Phase 10. game board와 drawing canvas 분리

legacy 기준 파일:

- `src_legacy/pages/game/components/GameBoardPanel.tsx`
- `src_legacy/pages/game/components/GameBoardPanel.css`
- `src_legacy/pages/game/components/board/BoardCanvas.tsx`
- `src_legacy/pages/game/components/board/BoardCanvas.css`
- `src_legacy/pages/game/components/board/BoardToolbar.tsx`
- `src_legacy/pages/game/components/board/BoardToolbar.css`
- `src_legacy/pages/game/hooks/useGameControls.ts`

목표 위치:

```text
src/features/game-board/model/*
src/features/game-board/ui/*
src/features/drawing-canvas/model/*
src/features/drawing-canvas/ui/*
src/entities/game/api/canvasStrokeProtocol.ts
```

유지할 동작:

- tool 목록과 순서.
- color 목록과 순서.
- brush size.
- eraser behavior.
- clear behavior.
- local stroke commit.
- outbound stroke encoding.
- inbound stroke decoding.
- stroke batching.
- canvas resize handling.
- drawing permission.
- lobby canvas와 running turn canvas 분리.
- description bubble 위치.

주의:

- canvas 좌표 정규화 기준을 바꾸지 않는다.
- compact stroke protocol을 바꾸지 않는다.
- clear marker를 바꾸지 않는다.
- pointer event 처리 순서를 바꾸지 않는다.
- rendering optimization은 parity 이후 별도 작업으로 한다.

완료 조건:

- 직접 그린 stroke가 같은 위치/굵기/색으로 보인다.
- 다른 사용자의 stroke가 같은 방식으로 반영된다.
- clear가 즉시 반영된다.
- toolbar enable/disable 조건이 같다.

## Phase 11. lobby/settings/game start 분리

legacy 기준 파일:

- `src_legacy/pages/game/components/board/LobbySettingsOverlay.tsx`
- `src_legacy/pages/game/components/board/LobbySettingsOverlay.css`
- `src_legacy/app/store/lib/appStateGame.ts`
- `src_legacy/app/store/lib/appStateFlow.ts`
- `src_legacy/app/store/lib/appStateSnapshot.ts`

목표 위치:

```text
src/features/room-lobby/model/*
src/features/room-lobby/ui/*
src/entities/game/api/gameSettingsProtocol.ts
```

유지할 동작:

- host만 설정 변경 가능.
- 설정 변경은 optimistic local 반영 후 `107` 전송.
- round count, draw sec, word choice sec 등 min/max/step 유지.
- custom words raw 유지.
- game start button enable/disable 조건 유지.
- send 실패 시 mock fallback이 legacy와 같아야 한다.

완료 조건:

- 설정 UI 문구와 컨트롤이 같다.
- 설정 변경 payload가 legacy와 같다.
- 게임 시작 요청 payload가 legacy와 같다.

## Phase 12. progress/status/overlay 분리

legacy 기준 파일:

- `src_legacy/pages/game/components/GameStatusBar.tsx`
- `src_legacy/pages/game/components/GameStatusBar.css`
- `src_legacy/pages/game/components/board/TurnOverlay.tsx`
- `src_legacy/pages/game/components/board/TurnOverlay.css`
- `src_legacy/pages/game/hooks/useCountdownSec.ts`
- `src_legacy/pages/game/hooks/useTurnTimer.ts`
- `src_legacy/pages/game/hooks/useGameStageOverlay.ts`

목표 위치:

```text
src/features/game-progress/model/*
src/features/game-progress/ui/*
src/features/game-board/model/useGameStageOverlay.ts
src/features/game-board/ui/GameStageOverlay.tsx
```

유지할 동작:

- countdown 표시.
- deadline 보정.
- word choice overlay.
- drawing overlay.
- turn end overlay.
- game result overlay.
- ranking 표시.
- earned points 표시.
- selected word/description 표시.
- hint pattern 표시.
- overlay open/close animation.

주의:

- `serverNowMs`와 `deadlineAtMs` 보정이 있으면 유지한다.
- overlay phase fallback을 바꾸지 않는다.
- result ranking 동점 처리와 표시 순서를 바꾸지 않는다.

완료 조건:

- 각 game phase에서 legacy와 같은 overlay가 뜬다.
- countdown이 같은 시점에 감소한다.
- turn end/result 화면의 점수와 문구가 같다.

## Phase 13. reducer/store 분해

legacy 기준 파일:

- `src_legacy/app/store/AppStateContext.tsx`
- `src_legacy/app/store/appStateContextValue.ts`
- `src_legacy/app/store/lib/appStateReducer.ts`
- `src_legacy/app/store/lib/appStateSession.ts`
- `src_legacy/app/store/lib/appStateRoom.ts`
- `src_legacy/app/store/lib/appStateGame.ts`
- `src_legacy/app/store/lib/appStateCanvas.ts`
- `src_legacy/app/store/lib/appStateChat.ts`
- `src_legacy/app/store/lib/appStateSnapshot.ts`

목표 위치는 선택지 2개가 있다.

선택지 A: reducer 유지 후 위치만 이동

```text
src/entities/session/model/sessionReducer.ts
src/entities/game/model/gameReducer.ts
src/features/game-session/model/gameSessionReducerBridge.ts
```

선택지 B: Zustand 등 store로 분해

```text
src/entities/session/model/sessionStore.ts
src/entities/game/model/gameStore.ts
```

권장 순서:

1. 먼저 선택지 A로 파일 위치만 이동한다.
2. parity가 확보된 뒤 선택지 B로 바꾼다.
3. A와 B를 같은 PR/커밋에서 하지 않는다.

Zustand로 옮길 때 주의:

- selector는 stable reference를 반환해야 한다.
- 파생 배열/object는 `useMemo` 또는 store 내부 memoized selector로 처리한다.
- session store와 game store 사이의 업데이트 순서를 legacy reducer와 맞춘다.
- `joinAccepted`와 room snapshot apply 순서를 바꾸면 route 진입 타이밍이 달라질 수 있다.
- reset 시 어떤 오류 상태를 유지하는지 legacy와 같아야 한다.

완료 조건:

- reducer/store 분해 전후 모든 behavior checklist가 동일하다.
- 입장/퇴장/재입장 시 stale room state가 남지 않는다.
- disconnect 후 error modal 상태가 legacy와 같다.

## 파일 매핑 가이드

아래는 대표 파일의 최종 이동 예시다. 실제 작업 시 한 번에 모두 옮기지 말고 phase별로 진행한다.

| legacy | target |
| --- | --- |
| `src_legacy/main.tsx` | `src/main.tsx` |
| `src_legacy/App.tsx` | `src/App.tsx` |
| `src_legacy/index.css` | `src/index.css` |
| `src_legacy/app/AppShell.tsx` | `src/app/AppShell.tsx` |
| `src_legacy/app/router/*` | `src/app/router/*` |
| `src_legacy/app/ui/AppLayout.*` | `src/app/layout/AppLayout.*` |
| `src_legacy/entities/game/model/types.ts` | `src/entities/game/model/gameTypes.ts` |
| `src_legacy/entities/game/model/state.ts` | `src/entities/game/model/gameDefaults.ts` |
| `src_legacy/ws/client/wsSessionManager.ts` | `src/features/game-session/api/gameSessionApi.ts` + `src/shared/api/ws/wsTransport.ts` |
| `src_legacy/ws/protocol/events.ts` | `src/features/game-session/model/gameSessionTypes.ts` or protocol constants |
| `src_legacy/app/store/lib/appStatePayloadDecoders.ts` | `src/entities/game/api/*Normalizer.ts` |
| `src_legacy/app/store/lib/appStateWsAdapter.ts` | `src/features/game-session/api/gameSessionApi.ts` |
| `src_legacy/pages/entry/EntryPage.*` | `src/pages/entry/*` + `src/features/entry-join/*` |
| `src_legacy/pages/game/GamePage.*` | `src/pages/game/*` |
| `src_legacy/pages/game/components/ParticipantPanel.*` | `src/features/participants/ui/*` |
| `src_legacy/pages/game/components/ParticipantBubbleLayer.*` | `src/features/participants/ui/*` |
| `src_legacy/pages/game/hooks/useParticipantBubbles.ts` | `src/features/participants/model/useParticipantBubbles.ts` |
| `src_legacy/pages/game/hooks/useAnimatedParticipants.ts` | `src/features/participants/model/useAnimatedParticipants.ts` |
| `src_legacy/pages/game/components/GameChatPanel.*` | `src/features/game-chat/ui/*` |
| `src_legacy/pages/game/components/GameStatusBar.*` | `src/features/game-progress/ui/*` |
| `src_legacy/pages/game/components/GameBoardPanel.*` | `src/features/game-board/ui/*` |
| `src_legacy/pages/game/components/board/BoardCanvas.*` | `src/features/drawing-canvas/ui/*` |
| `src_legacy/pages/game/components/board/BoardToolbar.*` | `src/features/game-board/ui/*` |
| `src_legacy/pages/game/components/board/LobbySettingsOverlay.*` | `src/features/room-lobby/ui/*` |
| `src_legacy/pages/game/components/board/TurnOverlay.*` | `src/features/game-board/ui/GameStageOverlay.*` |

## CSS 이전 규칙

CSS는 구조 이전 중 가장 쉽게 깨진다. 다음 규칙을 지킨다.

1. CSS 파일을 먼저 그대로 복사한다.
2. component class name을 바꾸지 않는다.
3. 새 feature class prefix를 만들고 싶어도 parity 완료 전에는 하지 않는다.
4. 중복 CSS를 합치지 않는다.
5. `appShared.css`의 변수와 공통 class를 먼저 그대로 유지한다.
6. `GamePage.css`의 layout 변수는 절대 임의 변경하지 않는다.
7. mobile media query는 위치를 옮겨도 내용은 유지한다.
8. animation 이름은 유지한다.
9. focus-visible, hover, disabled 상태를 반드시 비교한다.

CSS 변경이 필요한 경우:

- import 경로만 바뀌는 변경은 허용한다.
- class name 충돌을 피하기 위한 이름 변경은 마지막 phase에서만 한다.
- 이름 변경 시 markup과 screenshot diff를 동시에 검증한다.

## import boundary 규칙

최종 구조에서 권장되는 import 방향:

```text
app -> pages -> features -> entities -> shared
```

허용:

- `pages`가 여러 `features`를 조립한다.
- `features`가 `entities` type/store를 읽는다.
- `features`가 `shared` transport를 사용한다.
- `app`이 provider/router/layout을 조립한다.

금지:

- `entities`가 `features`를 import.
- `entities`가 `pages`를 import.
- `shared`가 game/session 의미를 import.
- feature A UI가 feature B UI를 직접 import. 필요하면 page에서 조립한다.
- page가 WebSocket raw protocol을 직접 decode.

예외:

- migration 중 임시 bridge는 허용한다.
- 임시 bridge 파일에는 `TODO(migration): remove after parity`를 남긴다.
- 임시 bridge는 phase 종료 전 제거하거나 다음 phase 문서에 남긴다.

## 수동 QA 체크리스트

각 phase 종료 후 최소한 아래를 확인한다.

### Entry

- 닉네임 공백이면 빠른 입장/방 만들기 비활성.
- 닉네임 10자 제한.
- 빠른 입장 클릭 시 join pending.
- 방 만들기 클릭 시 join pending.
- 방 참여 modal open/close.
- 방 코드 대문자 정규화.
- invite path 진입 시 modal 자동 open.
- invite query 진입 시 modal 자동 open.
- join error modal 표시.
- connection error modal 표시.

### Routing

- `/` 진입.
- `/game` 직접 진입 시 main으로 replace.
- 입장 성공 시 `/game` 이동.
- game에서 main으로 이탈 시 room cache clear.
- browser back 동작.
- browser forward 동작.

### WebSocket

- 연결 URL query 확인.
- heartbeat 송신.
- pong 무시.
- open 전 close 재시도.
- open 후 close error 처리.
- `1999` join failed 처리.
- `300/408` snapshot 처리.

### Lobby

- room code 표시.
- invite/share menu.
- host setting editable.
- non-host setting disabled.
- settings update payload.
- game start request.

### Canvas

- pen drawing.
- eraser drawing.
- color selection.
- size selection.
- clear.
- remote stroke.
- lobby canvas.
- running turn canvas.

### Chat

- 일반 메시지 표시.
- 내 메시지 표시.
- system message 정책.
- 정답 제출.
- IME Enter 방지.
- scroll-to-bottom.
- privileged visibility.

### Participants

- participant list order.
- host badge.
- score.
- join animation.
- leave animation.
- host changed.
- bubbles.

### Game Flow

- game started.
- round started.
- turn started.
- word choice.
- drawing started.
- guess correct.
- turn ended.
- game result.
- return to lobby.

### Mobile

- mobile chat tab.
- mobile participants tab.
- chat input focus.
- keyboard open 후 scroll.
- touch scroll.
- pinch/double tap 방지.

## 자동 검증

각 phase마다 실행한다.

```bash
npm run lint
npm run typecheck
npm run build
```

가능하면 다음 검증도 추가한다.

```bash
npm run test
```

테스트가 없다면 최소한 다음 단위 테스트를 먼저 만든다.

- room snapshot normalizer
- chat message normalizer
- canvas stroke encoder/decoder
- game settings encoder/decoder
- route resolver
- entry validation

테스트는 legacy behavior를 고정하는 용도다. 구조 이전 중 새 정책을 정의하지 않는다.

## AI 작업자를 위한 세부 지침

AI가 이 작업을 수행할 때는 다음 규칙을 따른다.

1. 한 번에 하나의 phase만 작업한다.
2. phase 시작 전 legacy 파일을 읽는다.
3. phase 시작 전 관련 behavior 문서를 읽는다.
4. 새 구조를 만들더라도 먼저 legacy 코드를 최대한 보존한다.
5. 함수 이름 변경은 최소화한다.
6. 타입 개선은 parity 이후로 미룬다.
7. CSS 정리는 parity 이후로 미룬다.
8. 코드 중복 제거는 parity 이후로 미룬다.
9. 작업 후 어떤 legacy 파일을 어떤 target 파일로 옮겼는지 기록한다.
10. 작업 후 어떤 QA를 했는지 기록한다.

AI가 판단하기 애매하면 다음 기준을 쓴다.

- 더 예쁜 구조보다 더 작은 diff를 선택한다.
- 더 추상적인 이름보다 legacy 이름을 선택한다.
- 더 현대적인 React 패턴보다 legacy 동작과 같은 패턴을 선택한다.
- 동작을 추론하지 말고 legacy decoder/reducer를 그대로 따른다.

## 커밋 단위 권장안

권장 커밋 흐름:

1. `chore: bootstrap src from legacy`
2. `refactor: split domain types and defaults`
3. `refactor: isolate websocket transport`
4. `refactor: move router and app layout`
5. `refactor: split entry join feature`
6. `refactor: split invite share feature`
7. `refactor: move game page shell`
8. `refactor: split participants feature`
9. `refactor: split game chat feature`
10. `refactor: split board and canvas features`
11. `refactor: split lobby controls`
12. `refactor: split progress and overlays`
13. `refactor: split session and game stores`
14. `test: add legacy parity coverage`
15. `docs: record migration parity status`

각 커밋은 독립적으로 build 가능해야 한다.

## 완료 기준

구조 이전 완료는 파일이 옮겨졌다는 뜻이 아니다. 다음이 모두 만족되어야 한다.

- `src_legacy` 없이 `src`만으로 앱이 동작한다.
- entry, routing, lobby, board, chat, participants, overlay, WebSocket 흐름이 legacy와 같다.
- desktop/mobile screenshot diff가 의도치 않게 발생하지 않는다.
- 서버 이벤트 matrix가 모두 처리된다.
- `npm run lint`, `npm run typecheck`, `npm run build`가 통과한다.
- legacy behavior 문서의 각 항목에 대해 완료 여부가 기록되어 있다.
- 남은 차이가 있다면 기능 차이인지 디자인 차이인지 명확히 문서화되어 있다.

## 최종 점검 질문

마지막 PR 또는 merge 전 다음 질문에 모두 답해야 한다.

- 빠른 입장, 방 만들기, 방 참여가 모두 실제 서버에서 성공하는가?
- `300/408` snapshot이 어떤 payload shape로 와도 legacy 수준으로 처리되는가?
- `1999` 실패가 legacy와 같은 modal로 보이는가?
- WebSocket reconnect와 disconnect 분류가 legacy와 같은가?
- invite path/query가 모두 같은가?
- mobile keyboard UX가 같은가?
- canvas stroke가 같은 좌표/색/굵기로 보이는가?
- chat privileged visibility가 같은가?
- participant bubble과 animation이 같은가?
- overlay timing과 countdown이 같은가?
- CSS class name 변경으로 snapshot/스타일이 깨지지 않았는가?
- 새 구조에서 특정 feature가 다시 모든 책임을 먹는 병목이 생기지 않았는가?

이 질문 중 하나라도 아니면 구조 이전은 완료가 아니다.
