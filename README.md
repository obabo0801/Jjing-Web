<p align="center">
  <img src="https://img.shields.io/badge/node.js-24%2B-brightgreen" alt="Node.js 24 이상">
  <img src="https://img.shields.io/badge/version-v1.0.0-blue" alt="Version 1.0.0">
</p>

<h1 align="center">
🐶 oanismajor
</h1>

<p align="center">
  <img src="https://github.com/user-attachments/assets/c4f849a2-839f-4ec1-9f3c-2b837e8518f7" width="16%" alt="oanismajor">
</p>

<p align="center">
  <strong>Node.js oanismajor</strong>
</p>

<p align="center">
  <a href="https://github.com/obabo0801/Oanismajor/archive/refs/heads/main.zip">
    <img src="https://img.shields.io/badge/Download-ZIP-blue?style=for-the-badge" alt="Download ZIP">
  </a>
</p>

```bash
git@github.com:obabo0801/Oanismajor.git
```

---

<details>
<summary>❗ 업데이트 내역</summary>

## ❗ 버전 1.0.0

- 채팅, 메신저, 문의하기 추가
- 로그인, 프로필, 사용자 관리 추가
- 이미지, 음성, 알림 지원
- 데스크탑, 모바일, 웨어러블 대응
- WAS, WEB, DB 분리
- 설치 도구, 서버 증설 지원

</details>

---

## 📌 소개

Node.js 웹 프로젝트입니다.

채팅, 음성, 알림, 사용자 관리 기능을 제공합니다.<br>
데스크탑, 모바일, 웨어러블 화면에 대응합니다.

---

## ✨ 기능

| 구분 | 기능 |
| :---: | :---: |
| 화면 | 테마, 다국어<br>이미지 뷰어, 공용 UI |
| 사용자 | 로그인, 프로필 편집<br>접속 상태, 계정 삭제 |
| 채팅 | 공개 채팅방, 메신저<br>첨부파일, 링크 미리보기 |
| 문의 | 접수, 담당자 배정, 내역 조회, 종료 |
| 관리 | 사용자 검색, 신고, 제재<br>DB, 업로드 관리 |
| 알림 | 화면 알림, Web Push, 수신 기기 선택 |
| 음성 | 음성 입력, TTS, STT, 오디오 재생 |
| PWA | 앱 설치, 오프라인 안내, 캐시 관리 |
| 파일 | 이미지 변환, 크기 조절, 빌드 해시 처리 |

공개 채팅방 목록은 `/`, 방 주소는 `/rooms/:id`입니다.
방 이름을 바꿔도 UUID 주소는 유지됩니다.

관리자에서 방 생성, 정보 수정, 상태 변경을 할 수 있습니다.

| 상태 | 접근 | 메시지 작성 |
| :---: | :---: | :---: |
| 사용 중 | 누구나 | 가능 |
| 읽기 전용 | 누구나 | 불가 |
| 보관 | 관리자 | 불가 |

방 삭제는 보관으로 처리하며 메시지를 유지합니다.
기존 공개 메시지는 서버 시작 시 기본 방으로 이동합니다.
메신저 데이터는 유지하며 화면 주소는 `/messages/rooms/:id`입니다.

---

## 🛠 개발 환경

- Node.js 24 이상
- npm
- ES Modules
- Express 5
- Vite 8
- PostgreSQL 18
- Google Cloud Speech
- Text-to-Speech
- Web Push
- ESLint 10
- Prettier 3
- Sharp
- QRCode

---

## 🚀 설치

### Windows 11

`oanismajor.bat`을 실행합니다.

처음 실행하면 서버를 설치하고,<br>
이후에는 서버 관리 CLI를 실행합니다.

WAS, WEB, DB를 함께 설치합니다.<br>
최초 설정에서 새 서버 구성 또는 기존 서버 연결을 선택합니다.<br>
설치 후 `1. 시작`에서 전체, WAS, WEB, DB를 선택합니다.

