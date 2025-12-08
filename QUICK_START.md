# 경비 청구 집계 시스템 - 빠른 시작 가이드

## 🎯 시스템 목표

**사용자별 경비 청구** → **특별 항목 관리** → **월별 마감** → **집계 조회**

---

## 📁 생성된 파일 목록

### Backend

#### SQL 스크립트

- `backend/sql/create_expense_summary_tables_mssql.sql`
  - TB_SPECIAL_ITEMS (특별 항목 테이블)
  - TB_EXPENSE_CLOSING (월별 마감 데이터 테이블)
  - EXPENSE_MASTER 수정 (IS_CLOSED, CLOSED_DATE 추가)

#### DTO

- `backend/DTO/SpecialItemDTO.java` - 특별 항목 데이터 객체
- `backend/DTO/ExpenseClosingDTO.java` - 마감 데이터 객체

#### DAO

- `backend/DAO/ExpenseSummaryDAO.java`
  - 특별 항목 CRUD
  - 월별 마감 처리
  - 마감 데이터 조회

#### Servlet

- `backend/servlet/JvWorksGetSpecialItems.java` - /api/special-items 엔드포인트
- `backend/servlet/JvWorksCloseExpense.java` - /api/expense-closing 엔드포인트

### Frontend

#### React 컴포넌트

- `src/works/SpecialItems.js` - 특별 항목 관리 페이지
  - 월별 특별 항목 CRUD
  - 부서별 그룹화 및 합계
- `src/works/ExpenseSummary.js` - 경비 청구 집계 페이지
  - 마감 데이터 조회
  - 부서별/사용자별 집계
  - 특별항목 현황 표시

#### CSS

- `src/works/SpecialItems.css` - 특별 항목 관리 스타일
- `src/works/ExpenseSummary.css` - 집계 페이지 스타일

#### 설정 수정

- `src/App.js` - 라우트 2개 추가
- `src/works/index.js` - Works 홈 기능 2개 추가

---

## 🚀 설치 및 구동

### 1단계: 데이터베이스 생성

```bash
# SQL Server에서 실행
sqlcmd -S localhost -U sa -P your_password -d your_database
       -i backend/sql/create_expense_summary_tables_mssql.sql
```

### 2단계: Backend 배포

```bash
# 1. Java 파일 컴파일
javac -d [WAS_LIB] \
  backend/DTO/SpecialItemDTO.java \
  backend/DTO/ExpenseClosingDTO.java \
  backend/DAO/ExpenseSummaryDAO.java \
  backend/servlet/JvWorksGetSpecialItems.java \
  backend/servlet/JvWorksCloseExpense.java

# 2. WAR 파일 생성 및 WAS 배포
# (Tomcat, WebLogic 등에 배포)
```

### 3단계: Frontend 빌드 및 배포

```bash
# React 빌드
npm run build

# 배포 (자동 또는 수동)
# Netlify: git push → 자동 배포
# 또는 수동 배포: dist/ 폴더 업로드
```

---

## 💡 주요 기능 사용 방법

### 특별 항목 관리 (/works/special-items?mode=manager)

**1. 월 선택**

- 특별 항목을 등록할 월 선택
- 기본값: 현재 월

**2. 항목 추가**

- "+ 항목 추가" 버튼 클릭
- 부서명(소담/세종/기타), 항목명(점심/저녁/간식) 선택
- 수량, 단가, 총액 입력
- "저장" 버튼 클릭

**3. 항목 수정**

- 해당 행의 "수정" 버튼 클릭
- 필요한 정보 수정 후 "저장"

**4. 항목 삭제**

- 해당 행의 "삭제" 버튼 클릭
- 확인 다이얼로그에서 "삭제" 선택

**5. 합계 확인**

- 부서별 소계 자동 계산
- 최하단에 전체 합계 표시

---

### 경비 청구 집계 (/works/expense-summary?mode=manager)

**1. 월 선택**

