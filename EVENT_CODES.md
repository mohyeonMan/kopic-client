# Event Codes

## 번호 체계

### 대역

| 범위 | 방향 | 용도 |
|---:|---|---|
| 1~99 | 공통 | transport |
| 100~199 | C -> S | room/lobby 요청 |
| 200~299 | C -> S | game/action 요청 |
| 300~399 | S -> C | room/lobby 이벤트 |
| 400~499 | S -> C | game/turn 이벤트 |
| 1900~1999 | S -> C | error |

### C -> S 변경 이력

| 이전 e | 현재 e | 역할 |
|---:|---:|---|
| 1 | 1 | HEARTBEAT_PING |
| 101 | 101 | JOIN |
| 102 | 102 | LEAVE |
| 103 | 103 | CREATE_PRIVATE_ROOM |
| 106 | 104 | GAME_SNAPSHOT_REQUEST |
| 107 | 110 | GAME_SETTINGS_UPDATE_REQUEST / SETTING_UPDATE |
| 200 | 200 | GAME_START_REQUEST / GAME_START |
| 201 | 201 | DRAW_STROKE |
| 202 | 202 | DRAW_CLEAR |
| 203 | 203 | WORD_CHOICE |
| 204 | 204 | GUESS_SUBMIT / CHAT_OR_GUESS |

### S -> C 변경 이력

| 이전 e | 현재 e | 역할 |
|---:|---:|---|
| 2 | 2 | HEARTBEAT_PONG |
| 107 | 303 | SETTINGS_UPDATED |
| 200 | 400 | GAME_STARTED |
| 201 | 405 | DRAW_STROKE / CANVAS_STROKE |
| 202 | 401 | ROUND_STARTED |
| 203 | 403 | WORD_CHOICE_OPEN |
| 204 | 407 | CHAT_OR_GUESS_MESSAGE |
| 205 | 410 | TURN_ENDED |
| 206 | 411 | GAME_RESULT |
| 207 | 412 | RETURN_TO_LOBBY |
| 208 | 404 | DRAWING_STARTED |
| 209 | 402 | TURN_STARTED |
| 210 | 408 | GUESS_CORRECT |
| 211 | 409 | HINT_REVEALED |
| 300 | 300 | JOIN_ACCEPTED |
| 301 | 301 | ROOM_JOINED |
| 302 | 302 | ROOM_LEFT |
| 307 | 413 | GAME_ENDED |
| 308 | 303 | GAME_SETTINGS_UPDATED |
| 402 | 406 | CANVAS_CLEAR |
| 408 | 304 | GAME_SNAPSHOT |

### Error 변경 이력

| 이전 e | 현재 e | 역할 |
|---:|---:|---|
| 1901 | 1901 | MISSING_ENVELOPE |
| 1902 | 1902 | UNSUPPORTED_EVENT |
| 1903 | 1903 | INVALID_REQUEST |
| 1910 | 1910 | ROOM_NOT_FOUND |
| 1911 | 1911 | ROOM_FULL |
| 1920 | 1920 | FORBIDDEN |
| 1930 | 1930 | CONFLICT |
| 1940 | 1940 | MAILBOX_FULL |
| 1941 | 1941 | ACTOR_INACTIVE |
| 1999 | 1999 | UNKNOWN / UNKNOWN_ERROR |

## Client -> Server

| e | 역할 | p 필드 |
|---:|---|---|
| 1 | HEARTBEAT_PING | - |
| 104 | GAME_SNAPSHOT_REQUEST 정의됨, 현재 송신 없음 | - |
| 110 | GAME_SETTINGS_UPDATE_REQUEST | [roundCount, drawSec, wordChoiceSec, wordChoiceCount, hintRevealSec, hintLetterCount, drawerOrderMode, endMode, customWordMode, customWordsRaw] |
| 200 | GAME_START_REQUEST | - |
| 201 | DRAW_STROKE | [toolCode, colorIndex, size, points] |
| 202 | DRAW_CLEAR 정의됨, 현재 송신 없음 | - |
| 203 | WORD_CHOICE | ci |
| 204 | GUESS_SUBMIT | t |

## Payload 필드 축약

| 의미 | 필드 |
|---|---|
| sessionId | sid |
| nickname | n |
| roomCode | rc |
| roomId | rid |
| snapshot | s |
| settings | st |
| hostSessionId | hs |
| roomType | rt |
| participantCount | pc |
| participants | ps |
| currentCanvas | cv |
| game | g |
| serverNowMs | now |
| deadlineAtMs | dl |
| gameId | gid |
| round | r |
| roundId | ri |
| turnId | tid |
| turnIndex | ti |
| drawerSid | ds |
| drawerSids | dss |
| seconds | sec |
| words | w |
| answerEntry | ae |
| answer | ans |
| answerLength | al |
| hintPattern | hp |
| hintRevealedCount | hc |
| hintTotalRevealCount | ht |
| reason | rsn |
| message | msg |
| earnedPoints | ep |
| totalPoints | pts |
| nextHost | nh |
| sealed | s |