① WSL 설치 시 재부팅 후 다시 실행합니다.<br>
② Tailscale에 로그인합니다.<br>
③ 기본 서버는 HTTPS 정보를 입력합니다.<br>
④ 추가 서버는 기본 서버의 Tailscale IP를 입력합니다.

설정과 기존 운영 데이터는 유지됩니다.

| 명령어 | 용도 |
| :---: | :---: |
| `.\oanismajor.bat` | 초기 설치와 메뉴 |
| `.\start.bat` | 시작 |
| `.\stop.bat was` | WAS 정지 |
| `.\restart.bat web` | WEB 재시작 |
| `.\status.bat` | 상태 |
| `.\logs.bat` | 로그 |
| `.\update.bat` | 업데이트 |

### 서버 관리

`oanismajor.bat` 또는 `sudo bash oanismajor.sh`로 메뉴를 엽니다.

| 명령어 | 기능 |
| :---: | :--- |
| `1` | 시작 |
| `2` | 정지 |
| `3` | 재시작 |
| `4` | 새로고침 |
| `5` | 로그 |
| `6` | 업데이트 |
| `7` | 설정 |
| `0` | 종료 |

첫 실행에서는 시스템 언어를 사용합니다.<br>
설정에서 자동, 한국어, English를 선택합니다.<br>
선택한 언어는 `local.json`의 `lang`에 저장됩니다.

`uninstall.bat` 또는 `sudo bash uninstall.sh`로 제거합니다.<br>
DB, 업로드, 설정, 인증서는 유지됩니다.

### 추가 서버 준비

- 기본 서버를 켜둡니다.
- 같은 소스 버전과 Tailscale 계정을 사용합니다.
- 기본 서버의 운영 `.env`를 프로젝트 루트에 복사합니다.
- 기본 서버의 `web/dist`를 같은 위치에 복사합니다.
- `local.json`, `node_modules`, `storage`는 복사하지 않습니다.
- 음성 기능을 사용할 WAS에는 Cloud 인증 파일도 준비합니다.

기본 서버의 운영 파일은 탐색기에서 확인할 수 있습니다.

```text
\\wsl.localhost\Ubuntu\srv\oanismajor
```

DB 복제본에는 기본 서버의 `REPLICATION_URL`이 필요합니다.

### Ubuntu

Tailscale에 로그인한 뒤 실행합니다.

```bash
sudo bash oanismajor.sh
```

개별 실행도 같은 이름의 `.sh` 파일을 사용합니다.

```bash
sudo bash start.sh
sudo bash stop.sh was
sudo bash restart.sh web
sudo bash status.sh
sudo bash logs.sh
sudo bash update.sh
```

<details>
<summary>추가 WAS 설정 예시</summary>

`local.json`의 주소를 실제 Tailscale IP로 바꿉니다.<br>
`100.64.0.1`은 기본 서버, `100.64.0.2`는 추가 서버입니다.

```json
{
  "was": [3001],
  "web": [],
  "db": [],
  "https": null,
  "cluster": {
    "address": "100.64.0.2",
    "network": "100.64.0.0/10",
    "storage": "100.64.0.1:/srv/oanismajor/storage"
  }
}
```

`DATABASE_URL`은 기본 서버의 DB를 가리킵니다.<br>
`COOKIE_SECRET`, 로그인 설정, 푸시 키는 서버마다 동일하게 사용합니다.<br>
서버 간 방화벽은 Tailscale 대역에 필요한 포트를 허용합니다.

</details>

---

## 🖥 개발 실행

Node.js 24 이상, PostgreSQL 18, 프로젝트 루트의 `.env`를 준비합니다.<br>
DB 접속 계정은 `root`, DB 이름은 `oanismajor`를 사용합니다.

```bash
npm ci
npm run dev
```

접속 주소는 `http://localhost:5173`입니다.<br>
종료는 Ctrl+C입니다.

---

## 🧹 코드 정리

```bash
npm run format
```

---

## 🏗 빌드

```bash
npm run build
```

결과는 `web/dist`에 저장됩니다.<br>
화면 미리보기는 `npm run preview`로 실행합니다.

---

## 🌐 서버 관리

