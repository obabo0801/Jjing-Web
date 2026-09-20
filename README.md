<p align="center">
  <img src="https://img.shields.io/badge/node.js-24%2B-brightgreen" alt="Node.js 24 이상">
  <img src="https://img.shields.io/badge/version-v1.0.0-blue" alt="Version 1.0.0">
</p>

<h1 align="center">
🐶 Jjing Web
</h1>

<p align="center">
  <img src="https://github.com/user-attachments/assets/c4f849a2-839f-4ec1-9f3c-2b837e8518f7" width="16%" alt="찡">
</p>

<p align="center">
  <strong>Node.js Jjing Web</strong>
</p>

<p align="center">
  <a href="https://github.com/obabo0801/Jjing-Web/archive/refs/heads/main.zip">
    <img src="https://img.shields.io/badge/Download-ZIP-blue?style=for-the-badge" alt="Download ZIP">
  </a>
</p>

```bash
git@github.com:obabo0801/Jjing-Web.git
```

---

<details>
<summary>❗ 업데이트 내역</summary>

## ❗ 버전 1.0.0

- 공개 채팅, 메신저, 문의하기 추가
- 이미지, 음성, 이모티콘 첨부 지원
- 링크 미리보기 추가
- 로그인, 프로필 편집, 계정 삭제 기능 추가
- 사용자 신고, 제재, 관리자 권한 관리 지원
- 알림 전송, 등록된 기기 확인 기능 추가
- DB, 업로드, TTS, STT 관리 화면 추가
- 데스크탑, 모바일, 웨어러블 화면 대응
- 테마, 다국어, 소리, 진동 설정 지원
- PWA 설치, 오프라인 화면 지원
- 공용 화면 구성 요소 추가
- 빌드 파일 해시 처리 적용

</details>

---

## 📌 소개

Node.js 웹 프로젝트입니다.

채팅, 음성, 알림, 사용자 관리 기능을 제공하며<br>
데스크탑, 모바일, 웨어러블 화면에 대응합니다.

---

## ✨ 기능

### 🌐 화면

- 테마, 언어 자동 적용
- 기기별 화면 구성
- 이미지 확대, 이동, 보기
- 공용 UI
- 공용 오디오 플레이어
- 공용 파일 선택

### 👤 사용자

- 로그인, 프로필 설정
- 프로필 이미지 편집
- 휴대폰을 통한 이미지 등록
- 접속 상태, 현재 접속자 확인
- 브라우저 저장 데이터 관리
- 계정 삭제 요청, 7일 이내 취소

### 💬 채팅

- 공개 채팅, 메신저
- 이전 대화 조회
- 최신 메시지 이동
- 이미지, GIF, 음성, 이모티콘 첨부
- 링크 미리보기
- 첨부 목록 조회
- 음성 입력
- 메시지 읽어주기
- 사용자 차단, 신고

### 📬 문의하기

- 첫 메시지 전송 시 문의 접수
- 관리자 확인 시 담당자 배정
- 문의 내역 조회
- 문의 종료

### 🛡 관리

- 사용자 검색
- 관리자 권한 관리
- 채팅 제한, 접속 차단, 강제 퇴장
- 신고 내역, 제재 이력 확인
- 서비스 점검
- API 요청 제한
- 오류, 오프라인, 점검 안내 화면
- DB, 로그, 업로드, TTS, STT 조회

### 🔔 알림

- 제목, 내용, 이미지 지정
- 등록된 기기에서 전송 대상 선택
- 사용자별 알림 설정
- 기기 정보 확인
- 화면 내 알림
- 지원 브라우저의 Web Push
- 알림 선택 시 관련 화면 이동
- 유효하지 않은 구독 정리

### 📱 PWA

- 지원 브라우저에서 앱 설치
- 오프라인 안내 화면
- 백그라운드 동기화
- 캐시 관리

### 🔊 오디오

- 효과음, 배경음, 알림음 재생
- 종류별 음량 설정
- 음소거
- 지원 기기의 진동 피드백
- 오디오 탐색, 재생 시간 표시

### 🗣 TTS

- Google TTS
- Google Cloud Text-to-Speech
- Cloud 요청 실패 시 일반 TTS로 전환
- 언어, 음성, 속도, 음높이 설정
- 생성 음원 재사용

### 🎙 STT

- Web Speech API
- Google Cloud Speech-to-Text
- 지원 환경에서 실시간 인식 결과 표시
- 녹음 음성 인식
- 마이크 선택
- 입력 상태 표시

### 🛠 파일 처리

- 빌드 파일명 해시 처리
- `data-*` 속성 해시 처리
- 페이지 경로 자동 연결
- 개발 서버의 API 요청 전달
- 업로드 이미지 크기 조절
- 이미지 형식 변환
- 파일 처리 크기 제한

---

## 🛠 개발 환경

- Node.js 24 이상
- npm
- ES Modules
- Express 5
- Vite 8
- SQLite3 6
- Google Cloud Speech
- Text-to-Speech
- Web Push
- ESLint 10
- Prettier 3
- Sharp
- QRCode

---

## 🚀 설치

