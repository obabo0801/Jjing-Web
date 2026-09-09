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
- HTML, JavaScript, CSS 등 빌드 파일 해시 처리 및 자동 연결
- SQLite 데이터 관리와 API 요청 제한 적용
- ESLint와 Prettier 코드 정리 환경 구성
- 작은 안내창과 옆·아래에서 열리는 화면 기능 추가
- 숫자 키패드, 선택 버튼, 도움말 표시 기능 추가
- 사용자 프로필과 최초 설정 기능 추가
- 프로필 이미지 선택, 편집 및 휴대폰 등록 기능 추가
- 채팅 화면과 음성 입력 기능 추가
- 사용자 온라인, 자리 비움, 오프라인 상태 표시 기능 추가
- 채팅에서 사용자 프로필 확인 및 관리 기능 추가
- 아바타, 선택 메뉴, 토스트 등 공통 화면 기능 확장
- 프로필 이미지 이동, 확대, 회전 및 자르기 기능 개선
- GIF 등 움직이는 프로필 이미지 처리 지원
- 모바일과 터치 환경의 이미지 편집 동작 개선
- 이미지 보기 및 확대 기능 추가
- PWA와 공통 화면 동작 안정성 개선
- 관리자 권한 부여 및 해제 기능 추가
- 사용자 차단 해제와 차단 상태 표시 기능 추가
- 첫 방문 안내와 프로필 설정 흐름 정리
- 화면 공간과 기기에 맞는 선택 목록 표시 지원
- Enter 키를 이용한 입력칸 이동 및 확인 지원
- 쿠키 보호 설정과 사용자 확인 절차 강화
- 알림, 동기화, 저장 데이터 삭제의 오류 처리 보완
- 서버 구조 정리 및 주요 기능 자동 테스트 추가

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
- 첫 이용 시 닉네임과 프로필 설정
- 닉네임 사용 가능 여부 확인
- 프로필 이미지 선택, 이동, 확대, 회전 및 자르기
- GIF 등 움직이는 프로필 이미지 지원
- 휴대폰을 이용한 프로필 이미지 등록
- 이미지 확대 및 보기 기능 지원
- 처음 방문한 사용자를 위한 시작 안내
- 화면 공간에 맞춰 위나 아래로 열리는 선택 목록
- 웨어러블에서 선택 목록을 전체 화면으로 표시
- 입력창에서 Enter 키로 다음 항목 이동 또는 확인

### 💬 채팅 및 프로필

- 스트림과 메신저 형태의 채팅 화면 지원
- 일반 입력과 음성 입력으로 메시지 작성
- 같은 사용자의 연속 메시지를 묶어서 표시
- 사용자 프로필 확인
- 온라인, 자리 비움, 오프라인 상태 표시
- 최신 메시지로 빠르게 이동

### 🛡 서비스 이용 관리

- 사용자 확인 및 접근 제한
- 서비스 점검 모드
- 주소 직접 접근과 과도한 API 요청 제한
- 오류, 오프라인, 점검 상황에 맞는 화면 표시
- 다시 시도 및 홈 이동 기능 제공
- 권한에 따라 사용할 수 있는 관리 기능 구분
- 최상위 관리자의 관리자 권한 부여 및 해제
- 사용자 차단 및 차단 해제
- 차단 상태에 맞는 관리 메뉴 표시

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
- 업로드 이미지 크기 조절 및 형식 변환
- 큰 이미지와 과도한 애니메이션 이미지 처리 제한

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
- Sharp
- QRCode

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

## ✅ 코드 검사 및 테스트

| 명령어 | 설명 |
| :--- | :--- |
| `npm run lint` | 코드 오류 확인 |
| `npm run format:check` | 코드 형식 확인 |
| `npm test` | 주요 기능 자동 테스트 |
| `npm run check` | 코드 검사 후 자동 테스트 실행 |

위 명령은 소스 코드를 자동으로 수정하지 않습니다.

코드 형식 검사까지 하려면<br>
`npm run format:check`를 별도로 실행합니다.

