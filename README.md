<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green">
  <img src="https://img.shields.io/badge/node.js-24.19.0-brightgreen">
  <img src="https://img.shields.io/badge/version-v1.0.0-blue">
</p>

<h1 align="center">
🐶 Jjing Web
</h1>

<p align="center">
    <img src="https://github.com/user-attachments/assets/c4f849a2-839f-4ec1-9f3c-2b837e8518f7" width="16%">
</p>



<p align="center">
  <strong>Node.js</strong>
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

- Node.js, Express, Vite 웹 서비스 구성
- 테마와 다국어 화면 지원
- PWA 설치, 오프라인 사용, 백그라운드 동기화 지원
- 사용자 접근 제한과 서비스 점검 기능 추가
- Push 알림 전송 및 구독 관리 지원
- Google TTS와 브라우저·Google Cloud STT 지원
- 소리, 진동, 음량 조절 기능 추가
- 대화상자, 로딩, 진행 표시 등 공통 화면 기능 추가
- 터치·마우스 스와이프와 제스처 동작 지원
- 오류, 오프라인, 점검 상태 화면 및 복구 동작 개선
- HTML, JavaScript, CSS 등 빌드 파일 보호 및 자동 연결
- SQLite 데이터 관리와 API 요청 제한 적용
- ESLint와 Prettier 코드 정리 환경 구성
- 작은 안내창과 옆·아래에서 열리는 화면 기능 추가
- 숫자 키패드, 선택 버튼, 도움말 표시 기능 추가

</details>

---

## 📌 소개

이 프로젝트는 Node.js와 Express를 사용하는 서버와<br>
Vite를 사용하는 웹 화면으로 구성된 프로젝트입니다.

SQLite를 이용한 데이터 관리와 함께<br>
PWA, 사용자 접근 제한, 서비스 점검, Push 알림,<br>
TTS 및 음성 인식 기능을 제공합니다.

테마, 다국어, 소리, 저장소, 이벤트,<br>
기기 구분 등 여러 화면에서 함께 사용하는 기능은<br>
공통으로 사용할 수 있도록 나누어 관리합니다.

---

## ✨ 기능

### 🌐 화면 및 사용자 설정

- 시스템, 밝은 화면, 어두운 화면 테마 지원
- 사용 환경에 맞는 언어와 테마 자동 적용
- 쿠키와 브라우저 저장 데이터 확인 및 삭제
- 모바일과 터치 화면에 맞는 동작 지원
- 확인창과 화면 위에 표시되는 작은 안내창 지원
- 화면 옆에서 열리는 메뉴와 아래에서 열리는 화면 지원
- 숫자 키패드와 하나 또는 여러 항목 선택 기능 제공
- 버튼과 아이콘의 기능을 알려주는 도움말 표시
- 로딩 및 진행 상태 표시

### 🛡 서비스 이용 관리

- 사용자 확인 및 접근 제한
- 서비스 점검 모드
- 주소 직접 접근과 과도한 API 요청 제한
- 오류, 오프라인, 점검 상황에 맞는 화면 표시
- 다시 시도 및 홈 이동 기능 제공

### 🔔 알림

- 제목, 내용, 이미지, 주소 지정하여 알림 전송
- 차단된 사용자 제외
- 사용할 수 없는 구독 정보 자동 정리
- 알림을 누르면 지정된 화면으로 이동

### 📱 PWA

- 앱처럼 설치하여 사용할 수 있는 PWA 지원
- 인터넷 연결이 없어도 일부 화면 사용 가능
- 서버 오류 시 오프라인 화면으로 복구
- 백그라운드 동기화 및 오래된 캐시 자동 정리
- PWA 등록에 실패해도 일반 웹 화면은 계속 사용

### 🔊 소리와 진동

- 비프음, 효과음, 배경음 재생
- 여러 음원의 동시 및 반복 재생
- 전체, 미디어, 알림, 음성, 시스템 음량 조절
- 효과음과 진동 사용 설정

### 🗣 TTS

- 일반 Google TTS와 Google Cloud TTS 지원
- Cloud 연결 실패 시 사용 가능한 방식으로 전환
- 언어, 재생 속도, 음높이, 음성, 음량 설정
- 생성된 MP3 음원 저장 및 재사용
- 과도한 TTS 요청 제한

### 🎙 STT

- Web Speech API 와 Google Cloud Speech STT 지원
- 브라우저 또는 서버 음성 인식 자동 선택
- 다국어 음성 명령과 키워드 인식
- 무음 구간 감지 및 음성 신호 분석
- 사용 가능한 마이크 확인 및 선택

### 🛠 빌드와 파일 처리

