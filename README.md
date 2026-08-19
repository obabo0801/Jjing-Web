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

- Node.js, Express, Vite 웹 환경 구성
- 시스템, 밝은 화면, 어두운 화면 테마 지원
- 여러 언어를 사용할 수 있는 다국어 기능 추가
- PWA 설치 및 오프라인 사용 지원
- Push 알림과 백그라운드 동기화 기능 추가
- 관리자 알림 전송 기능 추가
- 사용자 접근 제한 기능 추가
- 서비스 점검 기능 추가
- 쿠키를 저장할 수 없는 환경의 이용 제한 처리
- 상황에 따라 특정 페이지가 표시되도록 처리
- 특정 페이지를 주소로 직접 열 수 없도록 제한
- Google TTS 및 Google Cloud TTS 지원
- Web Speech API 음성 인식 지원
- Google Cloud Speech STT 지원
- 여러 언어의 음성 명령과 키워드 인식 지원
- 기기에 맞는 음성 인식 방식 자동 선택
- HTML, JavaScript, CSS 및 정적 파일 해시 처리
- PC, 모바일, 웨어러블 기기 구분 기능 추가
- PWA 캐시 복구 및 오래된 파일 자동 정리
- 과도한 API 요청과 잘못된 Push 요청 제한
- 버튼 및 화면 요소 공통 아이콘 기능 추가
- 마우스 드래그 스크롤 지원
- 터치 및 마우스 스와이프 동작 지원
- 상하좌우 및 대각선 스와이프 방향 인식
- 화면 뒤로가기 동작 처리
- 스크롤 처음과 끝에서 진동 피드백 제공
- 버튼과 아이콘 스타일 공통화
- 페이지 파일을 src 폴더에 정리
- 점검 및 오프라인 화면 표시 방식 공통화
- Wearable 기기 인식 개선
- 원, 삼각형, 사각형 제스처 인식 기능 추가
- 터치 및 Shift + 마우스 제스처 지원
- TTS 방식 선택 및 자동 전환 기능 추가
- 마이크 입력 장치 확인 및 선택 기능 추가
- Prettier 코드 정리 환경 구성

</details>

---

## 📌 소개

이 프로젝트는 Node.js와 Express를 사용하는 서버와<br>
Vite를 사용하는 웹 화면으로 구성된 프로젝트입니다.

SQLite를 이용한 데이터 관리와 함께<br>
PWA, 사용자 접근 제한, 서비스 점검, 관리자 알림,<br>
TTS 및 음성 인식 기능을 제공합니다.

테마, 다국어, 소리, 저장소, 이벤트,<br>
기기 구분 등 여러 화면에서 함께 사용하는 기능은<br>
공통으로 사용할 수 있도록 나누어 관리합니다.

---

## ✨ 기능

### 🌐 화면 및 사용자 설정

- 시스템, 밝은 화면, 어두운 화면 테마 지원
- 운영체제 테마 변경 시 자동 반영
- 지원하는 언어 자동 확인
- 필요한 번역 내용만 서버에서 불러오기
- 번역 요청 정보 해시 처리
- 번역 응답 데이터 인코딩
- 테마와 언어 설정 저장
- Cookie 및 브라우저 저장소 관리
- 날짜, 숫자 등 표시 형식 공통 처리
- 데스크탑, 모바일, 웨어러블 기기 구분
- 세로 화면 및 터치 기기 상태 확인

### 🛡 서비스 이용 관리

- 사용자 접근 제한
- 서비스 점검 모드
- 쿠키를 저장할 수 없는 환경의 서비스 이용 제한
- 상황에 따라 특정 페이지 표시
- 특정 페이지의 주소 직접 접근 제한
- 존재하지 않는 주소에 오류 페이지 표시
- 사용자 확인 및 쿠키 처리
- 과도한 API 요청 제한

### 🔔 관리자 및 Push 알림

