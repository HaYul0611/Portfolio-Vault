# Portfolio-Vault (과제 8: 패스키 기반 비공개 볼트)

> **공개 소개 페이지에 비밀번호 없이 나만 들어가는 비공개 공간(Private Vault)을 WebAuthn/FIDO2 패스키로 구현한 프로젝트입니다.**

---

## 📌 제출 기본 정보

* **공개 결과물 주소**: `https://portfolio-vault.onrender.com` (또는 로컬 `http://localhost:3000`)
* **소스 주소**: `https://github.com/HaYul0611/Portfolio-Vault`
* **접근성 확인**: 계정 생성, 로그인, 인증, 초대, 비밀번호, OAuth, CAPTCHA 없이 시크릿 창에서 첫 공개 포트폴리오 화면이 즉시 열립니다. (T08-C03, T08-C10)
* **개인정보 여부**: 본 프로젝트의 모든 데이터(프로젝트, 회고 등)는 과제용 가상 내용이며, 실제 개인정보나 비밀값(개인키, 비밀번호)은 일체 포함되지 않았습니다. (T08-C12)

---

## 🚀 짧은 확인 방법 4줄 (T08-C52)

1. **어디로 가나요**: 공개 결과물 URL 접속 후 화면 하단의 **Private Vault** 섹션으로 이동합니다.
2. **세 단계 안에 무엇을 하나요**: `새 계정 등록`에 이름 입력 → 기기 생체인식/PIN으로 패스키 등록 → 등록된 패스키로 로그인합니다.
3. **무엇이 보이면 통과인가요**: 패스키 인증 후 비공개 연구 메모 3개 이상과 상단 패스키 기기 관리 목록이 화면에 나타납니다.
4. **안 될 때는 무엇이 보이나요**: 패스키 인증 없이 `/api/notes` API를 직접 요청하면 `401 Unauthorized` 거절 에러가 반환되며 화면에 어떤 비공개 내용도 노출되지 않습니다.

---

## 🤖 AI와 내 판단 3줄 (T08-C53)

1. **AI에게 맡긴 일**: `@simplewebauthn` 라이브러리의 CBOR 인코딩/디코딩 규격 연동과 WebAuthn Level 3 챌린지 검증 기본 템플릿 코드 작성을 맡겼습니다.
2. **내가 직접 판단한 일**: 과제 통과 기준에 맞춰 데이터베이스 분리 격리(`user_id` 기반 테넌트 격리), 기기 분실 대비 '마지막 남은 패스키의 삭제 거부(400)' 안전장치를 백엔드에 추가 구현하고, 브라우저 기본 팝업(confirm/alert)을 모던 미니멀 커스텀 모달로 일체화하도록 판단했습니다.
3. **AI 제안을 따르지 않은 일**: AI가 최초에 추천한 단순 고정 카테고리 선택 방식을 배제하고, 사용자가 자유롭게 카테고리를 직접 생성·조회·이름변경·삭제(CRUD)할 수 있는 독립 카테고리 관리 시스템과 실시간 검색 필터를 직접 설계하여 구축했습니다.

---

## ✅ 완주 체크리스트 점검 (Self-Checklist)

* [x] **공개 영역과 비공개 영역을 화면에서 갈라 두었습니다.** (상단 공개 포트폴리오 / 하단 경계선과 자물쇠 아이콘으로 구분된 Private Vault)
* [x] **패스키를 등록했고, 서버에 저장된 것이 공개키라는 것을 보였습니다.** (`vault_credentials` 테이블의 `public_key`에 base64 공개키만 보관되며 개인키는 기기 외부로 절대 나가지 않음)
* [x] **매번 새 질문(challenge)이 오고, 이미 쓴 질문은 다시 통하지 않는 것을 확인했습니다.** (일회용 챌린지 검증 후 `used = true` 처리, 재사용 시 400 거절)
* [x] **패스키를 두 개 등록해 하나를 지운 뒤에도 들어갔습니다.** (기기 2개 `Portfolio-Vault`, `SKT-Portfolio-Vault` 등록 후 1개 삭제 테스트 완료, 남은 1개로 정상 로그인 성공)
* [x] **남의 패스키로는 열리지 않는 것을 요청과 응답으로 남겼습니다.** (타 사용자 데이터 수정/조회 시 403 거절 및 엄격한 `user_id` 격리)
* [x] **제출물 어디에도 실제 개인정보와 비밀값이 없습니다.** (비밀번호 필드 전무, 민감 키 마스킹 완료)