테스트 범위와 확인 방법은<br>
`test/README.md`에서 확인할 수 있습니다.

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

- 🔹 `PORT`
서버에서 사용할 포트  
- 🔹 `NODE_ENV`  
실행 환경. 생략하면 `production`  
로컬 HTTP 개발은 `development`  
- 🔹 `MAINTENANCE`  
서비스 점검 모드  
- 🔹 `COOKIE_SECRET`  
사용자 쿠키 서명에 사용하는 필수 비밀값  

운영 환경에서는 `NODE_ENV`를 생략합니다.<br>
서버와 Vite 배포 빌드의 기본값이 모두 `production`이므로<br>
공용 `.env`에 `NODE_ENV=production`을<br>
넣어 발생하는 Vite 경고를 피할 수 있습니다.

개발 환경 예시

```env
NODE_ENV=development
MAINTENANCE=false
```

서비스 점검을 활성화하려면<br>
다음과 같이 설정

```env
MAINTENANCE=true
```

사용자 쿠키를 안전하게 보호하려면<br>
최소 32바이트의 충분히 긴 임의의 값을<br>
생성해 설정하고, 재시작해도 유지

```env
COOKIE_SECRET=YOUR_SECRET
```

비어 있으면 DB 초기화 전에 서버 시작을 중단합니다.<br>
운영 환경에서는 HTTPS와 Secure 쿠키를 사용합니다.

기존 secret을 유지하면<br>
정상 서명된 사용자 쿠키도 유지됩니다.<br>
secret을 변경하거나 쿠키를 삭제하면<br>
기존 프로필을 자동 복원하지 않습니다.<br>
서명 없는 쿠키는 신원으로 사용하지 않으며,<br>
같은 IP라도 새 사용자로 시작합니다.<br>
IP는 접속 기록·요청 제한·차단 판단에만<br>
사용합니다.

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

DB 시작 순서는 `db/index.js`에서 확인합니다.

- `db/connect.js`:<br>
  SQLite 연결, 대기 시간,<br>
  `get`·`run`·`all`·`exec` 도우미
- `db/schema.js`:<br>
  신규 테이블과 인덱스 정의
- `db/migrate.js`:<br>
  기존 DB의 누락 열 보정,<br>
  역할 확장과 백업, 차단된 관리자 권한 회수

서버 코드는 `#db`에서<br>
`get`·`run`·`all`을 가져옵니다.<br>
`#db`는 WAL 설정과 스키마·기존 DB 보정을<br>
마친 뒤 사용할 수 있습니다.<br>
저장 위치는 기존 `data/service.db`이며,<br>
역할 제약을 확장할 때의 백업은<br>
`data/service-role-시간값.db`입니다.<br>
관리 작업의 독립 트랜잭션(`service/manage.js`)과<br>
날짜별 로그 DB(`service/log/index.js`)는<br>
별도로 유지합니다.

---

## 📁 구조

| 폴더명 | 설명 | 비고 |
| :--- | :--- | :--- |
| **`config/`** | 서버 설정과<br>기반 도우미 | 환경·경로·hash·HTML 매핑,<br>UID·IP·접속 환경 판독 |
| **`service/`** | 서버 기능 실행 | 이미지, 관리, 실시간 접속,<br>음성, 알림, 번역, 로그 |
| **`db/`** | 서비스 DB 준비와<br>쿼리 실행 | 연결, 스키마, 기존 DB 보정 |
| **`shared/`** | 서버·브라우저<br>공용 규칙 | 문자열 도우미, 권한, API 경로,<br>동의 버전, 업로드 제한 |
| **`build/`** | Vite 전용 코드 | data-\*·HTML 변환,<br>빌드 입출력, 개발 프록시 |
| **`locales/`** | 여러 언어의 번역 내용 | 언어별 번역 파일 |
| **`middleware/`** | 요청 확인 및 접근 처리 | 사용자 및 페이지 접근 관리 |
| **`public/`** | 그대로 제공되는 파일 | PWA 파일 및 아이콘 |
| **`router/`** | 서버 요청 연결 | API와 페이지 요청 처리 |
| **`src/`** | 웹 화면 소스 | HTML, JavaScript, CSS |
| **`data/`** | 실행 중 생성되는 데이터 | 데이터 및 업로드 관리 |

