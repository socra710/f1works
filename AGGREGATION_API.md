# 경비 청구 시스템 - 집계 API 연동 완료

## 📋 변경 사항 요약

### 1. 집계 데이터 조회 API 생성

#### 새로운 백엔드 DAO

**파일**: `backend/DAO/ExpenseAggregationDAO.java`

승인된 경비 데이터를 카테고리별, 월별로 집계하는 DAO 클래스

**포함된 메서드**:

- `getAggregatedExpenseByYear()` - 연도별 카테고리 집계
- `getAggregatedExpenseByMonth()` - 월별 카테고리 집계
- `getAggregatedExpenseByUser()` - 사용자별 집계
- `getDetailedAggregationByYear()` - 상세 집계 (카테고리별 월별 데이터)

#### 새로운 백엔드 Servlet

**파일**: `backend/servlet/JvWorksGetExpenseAggregation.java`

- **URL**: `/com/api/jvWorksGetExpenseAggregation`
- **메서드**: POST
- **파라미터**:
  - `factoryCode` (필수) - 공장 코드
  - `year` (선택) - 조회 년도 (YYYY 형식)
  - `monthYm` (선택) - 조회 년월 (YYYY-MM 형식)
  - `type` (선택) - 조회 유형: "year", "month", "user", "detailed"
- **응답**: 집계 데이터 (JSON)

### 2. 프론트엔드 API 서비스 업데이트

**파일**: `src/works/expense/expenseAPI.js`

**새로운 함수**:

- `getExpenseAggregationByYear()` - 연도별 집계 조회
- `getExpenseAggregationByMonth()` - 월별 집계 조회
- `getExpenseAggregationByUser()` - 사용자별 집계 조회
- `getDetailedAggregation()` - 상세 집계 조회

**제거된 함수**:

- `closeExpense()` - 마감 처리 (불필요)
- `reopenExpense()` - 마감 재개 (불필요)

### 3. ExpenseSummary.js 업데이트

**변경 사항**:

1. 마감 처리 관련 UI 제거
   - "마감" 버튼 제거
   - "재개" 버튼 제거
2. 마감 처리 핸들러 함수 제거
   - `handleCloseExpense()` 제거
   - `handleReopenClosing()` 제거
3. API 호출 변경
   - `getExpenseClosingByYear()` → `getExpenseAggregationByYear()` 변경
   - 승인된 경비 데이터 직접 집계
4. 데이터 구조 단순화
   - `monthYm`, `category`, `totalAmount`, `itemCount` 만 사용

## 📊 데이터 흐름

```
React UI (ExpenseSummary.js)
    ↓
expenseAPI.js (getExpenseAggregationByYear)
    ↓
Backend Servlet (JvWorksGetExpenseAggregation)
    ↓
ExpenseAggregationDAO
    ↓
SQL Query (EXPENSE_MASTER, EXPENSE_DETAIL)
    ↓
Database
```

## 💾 데이터베이스 조회

**쿼리 로직** (STATUS = 'APPROVED' 조건):

```sql
SELECT
  FORMAT(CAST(EM.MONTH_YM + '-01' AS DATE), 'yyyy-MM') AS monthYm,
  ED.CATEGORY,
  SUM(ED.AMOUNT) AS totalAmount,
  COUNT(*) AS itemCount
FROM EXPENSE_MASTER EM
INNER JOIN EXPENSE_DETAIL ED ON EM.EXPENSE_ID = ED.EXPENSE_ID
WHERE EM.FACTORY_CODE = ?
  AND YEAR(...) = ?
  AND EM.STATUS = 'APPROVED'
GROUP BY EM.MONTH_YM, ED.CATEGORY
```

## 🔄 API 응답 포맷

### 연도별 집계 응답

```json
{
  "success": "true",
  "message": "OK",
  "data": [
    {
      "monthYm": "2025-01",
      "category": "LUNCH",
      "totalAmount": 1504800,
      "itemCount": 5
    }
  ]
}
```

## 🔧 환경 설정

### 필수 환경 변수

```
REACT_APP_API_BASE_URL = http://localhost:8080/f1works
```

## 📝 카테고리 코드

| 코드    | 한글명   | 대분류 |
| ------- | -------- | ------ |
| LUNCH   | 점심     | 식비   |
| DINNER  | 저녁     | 식비   |
| PARTY   | 회식비   | 비식비 |
| MEETING | 회의비   | 비식비 |
| UTILITY | 공공요금 | 비식비 |
| FUEL    | 유류비   | 비식비 |
| ETC     | 기타     | 비식비 |

## ✅ 주요 변경 사항

### 마감 처리 기능 제거 완료

- ✅ 마감 처리/재개 Servlet 사용 안 함
- ✅ 마감 처리/재개 핸들러 제거
- ✅ 마감 처리 UI 버튼 제거

### 집계 기능 추가

- ✅ 승인된 경비만 조회 (STATUS = 'APPROVED')
- ✅ 카테고리별 월별 집계
- ✅ 사용자별 집계
- ✅ 상세 집계 데이터

### 데이터 흐름 단순화

- ✅ 마감 테이블 의존성 제거
- ✅ 경비 마스터 테이블에서 직접 집계
- ✅ 모든 승인된 데이터 실시간 반영

## 🚀 다음 단계

1. **테이블 렌더링**

   - 월별 카테고리 집계표 렌더링 확인
   - 소계 행 계산 정확성 확인

2. **추가 기능**

   - 사용자별 집계 탭 추가 (선택사항)
   - 카테고리별 상세 조회 (drill-down)
   - 데이터 엑셀 다운로드

3. **성능 최적화**
   - API 응답 시간 모니터링
   - 캐싱 전략 수립

## 📞 문제 해결

**API 호출 실패 시**:

1. 브라우저 개발자 도구(F12) → Network 탭 확인
2. API 요청/응답 확인
3. 백엔드 로그 파일 확인

**데이터가 없을 때**:

1. DB에 STATUS = 'APPROVED'인 경비 데이터 존재 확인
2. 선택한 년도의 경비 데이터 확인
3. EXPENSE_MASTER, EXPENSE_DETAIL 테이블 조인 확인
