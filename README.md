# kopic-client

실시간 그림 퀴즈 클라이언트입니다.

- Stack: `React 19`, `TypeScript`, `Vite`
- Entry: [src/main.tsx](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/src/main.tsx:1)
- App shell: [src/app/AppShell.tsx](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/src/app/AppShell.tsx:1)

## Scripts

- `npm run dev`: Vite 개발 서버
- `npm run build`: 타입 체크 후 프로덕션 번들 생성
- `npm run preview`: 빌드 결과 로컬 미리보기
- `npm run lint`: ESLint 실행
- `npm run typecheck`: TypeScript 프로젝트 참조 검사
- `npm run check`: lint + typecheck 일괄 확인

## Base Path

프로덕션 빌드 기본 base path는 `/kopic/` 입니다.

- 기본값: `npm run build`
- 루트 배포: `VITE_APP_BASE_PATH=/ npm run build`

관련 설정은 [vite.config.ts](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/vite.config.ts:1)에 있습니다.

## Docs

설계 문서는 [docs/README.md](/Users/jihoon/Desktop/workspace/personal/kopic/kopic-client/docs/README.md:1)를 시작점으로 보면 됩니다.