### 실행 명령

프로젝트 폴더에서 실행합니다.<br>
Windows에서는 Node.js 24 이상이 필요합니다.

| 명령어 | 설명 |
| :---: | :---: |
| `npm start` | 전체 시작 |
| `npm stop` | 전체 종료 |
| `npm start was` | WAS 시작 |
| `npm stop was` | WAS 종료 |
| `npm run restart was` | WAS 재시작 |
| `npm run status` | 가동 상태 |
| `npm run logs` | 실시간 로그 |
| `npm run setup` | 서비스 설정 적용 |

`was` 대신 `web`, `db`를 지정할 수 있습니다.<br>
`npm run logs was 3001`처럼 개별 서버도 선택할 수 있습니다.<br>
로그 화면의 Ctrl+C는 서버를 종료하지 않습니다.

Windows에 Node.js가 없으면 Ubuntu에서 실행합니다.

```powershell
wsl -d Ubuntu -u root
```

```bash
cd /srv/oanismajor
export PATH="/opt/node24/bin:$PATH"
npm run status
```

### 연결

| 역할 | TCP 포트 |
| :---: | :---: |
| HTTPS | 80, 443 |
| WEB | 8081 |
| WAS | 3001 |
| DB | 5432 |
| 파일 공유 | 2049 |

- HTTPS는 공유기 사용 시 80, 443 포트 전달이 필요합니다.
- 기존 Caddy나 다른 웹 서버의 포트 사용을 확인합니다.
- WEB, WAS는 정상 응답 후 자동 등록됩니다.
- 채팅 기록, 관리자 검색, DB 관리, 파일 관리 조회는 최신 복제 DB에 분산합니다.
- 복제 지연이나 연결 오류가 발생하면 메인 DB에서 조회합니다.
- 저장과 권한 확인은 메인 DB를 사용합니다.
- 복제 DB가 없으면 메인 DB에서 단독 저장합니다.
- 복제 DB가 동기화되면 동기 복제로 전환합니다.
- 복제 연결이 끊기면 단독 저장으로 돌아갑니다.
- 자동 인계를 설정하면 Windows 재시작 전에 서버 역할을 넘깁니다.
- 서버가 돌아오면 동기화 후 주 역할을 되찾습니다.
- Router는 정상 응답하는 서버로 연결합니다. 전환 중 잠시 지연될 수 있습니다.
- 갑작스러운 전원 차단이나 통신 단절만으로 DB를 승격하지 않습니다.
- 자동 인계 설정 시 Windows 부팅 후 서버가 시작됩니다.

### 업데이트

① 프로젝트 폴더에서 `git pull`을 실행합니다.<br>
② `update.bat` 또는 `sudo bash update.sh`를 실행합니다.<br>
③ 추가 서버에는 같은 소스와 기본 서버의 `web/dist`를 준비합니다.<br>
④ 추가 서버에서도 `update.bat` 또는 `sudo bash update.sh`를 실행합니다.

업데이트는 소스와 `.env`를 반영합니다.<br>
실행 중인 WAS와 WEB만 갱신하며, 정지된 서버는 켜지 않습니다.<br>
DB는 재시작하지 않습니다.

포트나 서버 구성 변경은 설치 절차로 적용합니다.<br>
기존 인증서는 `/var/lib/oanismajor/acme`에 보관됩니다.

---

## 🔐 .env

프로젝트 루트에 생성합니다.<br>
설치하면 운영 폴더로 복사됩니다.<br>
새 기본 서버 설치 시 DB 비밀번호와 쿠키 키를 자동 생성합니다.

```env
DATABASE_URL=postgresql://root:YOUR_PASSWORD@127.0.0.1:5432/oanismajor
COOKIE_SECRET=YOUR_RANDOM_SECRET
HTTPS_HOST=example.com
HTTPS_EMAIL=admin@example.com
```