`#shared/*`는 서버와 브라우저가 함께 사용하며,<br>
DOM·Node 전용 API에 의존하지 않습니다.<br>
`#build/*`는 Vite에서만 사용합니다.<br>
`config/html.js`는 서버와 빌드가 공유하는<br>
HTML 매핑 파일명 설정입니다.<br>
공용 규칙은 `shared`, 빌드 방식은 `build`,<br>
페이지의 실행 순서는<br>
`src/js`의 각 진입점에서 확인합니다.

### 브라우저 초기화와 DOM 적용

각 HTML이 불러오는 `src/js`의 진입점에서<br>
`#src/init`을 호출합니다.<br>
`init()`은 로딩 표시를 만들고<br>
장치·테마·공통 이벤트를 준비한 뒤<br>
최초 `mount()`를 실행합니다.<br>
같은 페이지에서 다시 호출해도 중복 실행하지 않으며,<br>
반환된 로딩 요소를 제거하는 시점은<br>
각 진입점이 결정합니다.

| 새로 추가하는 처리 | 위치와 기준 |
| :--- | :--- |
| 페이지 공통 시작 작업,<br>document·window의 공통 이벤트 등록 | `src/js/init.js`에서<br>한 번 호출 |
| select·stepper·toggle·<br>picker·keypad의 공통 이벤트 | 각 모듈의 `listen()`을<br>`init`에서 호출 |
| 새 DOM의 요소 생성·이벤트 연결·<br>표시값 준비 | `src/js/common/mount.js`에서<br>컴포넌트에 `root` 전달 |
| 로그인 확인·프로필 설정·<br>페이지별 요청과 화면 연결 | `script.js`, `admin.js` 등<br>해당 진입점 |

레이어를 열거나 내용을 교체할 때는<br>
`init()`이 아니라 `mount(content)`를 사용합니다.<br>
`mount`는 전달한 요소 자체와<br>
내부 요소를 함께 처리합니다.<br>
DOM 전체를 다시 찾지 않으며,<br>
중복 생성·이벤트 연결은 각 컴포넌트의<br>
기존 `WeakSet`·`WeakMap` 등으로 막습니다.<br>
요소별 관찰·크기 측정처럼<br>
해당 요소가 있어야 가능한 처리는<br>
컴포넌트에 남깁니다.<br>
`mount` 전체를 한 번만 실행하도록 막으면<br>
나중에 추가된 요소를 놓치므로 그렇게 하지 않습니다.<br>
아이콘의 DOM 감시와 번역 처리,<br>
테마 선택 UI의 구성은 기존 방식을 유지합니다.<br>
`common`에서 상위 초기화 코드나<br>
`ui`를 다시 import하지 않습니다.

`select`의 기본 메뉴는 버튼 기준으로 떠서 표시하며<br>
주변 배치를 바꾸지 않습니다.<br>
바깥 `.select`에 `data-expand`를 붙이면<br>
기존처럼 내부에서 펼쳐집니다.<br>
wearable에서는 `data-expand` 여부와 관계없이<br>
전체화면으로 열고, 왼쪽 스와이프로 닫습니다.<br>
값과 `input`·`change` 이벤트는<br>
원본 `<select>`를 사용합니다.

### 빌드와 hash를 찾는 기준

개발은 `HTML → src/js 진입점`으로 실행하고<br>
`/api`·업로드 요청만 `build/proxy.js`를 통해<br>
Express로 전달합니다.<br>
배포는 `vite.config.js`<br>
`→ build/output.js의 HTML 목록`<br>
`→ data-* 변환·Vite 번들`<br>
`→ build/html.js의 HTML 이름 변경·매핑 생성`<br>
순서입니다.<br>
서버는 `config/pages.js`에서 매핑을 한 번 읽고<br>
`middleware/page.js`에서 해당 HTML을 보냅니다.<br>
다시 빌드해 배포했다면 서버도 재시작해야<br>
새 매핑을 읽습니다.