- 관리자 전용 페이지
- 관리자 알림 전송 기능
- Web Push 알림 지원
- Push 알림 구독 관리
- VAPID를 이용한 Push 알림
- VAPID가 설정된 경우에만 Push 기능 사용
- 잘못된 Push 구독 정보 확인
- 과도한 Push 요청 제한
- 알림 클릭 시 지정된 페이지로 이동

### 📱 PWA

- 앱처럼 설치하여 사용할 수 있는 PWA 지원
- Web App Manifest 구성
- Service Worker 구성
- 인터넷 연결이 없어도 일부 화면 사용 가능
- 오프라인 상태에서도 테마와 다국어 지원
- API 요청 시 인터넷 연결 우선 사용
- 네트워크 연결 실패 시 저장된 화면 사용
- 서버 오류 발생 시 오프라인 화면으로 복구
- 사용하지 않는 이전 캐시 파일 자동 삭제
- 백그라운드 동기화 지원
- PWA 등록에 실패해도 일반 웹 화면은 계속 실행

### 🔊 소리와 진동

- Web Audio를 이용한 소리 처리
- 비프음 생성
- MP3 음원 재생
- 여러 음원 동시 재생
- 시스템, 미디어, TTS 음량 조절
- 여러 진동 패턴 조합
- 여러 진동 요청을 함께 처리

### 🗣 TTS

- Google Cloud Text-to-Speech 지원
- 일반 Google TTS 지원
- gcloud CLI 인증 지원
- 서비스 계정 JSON 인증 지원
- Cloud 연결 실패 시 일반 TTS 사용
- 언어 설정
- 재생 속도 설정
- 음높이 설정
- 음성 종류 설정
- 음량 설정
- 생성된 MP3 음원 저장 및 재사용
- 같은 음원의 중복 생성 방지
- Cloud, 브라우저, 일반 Google TTS 선택 지원
- 사용 가능한 방식으로 자동 전환
- 과도한 TTS 요청 제한

### 🎙 STT

- Web Speech API 음성 인식
- Google Cloud Speech STT
- 브라우저 또는 서버 음성 인식 자동 선택
- 여러 언어의 음성 인식 지원
- 언어별 키워드 확인
- 인식된 문장을 이용한 명령 확인
- 음성 인식 정확도에 따른 명령 처리
- 음성 주파수 분석
- low, mid, high 음역 구분
- 무음 구간 자동 감지
- 사용하는 기기에 맞는 처리 방식 자동 선택
- 사용 가능한 마이크 확인
- 마이크 입력 장치 선택

### 🛠 빌드와 파일 처리

- JavaScript 빌드 파일 이름 해시 처리
- CSS 빌드 파일 이름 해시 처리
- 이미지 및 정적 파일 이름 해시 처리
- HTML 파일 이름 해시 처리
- 페이지 정보 파일 해시 처리
- HTML `data-*` 속성 해시 처리
- JavaScript `data-*` 속성 해시 처리
- CSS `data-*` 속성 해시 처리
- 변경된 HTML 파일 이름을 서버에서 자동 연결
- 필요한 시점에 페이지 정보 불러오기
- 정적 파일 직접 접근 제한
- HTML 파일 직접 접근 제한
- `.env`에 설정된 포트와 Vite 개발 서버 자동 연결

---

## 🛠 개발 환경

- Node.js 24.19.0
- ES Modules
- Express 5.2.1
- Vite 8.2.1
- SQLite3 6.0.1
- Google Cloud Speech 8.0.1
- Google Cloud Text-to-Speech 7.0.0
- web-push 3.6.7
- cookie-parser 1.4.7
- dotenv 17.4.2
- Prettier 3.9.6

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
SERVER_ENV=development
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
- 🔹 `SERVER_ENV` 서버 실행 환경
- 🔹 `MAINTENANCE` 서비스 점검 모드
- 🔹 `COOKIE_SECRET` 쿠키 보호

개발 환경 예시

```env
SERVER_ENV=development
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
