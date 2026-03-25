# ko-pic Client Interaction Flow Sample v0

## 1. 목적

이 문서는 `ko-pic Game Rules` 기준으로, 클라이언트 화면을 **2개 페이지 구조**로 운영할 때의 상호작용 흐름을 기획 관점에서 정리한다.

- 페이지 구조: `MainPage`, `GamePage`
- 핵심: `GamePage` 내부에서 `Lobby 상태`, `Game 진행 상태`, `Result 상태`를 모두 처리
- 기준: private room MVP + random matching 진입

---

## 2. 페이지 구조 (고정)

1. `MainPage`
2. `GamePage`

정책:

- `MainPage`: 게임 소개 + 닉네임 입력 + 입장 트리거 버튼 제공
- `GamePage`: 입장 후의 모든 상태(`Lobby`, `InGame`, `Result`)를 단일 페이지 내부 상태 전환으로 처리
- 현재 문서 범위는 **큰 모니터(Desktop) 전용**이며, 반응형은 후속 작업으로 분리

---

## 3. MainPage 구성/동작

### 3.1 화면 요소

- 게임 개략 설명 블록
- 닉네임 입력 input
- 버튼 1: `무작위 매칭`
- 버튼 2: `Private Room 생성`

### 3.2 공통 입력 검증

- 닉네임 미입력/형식 오류 시 버튼 동작 차단
- 요청 중에는 버튼 중복 클릭 방지(로딩 상태)

### 3.3 버튼 1: 무작위 매칭

1. 사용자 `무작위 매칭` 클릭.
2. 클라이언트가 lobby 서버에 즉시 매칭 가능 여부/입장 정보를 요청.
3. 서버 리턴값 기준으로 입장 절차 진행:
- 빈 슬롯/대기 방이 있으면 해당 room으로 join 절차
- 없으면 매칭용 room 생성 후 join 절차
4. join 컨텍스트(`roomId`, `roomCode`, `userId`) 확보.
5. WS 연결 후 `408 GAME_SNAPSHOT` 수신 기준으로 authoritative 상태 동기화.
6. 라우팅: `GamePage` 진입.

### 3.4 버튼 2: Private Room 생성

1. 사용자 `Private Room 생성` 클릭.
2. 클라이언트가 lobby 서버에 private room 생성 요청.
3. 생성 성공 응답(`roomId`, `roomCode`, `host userId`) 수신.
4. 생성자 본인이 host로 join 절차 진행.
5. WS 연결 후 `408 GAME_SNAPSHOT` 수신 기준으로 authoritative 상태 동기화.
6. 라우팅: `GamePage` 진입.

실패 처리(공통):

- MainPage 유지
- 실패 원인 메시지 노출(서버 오류, 검증 오류, 일시적 불가)
- 재시도 가능 상태로 복귀

---

## 4. GamePage 내부 상태 모델

`GamePage`는 단일 페이지이며, 내부 상태만 전환한다.

1. `GAMEPAGE_LOBBY`
2. `GAMEPAGE_INGAME`
3. `GAMEPAGE_RESULT`

전환 트리거:

- `302 GAME_STARTED` -> `GAMEPAGE_INGAME`
- `307 GAME_ENDED` -> `GAMEPAGE_RESULT`
- result view 종료 후 -> `GAMEPAGE_LOBBY`

---

## 5. GamePage Desktop 레이아웃 규격

### 5.1 상단 정보바 (독립 영역)

- 페이지 최상단에 가로로 긴 단일 `InfoBar` 배치
- 하단의 좌/중/우 3영역과 분리된 별도 div
- `InfoBar` 의미: 게임 진행 핵심 메타정보를 고정 노출하는 상단 상태 바
- 고정 표시 정보:
- `round`
- `turn`
- `timer`
- `현재 drawer`
- `draw 순서 rail`(이번 round 기준)

### 5.2 본문 3분할 레이아웃

- 좌측: 참여자 영역
- 중앙: 그림(캔버스) 영역
- 우측: 채팅 영역

폭 비율 기준:

- 좌:중:우 = `2:5:3`
- 우선순위 1: 중앙 캔버스 비율 유지
- 우선순위 2: 우측 채팅 영역 확보
- 우선순위 3: 좌측 참여자 영역