| 대상 | 수정할 위치 | 정리 기준 |
| :--- | :--- | :--- |
| JS·CSS·이미지<br>자산 파일명 | `build/output.js` | 유지: Vite의 내용 기반 파일명과<br>장기 캐시 연결 |
| HTML 파일명·<br>페이지 매핑 | `build/html.js`,<br>`config/html.js`,<br>`config/pages.js` | 유지: 서버의 페이지 연결 방식과<br>함께 사용 |
| HTML·JS·CSS의<br>`data-*` | `build/data.js` | 단순화 고려: 정규식이<br>문자열·속성명 전체를 바꾸므로<br>세 형식의 일치 검증 필요 |
| API 접두사·응답 키 | `shared/route.js` | 유지: 빌드 때 생성하지 않는<br>고정 통신 규칙 |
| 업로드 경로 | `config/media.js` | 유지: 이전 경로와<br>현재 URL의 호환 처리 포함 |
| 번역 키·언어 파일명 | `router/i18n.js`,<br>`src/js/common/i18n.js` | 단순화 고려: 빌드가 아닌<br>요청 시 hash 처리 |

hash와 Base64는 접근 권한을 대신하지 않습니다.<br>
서버 권한·쿠키·요청 검증은 별도로 유지합니다.<br>
현재 단계에서는<br>
기존 URL·hash 값·응답 형식을 바꾸지 않습니다.<br>
Node의 SHA-256은 `config/hash.js`를 사용하고<br>
브라우저 번역 키는 Web Crypto를 사용합니다.<br>
두 환경을 억지로 하나의 모듈로 합치지 않습니다.<br>
`public/service-work.js`와<br>
`public/manifest.json`은 위 변환을 거치지 않고<br>
그대로 복사됩니다.<br>
개발 서버 프록시나 Vite preview는<br>
Express의 권한·페이지 라우팅 검증을<br>
대신하지 않습니다.

### CSS를 찾는 기준

각 HTML은 `src/css/style.css` 다음에<br>
필요한 페이지 CSS를 연결합니다.

| 수정할 화면 | 위치 |
| :--- | :--- |
| 테마·기본 요소·동적으로 열리는<br>공통 컴포넌트 | `src/css/common/`<br>(`style.css`에서 순서대로 로드) |
| 메인 화면·첫 방문 안내 | `src/css/index.css` |
| QR 링크로 접속한<br>이미지 업로드 페이지 | `src/css/image.css` |
| 이용약관·개인정보 처리방침 | `src/css/legal.css` |
| 오류·오프라인·차단·점검 안내 | `src/css/state.css` |

`common/image.css`는 이미지 선택·조절·뷰어,<br>
`common/setup.css`는<br>
공용 프로필 생성·동의·확인 화면입니다.<br>
페이지 전용 CSS와 구분합니다.<br>
공통 CSS의 import 순서는<br>
레이어·group 등의 덮어쓰기 순서이므로<br>
이름순으로 재정렬하지 않습니다.<br>
JS가 나중에 만드는 DOM과 사용 예정 컴포넌트도 있어<br>
HTML에 없다는 이유만으로<br>
selector를 삭제하지 않습니다.

### PWA와 알림

| 수정할 처리 | 위치 |
| :--- | :--- |
| Worker 등록, 설치·온라인 이벤트,<br>전면 알림 toast 연결 | `src/js/pwa.js` |
| 알림 지원 여부·권한·구독 확인·<br>구독·해제, 직접 알림 표시 | `src/js/common/push.js` |
| 실패한 API 요청 저장,<br>Background Sync 또는 메시지 요청 | `src/js/common/sync.js` |
| 오프라인 응답·캐시 준비, 큐 재전송,<br>Push 수신·알림 클릭 | `public/service-work.js` |

