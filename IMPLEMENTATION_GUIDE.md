# 경비 청구 집계 시스템 구현 가이드

## 📋 시스템 개요

사용자별 경비 청구를 하면서 관리팀에서 직접 입력해야 할 특별 항목들(점심비, 저녁비 등)을 별도로 관리하고, 월별 경비를 마감하여 집계 현황을 조회할 수 있는 시스템입니다.

---

## 🗄️ 데이터베이스 구조

### 1. TB_SPECIAL_ITEMS (특별 항목 관리 테이블)

관리팀이 직접 입력하는 점심비, 저녁비 등의 항목들을 관리합니다.

**주요 컬럼:**

- `SPECIAL_ITEM_ID` (PK): 특별항목 ID (SI_YYYYMMDD_XXXXX 형식)
- `FACTORY_CODE`: 공장코드
- `MONTH_YM`: 대상 년월 (YYYY-MM)
- `DEPARTMENT`: 부서명 (소담, 세종 등)
- `ITEM_NAME`: 항목명 (점심, 저녁, 간식 등)
- `AMOUNT`: 금액 (원)
- `QUANTITY`: 수량 (인원 수, 회차 등)
- `UNIT_PRICE`: 단가
- `MEMO`: 비고
- `CREATED_BY`: 등록자
- `CREATED_AT`: 등록일시
- `UPDATED_BY`: 수정자
- `UPDATED_AT`: 수정일시

**인덱스:**

- MONTH_YM 인덱스 (월별 조회 성능)
- MONTH_YM + DEPARTMENT 인덱스 (부서별 조회 성능)

---

### 2. TB_EXPENSE_CLOSING (월별 경비 마감 데이터 테이블)

월별로 마감한 경비 데이터를 저장하여 집계 화면에서 조회합니다.

**주요 컬럼:**

- `CLOSING_ID` (PK): 마감 ID (EC_YYYYMMDD_XXXXX 형식)
- `FACTORY_CODE`: 공장코드
- `MONTH_YM`: 마감 년월 (YYYY-MM)
- `USER_ID`: 사용자 ID
- `USER_NAME`: 사용자 명
- `DEPARTMENT`: 부서명
- `TOTAL_EXPENSE`: 일반경비 총액 (원)
- `FUEL_EXPENSE`: 유류비 총액 (원)
- `SPECIAL_ITEM_EXPENSE`: 특별항목 총액 (원)
- `TOTAL_AMOUNT`: 전체 청구액 (원)
- `EXPENSE_DETAILS`: 상세 경비 항목 (JSON)
- `FUEL_DETAILS`: 유류비 항목 (JSON)
- `SPECIAL_ITEM_DETAILS`: 특별항목 (JSON)
- `CLOSING_STATUS`: 마감 상태 (CLOSED, REOPENED)
- `CLOSED_BY`: 마감자
- `CLOSED_AT`: 마감일시
- `REOPENED_BY`: 재개자
- `REOPENED_AT`: 재개일시
- `REMARK`: 비고

**유니크 제약:**

- (FACTORY_CODE, MONTH_YM, USER_ID) 복합 유니크 인덱스

**인덱스:**

- MONTH_YM 인덱스 (월별 조회)
- USER_ID + MONTH_YM 인덱스 (사용자별 조회)
- CLOSING_STATUS + MONTH_YM 인덱스 (마감 상태 조회)

---

### 3. EXPENSE_MASTER 테이블 수정

기존 테이블에 다음 컬럼 추가:

- `IS_CLOSED` (BIT): 마감 여부 (기본값: 0)
- `CLOSED_DATE` (DATETIME2): 마감 일시

---

## 🔧 Backend 구현

### DTO (Data Transfer Object)

#### SpecialItemDTO

```java
public class SpecialItemDTO {
    private String specialItemId;      // 특별항목 ID
    private String factoryCode;        // 공장코드
    private String monthYm;            // 대상 년월
    private String department;         // 부서명
    private String itemName;           // 항목명
    private double amount;             // 금액
    private int quantity;              // 수량
    private double unitPrice;          // 단가
    private String memo;               // 비고
    private String createdBy;          // 등록자
    private String createdAt;          // 등록일시
    private String updatedBy;          // 수정자
    private String updatedAt;          // 수정일시
}
```

#### ExpenseClosingDTO

