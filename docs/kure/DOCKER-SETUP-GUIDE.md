# 도커로 한국어 임베딩 서버(KURE) 띄우기 — M1 맥북 기준 처음부터 끝까지

> 작성 2026-10-13 · 환경: MacBook Air M1(arm64), macOS, Docker Desktop(Engine 29.8, Compose v5.6)
> 이 글은 "도커를 잘 모르는 상태에서, 이미 만들어진 프로젝트를 새 PC에 똑같이 세팅"하는 과정을 그대로 기록한 학습용 가이드다.
> 배경 설계는 [PLAN.md](./PLAN.md) 참고.

---

## 0. 먼저 큰 그림 — 뭘 띄우는 건가

내 글끼리 "뜻이 비슷한지" 계산하려면 두 가지가 필요하다.

| 컨테이너 | 하는 일 | 어디서 오나 | 포트 |
|---|---|---|---|
| **개발 DB** (`inote-ai-db-1`) | 글의 벡터(숫자 1024개)를 저장하는 Postgres + pgvector | `inote-ai` 레포의 `docker-compose.dev.yml` | 5434 |
| **임베딩 서비스** (`inote-embedder-embedder-1`) | 문장을 받아 벡터로 바꿔 주는 작은 HTTP 서버(KURE-v1 모델) | `inote-embedder` 레포의 `docker-compose.yml` | 8100 |

```
(문장) ──POST /embed──▶ [임베딩 서비스 :8100] ──▶ 벡터 1024개
                                                    │ (AI 서버가 저장)
                                                    ▼
                                         [개발 DB :5434, pgvector]
```

둘 다 **내 PC 안에서만** 열린다(`127.0.0.1`). 운영 DB는 건드리지 않는다.

## 1. 도커를 처음 쓴다면 — 용어 5개

- **이미지(image)**: 프로그램 + 실행에 필요한 모든 것을 묶어 둔 "설치 파일". 읽기 전용이다.
- **컨테이너(container)**: 이미지를 실제로 실행한 것. 껐다 켜도, 지워도 이미지는 그대로다.
- **볼륨(volume)**: 컨테이너가 지워져도 남는 저장 공간. DB 데이터와 내려받은 모델이 여기 저장된다.
- **Dockerfile**: 이미지를 만드는 레시피. (`inote-embedder/Dockerfile`)
- **docker-compose.yml**: 컨테이너 여러 개의 실행 방법(포트·환경변수·볼륨)을 한 파일에 적어 둔 것. 명령 한 줄로 시작/정지한다.

한 줄로: **Dockerfile → (build) → 이미지 → (up) → 컨테이너**, 데이터는 **볼륨**에.

## 2. 사전 준비

### 2-1. Docker Desktop 설치 (Apple Silicon용)
공식 사이트에서 **Mac with Apple chip** 버전을 받거나:
```bash
brew install --cask docker
```
M1은 arm64라 **Intel용을 받으면 안 된다.**

### 2-2. ⚠️ 설치만으로는 안 된다 — 앱을 한 번 실행해야 한다
설치 직후엔 이런 상태다.
- `~/.docker` 폴더가 없다
- `docker compose`가 `unknown command`
- `docker info`가 `failed to connect to the docker API`

**Applications에서 Docker를 실행**해 약관·권한 요청을 허용하고, 메뉴바 고래 아이콘이 **Engine running**이 될 때까지 기다린다. 그러면 앱이 `~/.docker/cli-plugins`(compose 포함)를 만들고 엔진(데몬)을 띄운다.

> 이유: 도커는 "명령(클라이언트)"과 "엔진(데몬)"이 나뉘어 있다. 앱이 켜져 있어야 데몬이 살아 있고, 터미널 명령은 그 데몬에게 일을 시킬 뿐이다.

### 2-3. 터미널에서 `docker`가 안 잡힐 때
```
command not found: docker
```
앱 안에는 있는데 PATH에 없는 경우다. 임시로:
```bash
export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"
```
영구 적용은 `~/.zshrc`에 위 줄을 추가한다. (Docker Desktop 설정의 "Install CLI tools"를 켜도 된다.)