```bash
git clone git@github.com:obabo0801/Jjing-Web.git
cd Jjing-Web
npm ci
```

---

## 🖥 개발 실행

`.env`에 `NODE_ENV=development`를 설정합니다.

최초 빌드

```bash
npm run build
```

서버 실행

```bash
npm start
```

다른 터미널에서 개발 화면 실행

```bash
npm run dev
```

접속 주소: `http://localhost:5173`

---

## 🧹 코드 정리

```bash
npm run format
```

---

## ✅ 코드 검사

| 명령어 | 설명 |
| :---: | :---: |
| `npm run lint` | 코드 규칙 검사 |
| `npm run format:check` | 코드 형식 검사 |

---

## 🏗 빌드

운영 환경에서는 `.env`의 `NODE_ENV`를 생략합니다.

```bash
npm run build
npm start
```

빌드 화면 미리보기

```bash
npm run preview
```

---

## 🔐 .env

`.env`는 공개하지 마세요.

```env
PORT=3000
NODE_ENV=development
MAINTENANCE=false
COOKIE_SECRET=YOUR_RANDOM_SECRET

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5173/api/04f8996d/google/callback

TTS=
STT=
GOOGLE_APPLICATION_CREDENTIALS=

VITE_GIPHY_API_KEY=

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:YOUR_EMAIL
```

### 서버

| 이름 | 설명 |
| :---: | :---: |
| `PORT` | 서버 포트 |
| `NODE_ENV` | 개발 `development`, 기본 `production` |
| `MAINTENANCE` | `true`이면 점검 활성화 |
| `COOKIE_SECRET` | 재시작 후에도 유지할 임의의 쿠키 서명 비밀값 |

### 로그인

| 이름 | 설명 |
| :---: | :---: |
| `GOOGLE_CLIENT_ID` | OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | 서버 전용 클라이언트 비밀값 |
| `GOOGLE_REDIRECT_URI` | 브라우저 접속 주소 기준 콜백 URL |

OAuth 설정에 동일한 콜백 URL을 등록합니다.

여러 주소 설정

```env
GOOGLE_REDIRECT_URI="http://localhost:5173/api/04f8996d/google/callback
https://example.com/api/04f8996d/google/callback"
```

### TTS

| 값 | 처리 방식 |
| :---: | :---: |
| 빈 값 | 일반 Google TTS |
| `login` | 기본 인증 정보를 사용하는 Cloud TTS |
| `json` | 서비스 계정 파일을 사용하는 Cloud TTS |

### STT

| 값 | 처리 방식 |
| :---: | :---: |
| 빈 값 | Cloud STT 비활성화 |
| `login` | 기본 인증 정보를 사용하는 Cloud STT |
| `json` | 서비스 계정 파일을 사용하는 Cloud STT |

### Cloud 인증

기본 인증

```bash
gcloud auth application-default login
```

서비스 계정 인증

```env
TTS=json
STT=json
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

인증 파일은 저장소 밖에 보관합니다.

### GIPHY

| 이름 | 설명 |
| :---: | :---: |
| `VITE_GIPHY_API_KEY` | 빌드에 포함되는 GIF 검색용 공개 키 |

### Web Push

| 이름 | 설명 |
| :---: | :---: |
| `VAPID_PUBLIC_KEY` | 공개 키 |
| `VAPID_PRIVATE_KEY` | 비밀 키 |
| `VAPID_SUBJECT` | 운영자 연락처 |

VAPID 키 생성

```bash
npx web-push generate-vapid-keys
```

---

## 🗃 SQLite

서버 실행 시 `db/index.js`에서 데이터베이스를 준비합니다.

| 경로 | 용도 |
| :---: | :---: |
| `data/service.db` | 서비스 데이터 |
| `data/evidence.db` | 탈퇴 후 신고, 제재 이력 |
| `data/evidence.key` | 보관 이력 식별 키 |
| `data/log/` | 날짜별 로그 |
| `data/upload/users/` | 프로필 이미지 |
| `data/upload/images/` | 첨부 이미지 |
| `data/upload/audio/` | 첨부 음성 |
| `data/tts/` | TTS 음원 |
| `data/stt/` | STT 처리 파일 |

파일 복사 백업은 서버를 중지한 뒤 `data/` 전체를 보관합니다.

---

## 📁 구조

| 경로 | 설명 |
| :---: | :---: |
| `config/` | 서버 설정 |
| `service/` | 서버 기능 |
| `db/` | 데이터베이스 초기화 |
| `router/` | API 경로 |
| `middleware/` | 공통 요청 처리 |
| `shared/` | 공용 코드 |
| `src/` | 화면 소스 |
| `src/js/common/` | 공용 화면 기능 |
| `locales/` | 다국어 문구 |
| `public/` | 정적 리소스 |
| `build/` | 빌드 도구 |
| `data/` | 실행 데이터 |
| `dist/` | 빌드 결과 |
| `server.js` | 서버 실행 |

---

## 📬 문의

기타 문의는 아래 연락처로 부탁드립니다.

- **이메일** [obabo0801@gmail.com](mailto:obabo0801@gmail.com)
- **디스코드** `unjongjjing`