페이지는 `pwa.load()`로 등록 정보를 받고<br>
`push(enable, registration)`에 전달합니다.<br>
공용 Push 코드는<br>
상위 `pwa.js`를 import하지 않습니다.<br>
사용 예정 API인 `pwa.notify()`와 `pwa.sync()`는<br>
같은 호출 방식으로 유지하며<br>
각각 공용 모듈의 함수를 내보냅니다.

`notify()`는 활성 Worker와 알림 권한이 없거나<br>
표시가 실패하면 `false`를 반환합니다.<br>
Worker 준비를 무기한 기다리지는 않습니다.<br>
`sync()`는 직접 처리한 요청의 Response를 반환하고,<br>
네트워크 오류·5xx 응답으로 큐에 저장한 요청은<br>
`null`을 반환합니다.<br>
큐 저장 실패는 오류로 전달하며,<br>
Worker 미준비·동기화 예약 실패만으로<br>
저장한 요청을 다시 추가하지 않습니다.<br>
남은 큐는 이후 동기화 이벤트나<br>
메시지에서 처리합니다.<br>
Worker 안에서 겹친 동기화는 같은 작업을 공유합니다.<br>
서버 처리 후 응답이 유실되거나<br>
Worker가 종료되는 경우까지<br>
정확히 한 번의 처리를 보장하지는 않으므로,<br>
중복 처리가 위험한 API에 연결할 때는<br>
서버의 요청 식별·중복 방지도 필요합니다.

Worker는 기존 classic script와<br>
`/service-work.js`, 범위 `/`를 유지합니다.<br>
IndexedDB는 `sync` 버전 `1`의 `requests`,<br>
캐시는 `offline`, 재전송 태그는 `api-sync`입니다.<br>
페이지에서 `offline`·`sync` 메시지를 보내고<br>
Worker는 `notify` 메시지를 보냅니다.<br>
이 이름과 큐 데이터 형식은<br>
양쪽 코드가 함께 사용하는 규칙입니다.<br>
Worker는 Vite 모듈과 별도로 제공되므로<br>
`#common/*`를 import하지 않습니다.<br>
IndexedDB 열기 코드의 중복을 없애기 위해<br>
Worker 형식이나 배포 경로를 바꾸지는 않았습니다.

### 서버 기능을 찾는 기준

기본 요청 흐름은<br>
`server.js → middleware → router`<br>
`→ service → DB·파일·외부 API`입니다.<br>
라우터의 단순 조회·저장은<br>
기존처럼 `#db`를 바로 사용합니다.<br>
별도의 서비스 wrapper를 추가하지 않습니다.<br>
`service`는 `#service/*`로 가져오며,<br>
라우터·미들웨어·화면 코드를<br>
다시 import하지 않습니다.

| 수정할 기능 | 실행 코드 |
| :--- | :--- |
| 이미지 변환·<br>원본과 축소본 저장 | `service/image.js` |
| 프로필 이미지 QR 링크<br>생성·만료 | `service/profile.js` |
| 관리자 권한·차단·차단 해제 | `service/manage.js` |
| SSE 전송·접속 상태 | `service/events.js` |
| 음성 합성·캐시 | `service/tts.js` |
| 음성 인식 / 녹음 파일 저장 | `service/speech.js` /<br>`service/stt.js` |
| Firebase / 브라우저 푸시 연동 | `service/fcm.js` /<br>`service/push.js` |
| 번역 파일 로딩 | `service/locale.js` |
| 날짜별 로그 연결 / 기록·조회 | `service/log/index.js` /<br>`service/log/` 내부 파일 |

`#service/log`는 로그 폴더의<br>
`index.js`를 가리킵니다.<br>
실제 로그 저장 위치는 기존 `data/log/` 그대로입니다.<br>
요청·응답 형식은 `router`,<br>
실제 처리 방식은 위 표의 `service`,<br>
저장 구조는 `db`에서 확인합니다.

---

## 📬 문의

기타 문의는 아래 연락처로 부탁드립니다.

- **이메일** [obabo0801@gmail.com](mailto:obabo0801@gmail.com)
- **디스코드** `unjongjjing`