### 2-4. 확인
```bash
docker --version
docker compose version
docker info | grep -E "Architecture|CPUs|Total Memory"   # Architecture: aarch64 이면 M1 네이티브
```

### 2-5. 메모리 확인 (이번에 실제로 걸린 부분)
`Total Memory`가 **3.8GB**였다(Docker Desktop 기본값). 회사 Intel PC는 7.75GB였다.
임베딩 서비스가 추론 직후 **약 2.1GiB**를 쓰므로 3.8GB에서는 빠듯하다. 여유가 필요하면 Docker Desktop → Settings → Resources → Memory를 올린다(맥 전체 메모리의 절반 정도까지가 무난).
`inote-embedder`의 `docker-compose.yml`엔 `mem_limit: 5g`가 있는데, 도커 전체보다 큰 값이라 실제 상한은 도커 전체 메모리다.

## 3. 소스 받기

```bash
cd ~/Desktop/개인/사이드프로젝트
git clone https://github.com/seo337dc/inote-embedder.git      # 임베딩 서비스 (이 PC엔 없었음)
git -C inote-ai pull                                          # 개발 DB 설정이 들어 있는 레포
```
> 💡 `inote-ai`의 git remote URL에 GitHub 토큰이 평문으로 박혀 있었다(`git remote -v`로 보임). 화면 공유·로그에 노출될 수 있으니 토큰을 재발급하고 URL에서 빼는 것을 권장한다.

## 4. 개발 DB 띄우기 (`inote-ai`)

```bash
cd inote-ai
cp .env.dev.example .env.dev
```
`.env.dev`의 `AI_DEV_DB_PASSWORD=` 뒤에 비밀번호를 채운다. **이 PC의 개발 DB 전용 값**이고 운영 값은 절대 넣지 않는다(`.env.*`는 git에 안 올라간다).
```bash
openssl rand -hex 16        # 이 출력값을 붙여 넣기
```
시작:
```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
```
- `-f`: 어떤 compose 파일인지 / `--env-file`: 환경변수 파일 / `up`: 시작 / `-d`: 백그라운드
- 처음엔 `pgvector/pgvector:pg17` 이미지를 내려받는다(약 160MB 다운로드, 디스크 656MB).
- 처음 한 번만 `docker/dev-db-init.sql`, `schema.sql`이 **자동 실행**돼 테이블이 만들어진다.

### 확인
```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev ps
docker exec inote-ai-db-1 psql -U ai -d inote_ai_dev -c '\dt' -c '\dx'
```
테이블 3개(`conversation_sessions`, `conversations`, `post_embedding`)와 확장 `vector 0.8.7`(스키마 `extensions`)이 보이면 된다.

자체 검증 스크립트(설계대로 동작하는지, 끝에서 ROLLBACK 되므로 데이터는 안 남음):
```bash
docker exec -i inote-ai-db-1 psql -U ai -d inote_ai_dev -v ON_ERROR_STOP=1 < scripts/verify_post_embedding.sql
```
마지막에 `모든 검증 통과`가 나오면 성공. (후보 id 밖의 글은 절대 안 돌려주는지, 잘못된 차원의 벡터는 거절하는지 등을 확인한다.)

## 5. 임베딩 서비스 띄우기 (`inote-embedder`)

```bash
cd ../inote-embedder
cp .env.example .env
```
`.env`에 두 값을 채운다(둘 다 `openssl rand -hex 16`으로 생성).
- `INTERNAL_SECRET`: 이 서비스를 부를 때 헤더(`x-internal-secret`)로 보내는 비밀키. **비어 있으면 `/embed`는 503으로 거절**한다(열린 채로 뜨지 않게).
- `LAB_DB_PASSWORD`: 실험용 DB 비밀번호(이번엔 DB 서비스는 안 띄워서 사실상 안 쓰이지만, compose가 변수 누락을 오류로 처리하므로 채워 둔다).