### 5.3 캔버스 비율 고정 규칙

- 그림 영역의 가로/세로 비율은 고정값(`CANVAS_ASPECT_RATIO = 4:3`) 유지
- Viewport가 변해도 캔버스 비율을 먼저 지키고, 남는 공간에 좌/우 영역을 맞춤 배치
- 턴 결과/게임 결과 오버레이는 **캔버스 박스 위치/크기에 정확히 맞춰** 표시

---

## 6. GamePage 구성 요소 상세

### 6.1 좌측 참여자 패널

- 참여자 1명당 얇은 카드 UI
- 카드 표시 정보:
- 닉네임
- 점수
- host 뱃지

상태 스타일:

- 현재 drawer 카드:
- 테두리 색상 변경
- 테두리 두께 증가
- 정답자 카드:
- 카드 배경 채움색 변경

메시지 말풍선:

- 사용자가 채팅 입력 시, 해당 사용자 카드 오른쪽에 임시 말풍선 표시
- 말풍선 투명도: `opacity 0.8`
- 표시 시간: 2초 후 자동 사라짐

### 6.2 중앙 캔버스 패널

- drawer만 입력 가능
- non-drawer는 완전 읽기 전용
- drawer가 그리는 동안 정답 단어는 캔버스 상단 중앙에 고정 표시

도구 범위(MVP):

- 펜
- 브러시형 지우기
- 전체 지우기
- 펜 굵기 `10단계(0~9)`
- 색상 팔레트 `20개`

### 6.3 우측 채팅 패널

- 채팅 입력창 + 메시지 로그
- 엔터 전송 지원
- 전송 버튼 제공
- 입력 길이 제한 `50자`
- 모든 사용자 입력은 서버로 `204 GUESS_SUBMIT` 이벤트로 전송
- 이벤트 명칭(`GUESS_SUBMIT`)은 후속 리네이밍 가능하나, 현재 스펙은 유지

메시지 공개 규칙:

- 일반 오답: 전체 공개
- 정답 처리된 사용자 이후 메시지: 정답자 집합 + drawer에게만 공개
- 정답자 메시지 색상은 일반 메시지와 다르게 표시
- 정답자+drawer 전용 채팅과 전체 채팅의 구분은 텍스트 색상으로 처리

---

## 7. GamePage 동작 흐름 (스토리형)

### 7.1 Lobby 상태

- room code, 참여자 카드, 설정, 시작 버튼 표시
- host만 설정/시작 조작 가능
- `301 ROOM_JOINED`, `309 ROOM_LEFT` 즉시 반영

### 7.2 InGame 상태

1. `302 GAME_STARTED` 수신 -> in-game 전환
2. `303 ROUND_STARTED` 수신 -> info bar와 draw 순서 rail 갱신
3. `304 TURN_STARTED` 수신 -> 캔버스 초기화, drawer 강조
4. 단어 선택:
- drawer: `406 WORD_CHOICES`
- guesser: `311 TURN_STATE(WORD_CHOICES_GIVEN)`
 - drawer 단어 선택 UI는 캔버스 중앙에 후보 단어를 노출하고 클릭 선택
5. 드로잉 시작:
- drawer: `310 DRAWING_STARTED`
- others: `311 TURN_STATE(DRAWING_STARTED)`
6. 실시간 진행:
- draw 입력: `201 DRAW_STROKE`, `202 DRAW_CLEAR`
- 채팅/정답 제출: `204 GUESS_SUBMIT`
7. 정답 발생 시 `404 GUESS_CORRECT` 반영
8. 턴 종료 시 `305 TURN_ENDED`를 캔버스 정합 오버레이로 최소 3초 표시

### 7.3 Result 상태

- `307 GAME_ENDED` 수신 -> result 상태 전환
- 캔버스 위치 기준 결과 오버레이 표시
- ranking/최종 점수 노출
- 8초 후 lobby 상태로 복귀

---

## 8. 이벤트별 상태 변경 규칙

클라이언트는 이벤트 수신 시 아래 state를 갱신한다.