| 이름 | 용도 |
| :---: | :---: |
| `DATABASE_URL` | DB 연결 |
| `REPLICATION_URL` | DB 복제 |
| `COOKIE_SECRET` | 쿠키 서명 키 |
| `HTTPS_HOST` | HTTPS 주소 |
| `HTTPS_EMAIL` | 인증서 이메일 |
| `PORT` | WAS 포트 |
| `HOST` | WAS 주소 |
| `MAINTENANCE` | 점검 모드 |

운영 `.env`에는 `NODE_ENV=development`를 넣지 않습니다.<br>
`.env`, 인증 파일, 비밀 키는 Git에 올리지 않습니다.

<details>
<summary>로그인, 음성, 알림 설정</summary>

### 로그인

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5173/api/04f8996d/google/callback
```

OAuth에도 동일한 콜백 URL을 등록합니다.<br>
여러 주소는 쉼표로 구분합니다.

### 음성

| 값 | TTS | STT |
| :---: | :---: | :---: |
| 빈 값 | 일반 Google TTS | Cloud 비활성화 |
| `login` | 기본 Cloud 인증 | 기본 Cloud 인증 |
| `json` | 서비스 계정 파일 | 서비스 계정 파일 |

```env
TTS=json
STT=json
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

WAS 설치에 gcloud가 포함됩니다.<br>
`login` 방식은 Ubuntu에서 인증합니다.

```bash
CLOUDSDK_CONFIG=/srv/oanismajor/.config/gcloud gcloud auth application-default login
```

`status`에서 TTS, STT 인증을 각각 확인합니다.

### 연결 상태

`status`에서 HTTPS, TTS, STT, GOOGLE, VAPID, GIPHY를 확인합니다.<br>
관리자 메뉴의 **연결 상태**에서 인증서 발급일과 만료일을 조회합니다.

| 항목 | 점검 내용 |
| :---: | :---: |
| TTS / STT | Cloud 인증 토큰 |
| GOOGLE | 콜백 형식 |
| VAPID | 키 설정 |
| GIPHY | API 응답, 빌드 반영 |

GOOGLE의 콘솔 등록 상태와 실제 로그인은 별도로 확인합니다.<br>
VAPID의 푸시 수신 여부는 기기에서 확인합니다.

### Web Push

```bash
npx web-push generate-vapid-keys
```

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

### GIPHY

`VITE_GIPHY_API_KEY`에 GIF 검색용 공개 키를 설정합니다.

</details>

---


## 🗃 PostgreSQL

서버 시작 시 테이블을 준비합니다.

| 스키마 | 용도 |
| :---: | :---: |
| `account` | 프로필 |
| `chatting` | 공개 채팅 |
| `messenger` | 메시지, 문의 |
| `moderation` | 신고, 제재 |
| `push` | 알림 기기 |
| `storage` | 파일 등록 정보 |
| `evidence` | 탈퇴 후 보관 이력 |
| `runtime` | 임시 데이터 |
| `audit` | 처리 로그 |

DB는 `pg_dump`로 백업합니다.<br>
`storage/`, 운영 `.env`, Cloud 인증 파일,<br>
`/var/lib/oanismajor/acme`도 보관합니다.<br>
`evidence` 복구에는 `storage/evidence.key`가 필요합니다.

---

## 📁 구조

| 경로 | 용도 |
| :---: | :---: |
| `was/` | 서버 |
| `web/` | 화면 |
| `db/` | 데이터베이스 |
| `lib/` | 공용 코드 |
| `storage/` | 저장 파일 |
| `web/dist/` | 빌드 결과 |
| `servers.json` | 기본 설정 |
| `local.json` | 개별 설정 |
| `oanismajor.bat`, `oanismajor.sh` | 초기 설치와 메뉴 |
| `start.bat`, `start.sh` | 서버 시작 |
| `run.js` | 서버 실행 |

`local.json`은 기본 설정보다 우선합니다.<br>
운영 소스는 `/srv/oanismajor`,<br>
Nginx 설정은 `/etc/oanismajor`에 있습니다.

---

## 📬 문의

기타 문의는 아래 연락처로 부탁드립니다.

- **이메일** [obabo0801@gmail.com](mailto:obabo0801@gmail.com)
- **디스코드** `unjongjjing`