- 조회할 월 선택
- 해당 월에 마감된 데이터만 표시

**2. 마감 현황 확인**

- 특별항목 현황: 부서별 금액 표시 (카드 형태)
- 사용자별 청구 내역: 일반경비, 유류비, 특별항목, 합계
- 부서별 집계: 인원, 경비 항목별 합계
- 전체 합계: 최종 청구액

**3. 마감 재개**

- 마감 상태인 행의 "재개" 버튼 클릭
- 확인 후 재개 처리
- 상태가 "재개됨"으로 변경

---

## 🔑 API 엔드포인트

### 특별 항목 API

| Method | Endpoint           | 설명          |
| ------ | ------------------ | ------------- |
| GET    | /api/special-items | 특별항목 조회 |
| POST   | /api/special-items | 특별항목 등록 |
| PUT    | /api/special-items | 특별항목 수정 |
| DELETE | /api/special-items | 특별항목 삭제 |

### 마감 API

| Method | Endpoint             | 설명             |
| ------ | -------------------- | ---------------- |
| GET    | /api/expense-closing | 마감 데이터 조회 |
| POST   | /api/expense-closing | 월별 마감 처리   |
| PUT    | /api/expense-closing | 마감 재개        |

---

## 📊 데이터 흐름

```
┌─────────────────────────────────────────────────────┐
│ 1. 사용자 경비 청구 (Expense.js)                     │
│    - 일반경비, 유류비 입력                           │
│    - 제출 (→ EXPENSE_MASTER)                        │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. 특별 항목 등록 (SpecialItems.js)                  │
│    - 점심비, 저녁비 등 관리팀 입력                   │
│    - 저장 (→ TB_SPECIAL_ITEMS)                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. 월별 마감 (ExpenseSummary.js)                     │
│    - 사용자별 경비 + 특별항목 집계                   │
│    - 마감 저장 (→ TB_EXPENSE_CLOSING)               │
│    - EXPENSE_MASTER.IS_CLOSED = 1                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. 집계 현황 조회 (ExpenseSummary.js)                │
│    - 마감된 데이터만 표시                           │
│    - 부서별, 사용자별 집계                          │
│    - 전체 합계                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 접근 제어

모두 관리자 모드(`?mode=manager`) 필수:

```javascript
// 올바른 URL
/works/special-items?mode=manager
/works/expense-summary?mode=manager

// 접근 불가
/works/special-items
/works/expense-summary
```

---

## ✨ 특징

### 1. 자동 ID 생성

- 특별항목: `SI_20250108_00001`
- 마감: `EC_20250108_00001`

### 2. 부서별 그룹화

- SpecialItems: 부서별 테이블 자동 생성
- ExpenseSummary: 부서별 집계 자동 계산

### 3. 마감 추적

- 마감자, 마감 일시 기록
- 재개자, 재개 일시 기록

### 4. JSON 상세 정보

- 경비 상세 내역 JSON 저장
- 유류비 상세 내역 JSON 저장
- 특별항목 상세 내역 JSON 저장

### 5. 반응형 디자인

- 데스크톱: 전체 기능
- 태블릿: 최적화된 레이아웃
- 모바일: 스크롤 가능한 테이블

---

## 🐛 문제 해결

### 데이터가 안 나타남

1. 월 선택 확인
2. 마감 상태 확인 (CLOSING_STATUS = 'CLOSED')
3. 브라우저 개발자 도구 → Network 탭에서 API 응답 확인
4. 백엔드 로그 확인

### 매개변수 오류

- `?mode=manager` 필수
- factoryCode 확인
- monthYm 형식 확인 (YYYY-MM)

### 데이터베이스 오류

- 테이블 생성 여부 확인
- 컬럼명 일치 확인
- 연결 문자열 확인

---

## 📞 기술 지원

자세한 구현 내용은 `IMPLEMENTATION_GUIDE.md` 참고

---

**최종 수정**: 2025년 1월 8일
