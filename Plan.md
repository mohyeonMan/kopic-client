AppStateContext.tsx (line 40)는 액션 정의, 프로토콜 decode/normalize, reducer, provider까지 한 파일에 몰려 있습니다. session, room, game, chat, canvas, ws-adapter로 분해하는 게 1순위입니다. --완료
GamePage.tsx (line 33)는 페이지 조합, 타이머, 채팅 스크롤, overlay, participant animation, 캔버스 제어를 다 들고 있습니다. useGameStageOverlay, useChatAutoScroll, useParticipantBubbles, useGameControls 같은 훅으로 먼저 쪼개면 구조가 많이 좋아집니다. --완료
GameBoardPanel.tsx (line 26)의 props 개수가 많습니다. 이건 컴포넌트 경계가 아직 덜 잡혔다는 신호라서 BoardCanvas, BoardToolbar, LobbySettingsOverlay, TurnOverlay로 더 잘게 나누는 게 좋습니다. --완료
계층이 일관되지 않습니다. AppRouter.tsx (line 1)는 실제로 EntryPage와 GamePage만 렌더링하는데, LobbyPage.tsx (line 1), ResultPage.tsx (line 1), ProtocolPanel.tsx (line 1)는 연결되지 않은 상태입니다. 남길지 지울지 결정해야 합니다.
전역 context 구독 범위가 큽니다. useAppState.ts (line 1)를 통해 AppLayout.tsx (line 35)와 useAppRouter.ts (line 11)도 전체 상태를 읽고 있어서, 채팅/캔버스 갱신이 상위 셸까지 다시 렌더링될 수 있습니다. session/ui/game 단위로 context를 나누는 편이 낫습니다.
스타일도 App.css (line 1) 한 파일에 몰려 있습니다. index.css는 토큰/리셋만 남기고, 페이지나 위젯 옆으로 스타일을 붙이는 구조가 관리하기 쉽습니다.
문서와 설정도 정리 필요합니다. README.md (line 1)는 아직 Vite 템플릿이고, package.json (line 6)에는 test 스크립트가 없고, tsconfig.app.json (line 1)에는 path alias가 없습니다.