---

## 📖 인증 구현 설명서 여섯 항목 (T08-C47 ~ T08-C51)

### ① 무엇으로 붙였나 (T08-C48)
* **라이브러리 사용**: FIDO 얼라이언스 및 W3C WebAuthn Level 3 표준을 완벽 준수하는 공식 오픈소스 라이브러리 사용
  * 브라우저 클라이언트: `@simplewebauthn/browser` (v11)
  * Node.js 서버: `@simplewebauthn/server` (v11/v13)
* **세션 및 DB**: Express-session (HttpOnly, SameSite 쿠키 세션), Supabase PostgreSQL

### ② 왜 그걸 골랐나 (T08-C48)
* 직접 WebAuthn 바이너리 데이터(CBOR, ASN.1/DER 파싱, SHA-256 해시 검증)를 파싱할 경우 암호학적 구현 취약점(서명 재사용, 챌린지 검증 누락 등)이 발생하기 쉽습니다.
* `@simplewebauthn`은 현재 생태계에서 가장 엄격하게 표준을 지키며 전 세계 프로덕션 환경에서 널리 검증되었기에 안정성과 보안성을 확보하기 위해 선정했습니다.

### ③ 어디를 어떻게 고쳤나 (T08-C49)
* **등록(Register)**:
  * 프론트엔드: `public/js/auth.js`의 `registerPasskey()` (`startRegistration`)
  * 백엔드: `routes/auth.js`의 `POST /api/auth/register/options` (챌린지 생성) & `POST /api/auth/register/verify` (공개키 저장)
* **로그인(Login)**:
  * 프론트엔드: `public/js/auth.js`의 `loginPasskey()` (`startAuthentication`)
  * 백엔드: `routes/auth.js`의 `POST /api/auth/login/options` (새 챌린지 생성) & `POST /api/auth/login/verify` (서명 검증 및 세션 발급)
* **로그아웃(Logout)**:
  * 프론트엔드: `public/js/auth.js`의 `logout()`
  * 백엔드: `routes/auth.js`의 `POST /api/auth/logout` (`req.session.destroy()`)
* **비공개 자료 조회 및 CRUD(Notes)**:
  * 미들웨어: `middleware/auth.js`의 `requireAuth` (401 차단)
  * 라우트: `routes/notes.js`의 `GET /api/notes`, `POST /api/notes`, `PATCH /api/notes/:id`, `DELETE /api/notes/:id` (세션 `userId` 엄격 격리)

### ④ 안 열리는 것을 확인한 기록 (네 가지 검증) (T08-C50)

#### 1) 로그인 없이 비공개 주소 열기
* **거절 응답 (401 Unauthorized)**:
  ```http
  GET /api/notes HTTP/1.1
  Host: localhost:3000

  HTTP/1.1 401 Unauthorized
  {"error": "인증이 필요합니다."}
  ```
* **성공 응답 (인증 후 200 OK)**:
  ```http
  GET /api/notes HTTP/1.1
  Cookie: connect.sid=[MASKED]

  HTTP/1.1 200 OK
  [{"category":"프로젝트","title":"차세대 인프라 보안 파이프라인 PoC", ...}]
  ```

#### 2) 남의 패스키/세션으로 타인 비공개 자료 접근
* **거절 응답 (403 Forbidden)**:
  ```http
  PATCH /api/notes/target-other-user-note-id HTTP/1.1
  Cookie: connect.sid=[USER_A_SESSION_MASKED]
  Content-Type: application/json
  {"title": "타인 메모 변조"}

  HTTP/1.1 403 Forbidden
  {"error": "접근 권한이 없습니다."}
  ```
