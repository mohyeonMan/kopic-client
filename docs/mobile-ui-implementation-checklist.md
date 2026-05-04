# Mobile UI Implementation Checklist

이 문서는 `kopic-client` 모바일 UI 개선 작업의 구현 체크리스트다.

## Scope

- [x] 모바일에서 보드 집중도가 높아지도록 레이아웃 재조정
- [x] 상단 `공유` 드롭다운 추가
- [x] `링크 복사 / 방 코드 복사 / 기기 공유` 3개 액션 제공
- [x] 모바일 채팅 입력란을 스크롤과 무관하게 하단 고정
- [x] 키보드 오픈 시 입력란이 키보드 상단에 붙도록 viewport 대응
- [x] 키보드 오픈 중 보드와 입력란 간 시각적 거리 축소
- [x] 모바일에서 채팅과 참여자 패널을 분리해 보드 집중도 향상
- [x] 채팅 입력 포커스 시 iOS 확대 현상 완화
- [x] 캔버스 장기 터치 시 텍스트 선택/돋보기/콜아웃 방지 강화
- [x] Safari / Chrome / Samsung Internet 공통 동작을 고려한 `visualViewport` 기반 보정

## Topbar Share

- [x] 기존 단일 `링크 복사` 버튼을 `공유` 버튼으로 교체
- [x] `공유` 버튼 클릭 시 드롭다운 메뉴 오픈
- [x] `링크 복사` 액션은 초대 URL을 클립보드에 복사
- [x] `방 코드 복사` 액션은 room code만 복사
- [x] `공유하기` 액션은 Web Share API를 우선 사용
- [x] Web Share API 미지원 환경에서는 링크 복사로 폴백
- [x] 메뉴 바깥 클릭/ESC 입력 시 드롭다운 닫힘

## Mobile Chat Composer

- [x] 채팅 입력란을 하단 dock 구조로 분리
- [x] 모바일에서 입력란을 `fixed`로 유지
- [x] `visualViewport` 높이/offset 변화에 따라 composer bottom 위치 보정
- [x] 채팅 목록은 composer 높이만큼 하단 padding 확보
- [x] 스크롤 하단 이동 버튼 위치도 composer 기준으로 보정
- [x] 채팅 입력 폰트 크기를 모바일에서 16px 이상으로 조정
- [x] 포커스 시 과도한 outline/scale 인상 제거

## Mobile Layout

- [x] 모바일에서 게임 레이아웃을 1열로 고정
- [x] 보드 아래에 `채팅 / 참여자` 패널 전환 스위처 추가
- [x] 모바일에서는 활성 패널만 노출
- [x] 참여자 패널 높이를 제한해 하단 보조 패널 역할로 축소
- [x] 채팅 포커스 시 보조 스위처를 숨겨 보드 집중도 확보
- [x] 게임 화면 모바일 footer는 숨겨 세로 공간 확보

## Canvas Interaction Hardening

- [x] 캔버스 및 보드 프레임 전체에 `user-select: none` 계열 적용
- [x] `-webkit-touch-callout: none` 적용
- [x] grid overlay / 배너 / 설정 버튼도 선택 방지 범위에 포함
- [x] canvas touch/gesture/contextmenu/selectstart/dragstart 방지 범위 확대
- [x] 드로잉 시작 시 selection range 제거

## Validation

- [ ] iPhone Safari 실기기 확인
- [ ] Android Chrome 실기기 확인
- [ ] Samsung Internet 실기기 확인
- [ ] 모바일에서 키보드 오픈/닫힘 시 composer 위치 수동 검증
- [ ] 공유 드롭다운과 Web Share 동작 수동 검증

## Follow-up Fix Pass

- [x] 모바일 채팅 활성 패널이 남는 영역을 충분히 채우도록 레이아웃 재조정
- [x] 채팅 입력 포커스 시 페이지가 아래로 밀리지 않도록 게임 셸 높이/스크롤 잠금 적용
- [x] 키보드 오픈 후 페이지 하단 공백 스크롤 제거
- [x] `공유하기` 버튼의 Web Share payload/feature detection 강화
- [x] Web Share 불가 환경에서는 명시적 복사 폴백 피드백 제공
- [x] 메시지 입력 옆 버튼을 `전송`에서 `지우기`로 교체
- [x] 입력행 바깥에 composer shell 경계 추가
- [x] 페이지 확대/축소 방지를 위해 게임 라우트 전역 gesture 차단 추가
