# WorkLaps

> 하루를 랩으로 기록하다

하루의 업무를 시간대별로 간단하게 기록하는 macOS 데스크탑 앱입니다.

![WorkLaps](src-tauri/icons/128x128@2x.png)

---

## 주요 기능

- **타임라인 뷰** — 07:00 ~ 22:00 시간대별로 업무를 기록하고 한눈에 확인
- **퀵 등록** — 트레이 아이콘 클릭 또는 글로벌 단축키로 즉시 기록
- **카테고리** — 업무 / 미팅 / 휴식 / 학습 / 기타 기본 태그 + 커스텀 태그 추가
- **통계** — 날짜별 총 업무 시간, 기록 수, 집중률 요약
- **멀티 모니터 지원** — 퀵 등록 창이 마우스가 있는 모니터 중앙에 표시
- **시스템 트레이 상주** — 창을 닫아도 종료되지 않고 트레이에 유지
- **로컬 SQLite 저장** — 모든 데이터는 기기에 로컬로 저장

---

## 사용 방법

### 랩 추가

- 메인 창 오른쪽 상단 **+ 랩 추가** 버튼
- 타임라인의 빈 시간대 클릭
- 단축키 `Cmd+Shift+L` → 퀵 등록 창

### 퀵 등록

| 방법 | 동작 |
|------|------|
| 트레이 아이콘 왼쪽 클릭 | 퀵 등록 창 열기/닫기 |
| `Cmd+Shift+L` | 퀵 등록 창 열기/닫기 |
| `Cmd+Enter` | 퀵 등록 창에서 저장 |
| `Esc` | 퀵 등록 창 닫기 |

### 트레이 메뉴 (우클릭)

- **앱 표시** — 메인 창 열기
- **종료** — 앱 완전 종료

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | [Tauri v2](https://tauri.app) |
| 백엔드 | Rust |
| 프론트엔드 | Vanilla HTML / CSS / JavaScript |
| 데이터베이스 | SQLite ([rusqlite](https://github.com/rusqlite/rusqlite)) |
| 글로벌 단축키 | tauri-plugin-global-shortcut |

---

## 개발 환경 설정

### 필수 조건

- [Node.js](https://nodejs.org) 18 이상
- [Rust](https://www.rust-lang.org/tools/install) (rustup)
- Xcode Command Line Tools (macOS)

### 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run tauri dev
```

### 빌드

```bash
npm run build
```

빌드 결과물은 `src-tauri/target/release/bundle/` 에 생성됩니다.

---

## 데이터 저장 위치

```
~/Library/Application Support/com.worklaps.desktop/worklaps.db
```

---

## 프로젝트 구조

```
worklaps/
├── dist/                  # 웹 에셋 (빌드 대상)
│   ├── index.html         # 메인 창
│   └── quick-add.html     # 퀵 등록 창
├── src-tauri/
│   ├── src/
│   │   └── lib.rs         # Rust 백엔드 (커맨드, DB, 트레이, 단축키)
│   ├── capabilities/
│   │   └── default.json   # Tauri 권한 설정
│   ├── icons/             # 앱 아이콘
│   ├── Cargo.toml
│   └── tauri.conf.json    # Tauri 설정
└── package.json
```