### 5-1. 이미지 빌드 (약 2분)
```bash
docker compose build embedder
```
Dockerfile이 하는 일: `python:3.12-slim` → **CPU 전용 torch** 설치 → `sentence-transformers` 등 설치 → 앱 복사 → root가 아닌 `app` 사용자로 실행.
CPU 전용 torch를 먼저 따로 설치하는 이유: 기본 PyPI 휠은 CUDA 라이브러리가 딸려 와 수 GB가 되기 때문이다. (Mac은 어차피 GPU 가속이 없다.)
> M1에서도 arm64 이미지로 그대로 빌드됐다. 이미지 크기는 `docker images`에서 1.86GB(디스크 기준)로 표시된다(README의 427MB는 압축된 다운로드 크기 기준이라 단위가 다르다).

### 5-2. 실행
```bash
docker compose up -d embedder
```
- **모델은 이미지에 안 들어 있다.** 첫 시작 때 Hugging Face에서 내려받아 `models` **볼륨**에 저장한다(약 2GB). 그래서 첫 시작은 오래 걸리고, 이후엔 이미지를 다시 빌드해도 다시 받지 않는다.
- 모델을 읽는 동안 `/health`는 응답하지 않거나 `loading`이다.

### 5-3. 준비됐는지 확인
```bash
curl http://127.0.0.1:8100/health
# {"status":"ok","model":"nlpai-lab/KURE-v1","dim":1024}
```
`status`가 `ok`면 준비 완료. (로그의 `unauthenticated requests to the HF Hub` 경고는 무시해도 된다.)

### 5-4. 실제로 벡터 받아 보기
```bash
curl -s http://127.0.0.1:8100/embed \
  -H "x-internal-secret: <.env의 INTERNAL_SECRET>" \
  -H "content-type: application/json" \
  -d '{"inputs":["오늘 점심으로 김치찌개를 먹었다"]}'
```
응답의 `embeddings[0]`이 1024개의 숫자이고, 크기가 1.0(정규화)이다. 키가 없거나 틀리면 401.

### 5-5. 측정 (선택)
```bash
INTERNAL_SECRET=<값> python3 scripts/bench.py
docker stats --no-stream
```

## 6. 이 PC(M1)에서 실제로 측정한 값

| 항목 | 회사 PC(Intel, 12 CPU) | 이 PC(M1, 8 CPU) |
|---|---|---|
| 짧은 문장 1개(중앙값) | 360ms | **358ms** |
| 짧은 문장 8개 배치 | 911ms | **1,187ms** |
| 긴 글 1개(1,152자) | 2,569ms | **5,189ms** |
| 메모리(추론 직후) | 927MiB | **2.1GiB** (도커 전체 3.8GiB 중) |
| 개발 DB 메모리 | — | 35MiB |
| 도커 총 디스크 | — | 이미지 2.5GB + 볼륨 2.3GB(모델·DB) |

- **유사도 점수는 회사 PC와 완전히 같았다**(김치찌개 0.953, React↔리액트 0.685, 무관한 쌍 0.302~0.502). 같은 모델·같은 입력이면 PC가 달라도 결과가 같다는 확인이다.
- **긴 글은 약 2배 느리다.** 글 저장 때 뒤에서 계산하는 용도(PLAN의 A5)엔 문제없지만, 글 쓰는 중 실시간 호출(C 단계)을 설계할 땐 이 값을 기준으로 잡아야 한다.
- 메모리가 회사 PC 측정(927MiB)보다 크게 나왔다. 원인(측정 시점, 아키텍처 차이 등)은 확인하지 않았다 — 추정만 가능하다.

## 7. 자주 쓰는 명령