- HTML, JavaScript, CSS, 이미지 등 빌드 파일 해시 처리
- HTML, JavaScript, CSS의 `data-*` 속성 해시 처리
- 변경된 페이지 파일을 서버에서 자동 연결
- 필요한 시점에만 페이지 정보 불러오기
- 소스 파일과 HTML 파일의 직접 접근 제한
- Vite 개발 서버와 API 서버 자동 연결

---

## 🛠 개발 환경

- Node.js 24
- npm 12
- ES Modules
- Express 5
- Vite 8
- SQLite3 6
- Google Cloud Speech
- Text-to-Speech
- Web Push
- ESLint 10
- Prettier 3

---

## 🚀 설치


```bash
git clone git@github.com:obabo0801/Jjing-Web.git
cd Jjing-Web
npm install
```

---

## 🖥 개발 실행

Express 서버를 실행

```bash
npm start
```

다른 터미널에서 Vite 를 실행

```bash
npm run dev
```

## 🧹 코드 정리

```bash
npm run format
```

코드 문제를 자동으로 확인한 뒤<br>
전체 코드 형식을 일정하게 정리

---

## 🏗 빌드 및 실행

```bash
npm run build
npm start
```

Vite 미리보기는 다음 명령을 사용

```bash
npm run preview
```

---

## 🔐 .env

`.env` 는 절대 공개 금지

```env
PORT=3000
MAINTENANCE=false
COOKIE_SECRET=

TTS=
STT=
GOOGLE_APPLICATION_CREDENTIALS=

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:YOUR_EMAIL
```

### 서버

- 🔹 `PORT` 서버에서 사용할 포트
- 🔹 `MAINTENANCE` 서비스 점검 모드
- 🔹 `COOKIE_SECRET` 쿠키 보호

개발 환경 예시

```env
MAINTENANCE=false
```

서비스 점검을 활성화하려면<br>
다음과 같이 설정

```env
MAINTENANCE=true
```

사용자 쿠키를 안전하게 보호하려면<br>
충분히 긴 임의의 값을 설정

```env
COOKIE_SECRET=YOUR_SECRET
```

설정하지 않으면 서명되지 않은<br>
일반 쿠키를 사용

### TTS

일반 Google TTS를 사용하려면<br>
`TTS`를 비우기

```env
TTS=
```

Google Cloud TTS에서 gcloud CLI 인증을<br>
사용하려면 다음과 같이 설정

```env
TTS=login
```

서비스 계정 JSON 인증:

```env
TTS=json
GOOGLE_APPLICATION_CREDENTIALS=./json
```

Cloud TTS 연결에 실패하면<br>
일반 Google TTS로 자동 전환

### STT

브라우저에서 지원하는 경우<br>
Web Speech API를 사용

Google Cloud Speech를 사용하려면<br>
`STT` 환경 변수를 설정

gcloud CLI 인증:

```env
STT=login
```

서비스 계정 JSON 인증:

```env
STT=json
GOOGLE_APPLICATION_CREDENTIALS=./json
```

`STT`를 비워두면 Google Cloud Speech는<br>
활성화되지 않음

### Web Push

Web Push를 사용하려면 다음 값을 설정

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:YOUR_EMAIL
```

VAPID 설정은 선택 사항

세 항목이 모두 설정된 경우에만<br>
Web Push 기능이 활성화

VAPID 키는 다음 명령으로 생성

```bash
npx web-push generate-vapid-keys
```

---

## 🗃 SQLite

SQLite는 서비스에서 사용하는 정보와<br>
상태 데이터를 저장하는 데 사용

서버를 실행하면 필요한 데이터베이스와<br>
데이터 파일이 자동으로 준비

`data` 폴더는 Git에 포함되지 않음

---

## 📁 구조

| 폴더명 | 설명 | 비고 |
| :--- | :--- | :--- |
| **`config/`** | 서버와 서비스 설정 | 환경 변수 및 공통 설정 |
| **`locales/`** | 여러 언어의 번역 내용 | 언어별 번역 파일 |
| **`middleware/`** | 요청 확인 및 접근 처리 | 사용자 및 페이지 접근 관리 |
| **`public/`** | 그대로 제공되는 파일 | PWA 파일 및 아이콘 |
| **`router/`** | 서버 요청 연결 | API와 페이지 요청 처리 |
| **`src/`** | 웹 화면 소스 | HTML, JavaScript, CSS |
| **`data/`** | 실행 중 생성되는 데이터 | 서비스 데이터 |

---

## 📬 문의

기타 문의는 아래 연락처로 부탁드립니다.

- **이메일** [obabo0801@gmail.com](mailto:obabo0801@gmail.com)
- **디스코드** `unjongjjing`