- `301 ROOM_JOINED`: `participants`, `hostUserId(필요 시)`, 좌측 카드 목록
- `309 ROOM_LEFT`: `participants`, `hostUserId(필요 시)`, 좌측 카드 목록
- `302 GAME_STARTED`: `pageState = GAMEPAGE_INGAME`, `scoreboard 초기화`, `turnResultOverlay 닫힘`
- `303 ROUND_STARTED`: `roundNo`, `drawerOrder`, `turnCursor`, `infoBar.roundRail`
- `304 TURN_STARTED`: `turnNo`, `currentDrawerUserId`, `canvas 초기화`, `turnPhase = WORD_CHOICE_PREP`
- `406 WORD_CHOICES`(drawer only): `turnPhase = WORD_CHOOSING`, `wordChoiceOptions 표시`, `wordChoiceOverlayPosition = canvas.center`, `click to choose`
- `311 TURN_STATE(WORD_CHOICES_GIVEN)`: `turnPhase = WORD_CHOOSING`, `guesser 입력 비활성`
- `310 DRAWING_STARTED` 또는 `311 TURN_STATE(DRAWING_STARTED)`: `turnPhase = DRAWING`, `timer`, `입력 활성/비활성 전환`
- `310 DRAWING_STARTED`(drawer): `secretWordBanner = canvas.top-center 고정`
- `401 CANVAS_STROKE`: `canvas.strokes append`
- `402 CANVAS_CLEAR`: `canvas.strokes clear`
- `403 GUESS_MESSAGE`: `chatMessages append`, `participantBubble[writer] = 2초 표시`
- `404 GUESS_CORRECT`: `correctUserIds`, `participantCard 상태색`, `정답자 채팅 스타일`
- `305 TURN_ENDED`: `turnPhase = ENDED`, `earnedScores`, `scoreboard`, `turnResultOverlay open(최소 3초)`
- `306 ROUND_ENDED`: `roundEndFlag`, `다음 round 대기 상태`
- `307 GAME_ENDED`: `pageState = GAMEPAGE_RESULT`, `ranking`, `gameResultOverlay open`
- `408 GAME_SNAPSHOT`: `runtimeState 전체 치환(participants/canvas/scoreboard/turn/round/settings)`

---

## 9. 예외/실패 흐름 (재접속 제외)

### 9.1 서버 응답 지연/소통 타임아웃

- 현재 페이지 유지
- 중복 요청 유발 입력 임시 비활성
- "서버 응답 지연" 안내 오버레이 표시
- 이후 authoritative 이벤트(`408` 등) 수신 시 정상 상태 복구

### 9.2 단어 선택 타임아웃

- drawer 미선택 시 서버 자동 선택
- 자동으로 드로잉 상태 전환
- 별도 자동선정 안내 문구는 노출하지 않음

### 9.3 드로잉 타임아웃

- `305 TURN_ENDED(reason=TIMEOUT)` 기준으로 턴 종료 오버레이 전환
- 입력 비활성, 다음 턴 대기

### 9.4 참여자 이탈

- `309 ROOM_LEFT` 반영: 참여자 카드/점수 즉시 갱신
- drawer 이탈이면 `DRAWER_LEFT` 사유 턴 종료 표시

---

## 10. 화면 설계 포인트

1. `MainPage`는 진입 결정(닉네임 + 모드 선택)에 집중
2. `GamePage`는 상태 전환(`Lobby/InGame/Result`)만으로 운영
3. 레이아웃 우선순위는 캔버스 비율 > 채팅 > 참여자
4. 채팅은 커뮤니케이션이자 정답 제출 입력으로 동시에 취급
5. 결과/턴 종료 표시는 캔버스 정합 오버레이를 기본 원칙으로 사용

---

## 11. 이번 단계 결정사항 메모

- 점수 규칙은 서버 설계 단계에서 추후 확정
- 시작 가능 최소 인원은 2명
- 인원 감소로 인한 즉시 중단 처리는 서버 레벨 책임, 클라이언트 문서에서는 상세 분기 생략
- 이벤트 수신 로그는 UI 노출 없이 `console.log`만 사용
- 오버레이/상태 문구는 한곳에서 관리 가능하도록 추후 문구 모음 섹션으로 통합 예정