```bash
docker ps                                   # 지금 떠 있는 컨테이너
docker compose logs -f embedder             # 로그 보기 (embedder 폴더에서)
docker compose stop embedder                # 정지(데이터·모델 유지)
docker compose up -d embedder               # 다시 시작 (모델이 볼륨에 있어 약 15초)
docker compose down                         # 컨테이너 삭제(볼륨은 유지)
docker compose down -v                      # ⚠️ 볼륨까지 삭제 — DB 데이터와 내려받은 모델이 사라진다
docker system df                            # 디스크 사용량
```
`inote-ai` 개발 DB는 항상 `-f docker-compose.dev.yml --env-file .env.dev`를 붙인다.

## 8. 막혔을 때

| 증상 | 원인 | 해결 |
|---|---|---|
| `command not found: docker` | CLI가 PATH에 없음 | 2-3 참고 |
| `docker: unknown command: docker compose` | 앱을 한 번도 실행 안 해서 플러그인이 설치 안 됨 | 2-2 참고 |
| `failed to connect to the docker API` | 엔진이 안 떠 있음 | Docker 앱 실행, Engine running 확인 |
| compose가 `.env에 ... 채워 주세요` 오류 | 필수 환경변수 누락 | `.env` / `.env.dev`에 값 채우기 |
| `/embed`가 503 | `INTERNAL_SECRET`이 비어 있음 | `.env` 채우고 컨테이너 재시작 |
| `/embed`가 401 | 헤더의 키가 틀림 | `.env`의 값과 동일하게 |
| `/health`가 `loading` 또는 무응답 | 모델 내려받기·로드 중 | 몇 분 기다리기, `logs -f`로 확인 |
| 컨테이너가 갑자기 종료(Exited 137) | 메모리 부족(OOM) | Docker Desktop 메모리 올리기 |
| 5433/5434/8100 포트 충돌 | 같은 포트를 다른 프로그램이 사용 | `lsof -iTCP:<포트> -sTCP:LISTEN`으로 확인 후 정리 |

## 9. 이 세팅에서 배운 것 (블로그 포인트)

1. **설치와 실행은 다르다.** 도커 앱은 설치 후 한 번 실행해야 CLI 플러그인과 엔진이 준비된다.
2. **컨테이너는 껍데기, 데이터는 볼륨.** `down`은 안전하지만 `down -v`는 데이터를 지운다.
3. **모델을 이미지에 굽지 않은 이유**: 이미지를 다시 빌드해도 2GB를 다시 받지 않게 하려고.
4. **같은 코드가 다른 PC에서 다른 성능을 낸다.** 결과(점수)는 같고 속도·메모리만 다르다. 성능 숫자는 "어느 환경에서 쟀는지"를 같이 적어야 한다.
5. **로컬과 운영의 분리**: 개발 DB를 따로 두고 `.env.dev`로 비밀번호도 분리해 운영 DB를 보호한다.

## 10. AI 서버 테스트와 종단 확인

두 컨테이너가 떴다면 마지막으로 `inote-ai`(FastAPI)까지 붙여서 전체 흐름을 확인한다.

### 10-1. 파이썬 환경
이 PC의 기본 파이썬은 3.9(`runtime.txt`는 3.12)인데 3.9 가상환경으로도 의존성 설치와 테스트가 모두 됐다.
```bash
cd inote-ai
python3 -m venv venv                 # venv는 git에 안 올라간다
venv/bin/pip install -r requirements.txt
```

### 10-2. 테스트 59개
```bash
# 1) 모델·DB 없이 도는 테스트 — 59개 중 46개 통과, 13개(DB 통합)는 건너뜀
venv/bin/python -m unittest discover -s tests -t .

# 2) 개발 DB를 연결하면 DB 통합 13개까지 돈다 — 59개 전부 통과
TEST_DATABASE_URL="postgresql://ai:<AI_DEV_DB_PASSWORD>@127.0.0.1:5434/inote_ai_dev" \
  venv/bin/python -m unittest discover -s tests -t .
```
- 건너뛴 13개는 `TEST_DATABASE_URL`이 없어서 스스로 skip 한 것이다. 실제로 후보 id 제한을 확인하는 핵심 테스트들이라 DB를 붙여서 한 번은 돌려야 한다.
- 테스트가 만든 행(`itest-`로 시작)은 끝나면 지워진다(남은 행 0개 확인). **운영 DB로는 절대 돌리지 않는다.**
- 중간에 보이는 `embedder returned status 401/503`, `ConnectError` 같은 로그는 오류가 아니다. "임베딩 서비스가 실패하면 어떻게 처리하는지"를 일부러 만들어 보는 테스트의 출력이다.