```java
public class ExpenseClosingDTO {
    private String closingId;          // 마감 ID
    private String factoryCode;        // 공장코드
    private String monthYm;            // 마감 년월
    private String userId;             // 사용자 ID
    private String userName;           // 사용자 명
    private String department;         // 부서명
    private double totalExpense;       // 일반경비 총액
    private double fuelExpense;        // 유류비 총액
    private double specialItemExpense; // 특별항목 총액
    private double totalAmount;        // 전체 청구액
    private String expenseDetails;     // 상세 정보 (JSON)
    private String fuelDetails;        // 유류비 정보 (JSON)
    private String specialItemDetails; // 특별항목 정보 (JSON)
    private String closingStatus;      // 마감 상태
    private String closedBy;           // 마감자
    private String closedAt;           // 마감일시
    private String reopenedBy;         // 재개자
    private String reopenedAt;         // 재개일시
    private String remark;             // 비고
}
```

---

### DAO (Data Access Object)

#### ExpenseSummaryDAO

주요 메서드:

1. **특별 항목 관리**

   - `getSpecialItems(factoryCode, monthYm)` - 특별항목 조회
   - `insertSpecialItem(item)` - 특별항목 등록
   - `updateSpecialItem(item)` - 특별항목 수정
   - `deleteSpecialItem(specialItemId)` - 특별항목 삭제

2. **월별 마감 처리**
   - `closeExpenseMonth(closing)` - 월별 경비 마감
   - `getClosingDataByMonth(factoryCode, monthYm, userId)` - 마감 데이터 조회
   - `getClosingDataById(closingId)` - 단일 마감 데이터 조회
   - `reopenClosing(closingId, reopenedBy)` - 마감 재개

**구현 특징:**

- ID 자동 생성 (SI_YYYYMMDD_XXXXX, EC_YYYYMMDD_XXXXX)
- 시퀀스 번호 자동 증가
- EXPENSE_MASTER 테이블 IS_CLOSED 플래그 자동 업데이트

---

### Servlet (API Endpoint)

#### JvWorksGetSpecialItems

- **엔드포인트**: `/api/special-items`
- **GET**: 특별항목 조회
  ```
  GET /api/special-items?factoryCode=F001&monthYm=2025-01
  ```
- **POST**: 특별항목 등록
  ```
  POST /api/special-items
  {
    "factoryCode": "F001",
    "monthYm": "2025-01",
    "department": "소담",
    "itemName": "점심",
    "amount": 150000,
    "quantity": 1,
    "unitPrice": 150000,
    "memo": "점심비",
    "createdBy": "ADMIN"
  }
  ```
- **PUT**: 특별항목 수정
  ```
  PUT /api/special-items
  {
    "specialItemId": "SI_20250108_00001",
    "department": "소담",
    "itemName": "점심",
    "amount": 160000,
    "quantity": 1,
    "unitPrice": 160000,
    "memo": "수정된 점심비",
    "updatedBy": "ADMIN"
  }
  ```
- **DELETE**: 특별항목 삭제
  ```
  DELETE /api/special-items?specialItemId=SI_20250108_00001
  ```

#### JvWorksCloseExpense

- **엔드포인트**: `/api/expense-closing`
- **GET**: 마감 데이터 조회

  ```
  // 월별 조회
  GET /api/expense-closing?factoryCode=F001&monthYm=2025-01

  // 사용자별 조회
  GET /api/expense-closing?factoryCode=F001&monthYm=2025-01&userId=EMP001

  // 단일 조회
  GET /api/expense-closing?action=single&closingId=EC_20250108_00001
  ```

- **POST**: 경비 마감 처리
  ```
  POST /api/expense-closing
  {
    "factoryCode": "F001",
    "monthYm": "2025-01",
    "userId": "EMP001",
    "userName": "김철수",
    "department": "소담",
    "totalExpense": 1500000,
    "fuelExpense": 300000,
    "specialItemExpense": 350000,
    "totalAmount": 2150000,
    "expenseDetails": "{...json...}",
    "fuelDetails": "{...json...}",
    "specialItemDetails": "{...json...}",
    "closedBy": "ADMIN",
    "remark": "2025년 1월 마감"
  }
  ```
- **PUT**: 마감 재개
  ```
  PUT /api/expense-closing
  {
    "closingId": "EC_20250108_00001",
    "reopenedBy": "ADMIN"
  }
  ```

---

## 🎨 Frontend 구현

### 1. SpecialItems.js (특별 항목 관리 페이지)

**위치**: `/src/works/SpecialItems.js`

**기능:**

- 월별 특별 항목 조회
- 부서별로 그룹화된 목록 표시
- 항목 추가/수정/삭제
- 부서별 소계 및 총합 표시

**주요 UI 컴포넌트:**