* **격리 성공 응답 (내 자료만 조회됨)**:
  ```http
  GET /api/notes HTTP/1.1
  Cookie: connect.sid=[USER_A_SESSION_MASKED]

  HTTP/1.1 200 OK
  /* User A가 소유한 3건의 메모만 반환되며 User B 데이터는 0건 */
  ```

#### 3) 이미 쓴 챌린지(질문) 재사용 시도
* **거절 응답 (400 Bad Request)**:
  ```http
  POST /api/auth/login/verify HTTP/1.1
  Content-Type: application/json
  {"credential": { ...이미 사용된 챌린지로 서명된 응답... }}

  HTTP/1.1 400 Bad Request
  {"error": "유효한 챌린지가 없습니다."}
  ```

#### 4) 패스키 2개 등록 후 1개 삭제 & 삭제된 패스키로 로그인 시도
* **패스키 삭제 성공 (200 OK)**:
  ```http
  DELETE /api/auth/credentials/KEY-2-ID HTTP/1.1
  HTTP/1.1 200 OK {"ok": true}
  ```
* **남은 패스키(KEY-1)로 로그인 성공 (200 OK)**:
  ```http
  POST /api/auth/login/verify HTTP/1.1 (with KEY-1)
  HTTP/1.1 200 OK {"verified": true}
  ```
* **삭제된 패스키(KEY-2)로 로그인 시도 거절 (403 Forbidden)**:
  ```http
  POST /api/auth/login/verify HTTP/1.1 (with KEY-2)
  HTTP/1.1 403 Forbidden
  {"error": "등록되지 않은 패스키입니다."}
  ```

### ⑤ AI와 나 (T08-C47, T08-C53)
* AI를 활용해 WebAuthn의 복잡한 옵션 생성(`generateRegistrationOptions`, `generateAuthenticationOptions`)과 프론트엔드 연동 흐름을 신속하게 구현했습니다.
* 반면, 심사 기준에서 요구하는 엄격한 보안 요구사항(다중 계정 간 DB 데이터 격리, 마지막 패스키 삭제 시 계정 잠김 방지 백엔드 검증, 카테고리 동적 생성)은 직접 판단하고 검증하여 보완했습니다.

### ⑥ 아직 못 막은 것 (구체적 위협 1가지 이상) (T08-C51)
* **로컬 기기 잠금 해제 공유 위협**: WebAuthn 패스키는 해당 물리 기기(노트북, 스마트폰)의 OS 인증(Windows Hello PIN 또는 지문)에 의존합니다. 만약 기기 소유자가 PIN 번호를 타인에게 알려주었거나 화면 잠금을 해제한 채 자리를 비운 경우, 물리적으로 동일 기기에 접근한 공격자가 패스키 인증을 통과하는 것을 서버 수준에서 원격으로 감지하여 차단할 수는 없습니다.
* **향후 대책**: 민감한 작업(비공개 메모 전체 삭제, 패스키 이름 변경 등) 시 재인증(Step-up Authentication) 인터벌을 짧게 설정하고 이상 IP 접근 감지 알림을 도입할 계획입니다.

---

## 📂 프로젝트 구조

```
Portfolio-Vault/
├── server.js               # Express 서버 메인 & 에러 미들웨어
├── routes/
│   ├── auth.js             # WebAuthn 패스키 등록/로그인/관리 API
│   └── notes.js            # 비공개 메모 CRUD API (세션 인증 필수)
├── middleware/
│   └── auth.js             # requireAuth 인증 미들웨어 (401 반환)
├── public/
│   ├── index.html          # 공개 포트폴리오 + Private Vault 통합 화면
│   ├── css/style.css       # 미니멀 흑백 모던 디자인 시스템 & 볼트 스타일
│   └── js/
│       ├── main.js         # SAR 토글, 모달, ESC 닫기
│       ├── auth.js         # @simplewebauthn/browser 패스키 클라이언트
│       └── vault.js        # 비공개 메모 CRUD & 카테고리 필터/생성 UI
└── README.md               # 과제 8 공식 제출 규격 문서
```