### 10-3. 종단 확인 (실제 흐름 그대로)
AI 서버를 개발 DB·임베딩 서비스에 연결해서 띄운다. `inote-ai`에 `.env`가 없으므로 환경변수를 직접 넘긴다.
```bash
export DATABASE_URL="postgresql://ai:<AI_DEV_DB_PASSWORD>@127.0.0.1:5434/inote_ai_dev"   # 운영 DB 아님
export EMBEDDER_URL=http://127.0.0.1:8100
export EMBEDDER_SECRET=<inote-embedder/.env의 INTERNAL_SECRET>     # 임베딩 서비스가 기대하는 키
export INTERNAL_SECRET=<이 AI 서버용으로 새로 만든 값>              # 위와 '다른 값' (openssl rand -hex 16)
export GROQ_API_KEY=unused INOTE_SERVER_URL=http://127.0.0.1:1    # 임베딩 API만 쓰므로 자리만 채운다
venv/bin/uvicorn app.main:app --port 8000
```
키가 두 개인 점이 헷갈리기 쉽다. `INTERNAL_SECRET`은 "BE가 AI 서버를 부를 때" 쓰는 키, `EMBEDDER_SECRET`은 "AI 서버가 임베딩 서비스를 부를 때" 쓰는 키다.

이 상태에서 `curl`로 호출한 결과(글 3개: 도커 2개 + 점심 1개):

| 확인 | 결과 |
|---|---|
| 키 없이 `PUT` | **401** |
| 글 3개 저장 | `embedded`, 모델 `nlpai-lab/KURE-v1`, 1024차원 → DB에 행 3개 생성 |
| 같은 글을 같은 내용으로 다시 저장 | **`unchanged`** (재계산 안 함) |
| 도커 글 ↔ 비슷한 도커 글 | 점수 **0.7636** |
| 도커 글 ↔ 점심 글 | 점수 **0.3192** |
| 후보에서 비슷한 글을 뺌 | 점심 글만 나옴 (**후보 밖의 글은 안 나온다**) |
| 후보를 빈 목록으로 | 빈 목록 |
| 저장 전 텍스트("컨테이너 이미지 / 도커로 배포")로 조회 | 도커 글 0.7187, 도커2 0.6574, 점심 0.2487 |
| 글 삭제 후 | DB에 남은 행 0개 |
| 임베딩 서비스를 끄고 `PUT` | **503** (`임베딩 서비스 요청 실패`) — BE가 이걸 받으면 무시하고 글 저장은 계속한다(fail-open) |

- 점수 차이(도커끼리 0.76 vs 점심 0.32)는 회사 PC의 실험과 같은 경향이다.
- 이 확인에서 만든 글은 `e2e-` 접두어로 넣고 끝에 모두 지웠다. 개발 DB는 깨끗한 상태다.

## 11. 아직 안 한 것

- 개발 DB에 **실제 공개 글 22개를 넣는 백필**은 하지 않았다. 이 레포들 안에는 BE 쪽 백필 스크립트가 아직 없고(PLAN의 A6, 미착수), 실험 레포의 `lab/import_posts.py`·`lab/embed_posts.py`는 별도 실험 DB(5433, `docker compose up -d db`)를 쓰는 것이라 이번 범위에서 제외했다.
- 마지막 종단 확인을 마친 뒤 임베딩 서비스를 다시 시작했는데, 모델을 다시 로드하느라 `/health`가 `ok`가 되기까지 15초 안팎 걸린다.