- 월 선택 드롭다운
- 항목 추가 버튼
- 부서별 테이블 (항목명, 수량, 단가, 총액, 비고)
- 수정/삭제 버튼

**접근 제어:**

- 관리자 모드(`?mode=manager`) 필수

---

### 2. ExpenseSummary.js (경비 청구 집계 페이지)

**위치**: `/src/works/ExpenseSummary.js`

**기능:**

- 월별 마감된 경비 데이터 조회
- 사용자별 청구 내역 표시
- 부서별 집계 현황
- 전체 합계 표시
- 특별항목 현황 표시

**주요 UI 컴포넌트:**

1. **특별항목 현황 섹션**

   - 부서별 특별항목 금액 카드 형태 표시

2. **사용자별 청구 내역 테이블**

   - 사용자명, 부서, 일반경비, 유류비, 특별항목, 합계
   - 마감일시, 상태, 마감 재개 버튼

3. **부서별 집계 테이블**

   - 부서명, 인원, 일반경비, 유류비, 특별항목, 합계

4. **전체 합계 섹션**
   - 그래디언트 배경의 카드 형태
   - 일반경비, 유류비, 특별항목, 전체 청구액 표시

**접근 제어:**

- 관리자 모드(`?mode=manager`) 필수

---

### 3. CSS 스타일

#### SpecialItems.css

- 폼 스타일: 부서명/항목명 선택, 수량/단가/총액 입력
- 테이블 스타일: 부서별 그룹화, 소계 행
- 반응형 디자인 지원

#### ExpenseSummary.css

- 카드 형태의 특별항목 현황
- 다중 테이블 레이아웃
- 그래디언트 배경의 합계 섹션
- 모바일 반응형 디자인

---

### 4. App.js 라우트 등록

```javascript
// 컴포넌트 import
import SpecialItems from './works/SpecialItems';
import ExpenseSummary from './works/ExpenseSummary';

// 라우트 추가
<Route path="/works/special-items" element={<SpecialItems />}></Route>
<Route path="/works/expense-summary" element={<ExpenseSummary />}></Route>
```

---

### 5. Works 메인 페이지 추가

`/src/works/index.js`의 `features` 배열에 추가:

```javascript
{
  title: '특별 항목 관리',
  description: '점심비, 저녁비 등 특별 항목을 관리하세요',
  icon: '🍽️',
  path: '/works/special-items?mode=manager',
  category: '관리',
},
{
  title: '경비 청구 집계',
  description: '월별 마감된 경비 데이터를 집계하여 조회하세요',
  icon: '📈',
  path: '/works/expense-summary?mode=manager',
  category: '관리',
}
```

---

## 🔄 워크플로우

### 특별 항목 등록 흐름

```
1. 관리팀이 특별항목 관리 페이지 접속
   → /works/special-items?mode=manager

2. 월 선택 및 항목 입력
   - 부서명: 소담/세종/기타
   - 항목명: 점심/저녁/간식/기타
   - 수량, 단가, 총액 입력

3. "항목 추가" 버튼 클릭
   → POST /api/special-items

4. 데이터베이스에 저장
   → TB_SPECIAL_ITEMS 테이블에 저장
```

### 월별 마감 흐름

```
1. 관리팀이 경비 청구 집계 페이지 접속
   → /works/expense-summary?mode=manager

2. 월 선택하여 마감 데이터 조회
   → GET /api/expense-closing?factoryCode=F001&monthYm=2025-01

3. 마감할 사용자의 경비 데이터 확인
   - 일반경비, 유류비 합계 확인
   - 특별항목 추가 여부 확인

4. "마감" 버튼 클릭
   → POST /api/expense-closing
   → 마감 데이터 저장
   → EXPENSE_MASTER.IS_CLOSED = 1 업데이트

5. 마감된 데이터는 집계 페이지에 표시
```

### 마감 재개 흐름

```
1. 마감된 데이터의 "재개" 버튼 클릭

2. 확인 다이얼로그 표시

3. 재개 확인 시
   → PUT /api/expense-closing
   → CLOSING_STATUS = 'REOPENED' 업데이트
   → REOPENED_BY, REOPENED_AT 저장

4. 재개된 데이터는 마감 재개 배지 표시
```

---

## 📊 데이터 집계 로직

### 부서별 집계 계산