## Client 수신 처리

| e | 역할 | p 필드 |
|---:|---|---|
| 2 | HEARTBEAT_PONG | - |
| 303 | GAME_SETTINGS_UPDATED | [roundCount, drawSec, wordChoiceSec, wordChoiceCount, hintRevealSec, hintLetterCount, drawerOrderMode, endMode, customWordMode, customWordsRaw] |
| 400 | GE_GAME_STARTED | gid, sec |
| 401 | GE_ROUND_STARTED | gid, r, ri, dss, sec |
| 402 | GE_TURN_STARTED | gid, r, tid, ti, ds, sec |
| 403 | GE_WORD_CHOICE_OPEN | tid, ds, sec, w |
| 404 | GE_DRAWING_STARTED | gid, tid, sec, ds, ae, al, hp |
| 405 | CANVAS_STROKE | [toolCode, colorIndex, size, points] |
| 406 | CANVAS_CLEAR | - |
| 407 | GUESS_MESSAGE | sid, t, s |
| 408 | GE_GUESS_CORRECT | gid, tid, sid |
| 409 | GE_HINT_REVEALED | gid, tid, ds, hp, hc, ht |
| 410 | GE_TURN_ENDED | gid, tid, rsn, sec, ans, ep |
| 411 | GE_GAME_RESULT | gid, sec, pts |
| 412 | GE_RETURN_TO_LOBBY | gid, rsn, sec |
| 413 | GAME_ENDED | - |
| 300 | JOIN_ACCEPTED | sid, s |
| 301 | ROOM_JOINED | sid, n, ci |
| 302 | ROOM_LEFT | sid, nh |
| 304 | GAME_SNAPSHOT | sid, s |

## GE 수신 처리

| e | 역할 | p 필드 |
|---:|---|---|
| 101 | JOIN | n, rc |
| 102 | LEAVE | - |
| 103 | CREATE_PRIVATE_ROOM | n |
| 110 | SETTING_UPDATE | [roundCount, drawSec, wordChoiceSec, wordChoiceCount, hintRevealSec, hintLetterCount, drawerOrderMode, endMode, customWordMode, customWordsRaw] |
| 200 | GAME_START | - |
| 201 | DRAW_STROKE | [toolCode, colorIndex, size, points] |
| 203 | WORD_CHOICE | ci |
| 204 | CHAT_OR_GUESS | t |

## GE -> Client

| e | 역할 | p 필드 |
|---:|---|---|
| 303 | SETTINGS_UPDATED | [roundCount, drawSec, wordChoiceSec, wordChoiceCount, hintRevealSec, hintLetterCount, drawerOrderMode, endMode, customWordMode, customWordsRaw] |
| 304 | GAME_SNAPSHOT | sid, rid, s |
| 301 | ROOM_JOINED | sid, n, ci |
| 302 | ROOM_LEFT | sid, nh |
| 400 | GAME_STARTED | gid, sec |
| 401 | ROUND_STARTED | gid, r, ri, dss, sec |
| 402 | TURN_STARTED | gid, r, tid, ti, ds, sec |
| 403 | WORD_CHOICE_OPEN | tid, ds, sec, w |
| 404 | DRAWING_STARTED | gid, tid, sec, ds, ae, al, hp |
| 405 | DRAW_STROKE | [toolCode, colorIndex, size, points] |
| 407 | CHAT_OR_GUESS_MESSAGE | sid, t, s |
| 408 | GUESS_CORRECT | gid, tid, sid |
| 409 | HINT_REVEALED | gid, tid, ds, hp, hc, ht |
| 410 | TURN_ENDED | gid, tid, rsn, sec, ans, ep |
| 411 | GAME_RESULT | gid, sec, pts |
| 412 | RETURN_TO_LOBBY | gid, rsn, sec |

### Snapshot(s) 필드

| 위치 | p 필드 |
|---|---|
| s | rc, rt, hs, st, pc, ps, cv, g, now, dl |
| s.ps.* | n, ci |
| s.g | gid, gp, r, ri, rp, dss, ca, tid, tp, ds, al, hp, ans, ep, pts |

## Error

| e | 역할 | p 필드 |
|---:|---|---|
| 1901 | MISSING_ENVELOPE | rsn, msg |
| 1902 | UNSUPPORTED_EVENT | rsn, msg |
| 1903 | INVALID_REQUEST | rsn, msg |
| 1910 | ROOM_NOT_FOUND | rsn, msg |
| 1911 | ROOM_FULL | rsn, msg |
| 1920 | FORBIDDEN | rsn, msg |
| 1930 | CONFLICT | rsn, msg |
| 1940 | MAILBOX_FULL | rsn, msg |
| 1941 | ACTOR_INACTIVE | rsn, msg |
| 1999 | UNKNOWN / UNKNOWN_ERROR | rsn, msg |