```javascript
const deptSummary = {};
closingData.forEach((item) => {
  if (!deptSummary[item.department]) {
    deptSummary[item.department] = {
      totalExpense: 0, // 일반경비
      fuelExpense: 0, // 유류비
      specialItemExpense: 0, // 특별항목
      totalAmount: 0, // 합계
      count: 0, // 인원수
    };
  }
  deptSummary[item.department].totalExpense += item.totalExpense;
  deptSummary[item.department].fuelExpense += item.fuelExpense;
  deptSummary[item.department].totalAmount += item.totalAmount;
  deptSummary[item.department].count += 1;
});
```

### 특별항목 부서별 집계

```javascript
const specialItemsDept = {};
specialItems.forEach((item) => {
  if (!specialItemsDept[item.department]) {
    specialItemsDept[item.department] = 0;
  }
  specialItemsDept[item.department] += item.amount;
});
```

### 전체 합계

```javascript
const grandTotal = {
  totalExpense: closingData.reduce((sum, item) => sum + item.totalExpense, 0),
  fuelExpense: closingData.reduce((sum, item) => sum + item.fuelExpense, 0),
  totalAmount: closingData.reduce((sum, item) => sum + item.totalAmount, 0),
};
```

---

## 🔒 보안 및 접근 제어

1. **관리자 모드 필수**

   - `?mode=manager` 쿼리 파라미터 확인
   - 없으면 접근 권한 없음 메시지 표시

2. **데이터 소유권 확인**

   - 백엔드에서 사용자 권한 검증
   - 부정 접근 시 403/401 에러 반환

3. **마감된 데이터 불변**
   - CLOSING_STATUS = 'CLOSED'인 데이터는 수정 불가
   - 재개만 가능 (관리자만)

---

## 📱 반응형 디자인

- **데스크톱**: 전체 테이블 및 그리드 표시
- **태블릿**: 그리드 2열로 축소
- **모바일**:
  - 폼: 단일 열
  - 테이블: 수평 스크롤 가능
  - 버튼: 100% 너비

---

## 🚀 배포 및 테스트

### 데이터베이스 스크립트 실행

```sql
-- SQL 스크립트 실행
cd backend/sql
sqlcmd -S [서버] -U [사용자] -P [암호] -d [데이터베이스]
       -i create_expense_summary_tables_mssql.sql
```

### 백엔드 빌드 및 배포

```bash
# Java 컴파일
javac -d bin src/com/api/DAO/ExpenseSummaryDAO.java
javac -d bin src/com/api/DTO/SpecialItemDTO.java
javac -d bin src/com/api/DTO/ExpenseClosingDTO.java
javac -d bin src/com/api/servlet/JvWorksGetSpecialItems.java
javac -d bin src/com/api/servlet/JvWorksCloseExpense.java

# WAR 파일로 패키징 후 WAS에 배포
```

### 프론트엔드 빌드 및 배포

```bash
# React 빌드
npm run build

# 배포
# 또는 자동 배포 설정 (CI/CD)
```

---

## ✅ 체크리스트

- [x] 데이터베이스 테이블 설계 및 생성 스크립트 작성
- [x] DTO 클래스 작성
- [x] DAO 클래스 구현 (CRUD 메서드)
- [x] Servlet/API 엔드포인트 구현
- [x] React 컴포넌트 작성 (SpecialItems.js, ExpenseSummary.js)
- [x] CSS 스타일시트 작성
- [x] App.js 라우트 등록
- [x] Works 메인 페이지 기능 추가
- [ ] 통합 테스트 실행
- [ ] 사용자 테스트 및 피드백 수집
- [ ] 배포

---

## 📚 참고 자료

- **테이블 구조**: `backend/sql/create_expense_summary_tables_mssql.sql`
- **DAO 구현**: `backend/DAO/ExpenseSummaryDAO.java`
- **DTO**: `backend/DTO/SpecialItemDTO.java`, `backend/DTO/ExpenseClosingDTO.java`
- **API**: `backend/servlet/JvWorksGetSpecialItems.java`, `backend/servlet/JvWorksCloseExpense.java`
- **React 컴포넌트**: `src/works/SpecialItems.js`, `src/works/ExpenseSummary.js`

---

## 🔧 향후 개선사항

1. **엑셀 다운로드 기능**

   - 월별 집계 데이터를 엑셀 파일로 다운로드

2. **이메일 알림**

   - 마감 마감 시간 전 이메일 알림
   - 마감 완료 시 담당자에게 통지

3. **결재 워크플로우**

   - CFO 승인 단계 추가
   - 결재 히스토리 추적

4. **데이터 분석**

   - 월별, 부서별, 사용자별 경비 추이 분석
   - 예산 대비 실제 경비 비교

5. **API 개선**
   - 배치 작업으로 월말 자동 마감
   - 실시간 집계 데이터 동기화
