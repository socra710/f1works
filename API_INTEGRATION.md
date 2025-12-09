# 경비 청구 시스템 - 실제 API 연동 완료

## 📋 변경 사항 요약

### 1. 프론트엔드 API 서비스 레이어 생성

**파일**: `src/works/expense/expenseAPI.js`

프론트엔드에서 백엔드 API와 통신하기 위한 서비스 모듈을 생성했습니다.

**포함된 함수**:

- `getExpenseClosingByYear(factoryCode, year)` - 연도별 마감 데이터 조회
- `getSpecialItems(factoryCode, monthYm)` - 특별 항목 조회
- `createSpecialItem(item)` - 특별 항목 등록
- `updateSpecialItem(specialItemId, item)` - 특별 항목 수정
- `deleteSpecialItem(specialItemId)` - 특별 항목 삭제
- `closeExpense(closingId, closedBy)` - 경비 마감 처리
- `reopenExpense(closingId, reopenedBy)` - 경비 마감 재개

### 2. 백엔드 API 서블릿 생성

#### 2.1 마감 데이터 조회 API

**파일**: `backend/servlet/JvWorksGetExpenseClosing.java`

- **URL**: `/com/api/jvWorksGetExpenseClosing`
- **메서드**: POST
- **파라미터**:
  - `factoryCode` (필수) - 공장 코드
  - `year` (필수) - 조회 년도 (YYYY 형식)
- **응답**: 마감 데이터 리스트 (JSON)

연도 기준으로 모든 월의 마감 데이터를 조회합니다.

#### 2.2 마감 처리/재개 API

**파일**: `backend/servlet/JvWorksCloseExpenseAPI.java`

- **URL**: `/com/api/jvWorksCloseExpense`
- **메서드**:
  - POST - 마감 처리
  - PUT - 마감 재개
- **요청 본문**:
  ```json
  {
    "closingId": "EC_20250101_00001",
    "closedBy": "admin" // 또는 reopenedBy
  }
  ```

#### 2.3 특별 항목 조회 API

**파일**: `backend/servlet/JvWorksGetSpecialItemsAPI.java`

- **URL**: `/com/api/jvWorksGetSpecialItems`
- **메서드**: POST
- **파라미터**:
  - `factoryCode` (필수) - 공장 코드
  - `monthYm` (필수) - 조회 년월 (YYYY-MM 형식)
- **응답**: 특별 항목 리스트 (JSON)

### 3. ExpenseSummary.js 업데이트

**변경 내용**:

1. Mock 데이터 제거 - 실제 API 호출로 변경
2. `loadSummaryData()` 함수 리팩토링
   - `getExpenseClosingByYear()` API 호출
   - `getSpecialItems()` API 호출
   - API 응답 데이터 포맷 변환
3. `handleCloseExpense()` 함수 업데이트
   - `closeExpense()` API 호출
4. `handleReopenClosing()` 함수 업데이트
   - `reopenExpense()` API 호출

### 4. Expense.js 업데이트

**변경 내용**:

- 카테고리 배열에 `FUEL` 코드 추가
  ```javascript
  { code: 'FUEL', name: '유류비' }
  ```

## 📊 데이터 흐름

```
React UI (ExpenseSummary.js)
    ↓
expenseAPI.js (Fetch API)
    ↓
Backend Servlets
    ↓
ExpenseSummaryDAO (DB 조회)
    ↓
Database (TB_EXPENSE_CLOSING, TB_SPECIAL_ITEMS)
```

## 🔄 주요 API 호출 흐름

### 초기 데이터 로드

1. `ExpenseSummary` 컴포넌트 마운트
2. `useEffect` → `loadSummaryData()` 호출
3. `getExpenseClosingByYear()` → `/com/api/jvWorksGetExpenseClosing` 호출
4. DAO에서 DB 조회 (12개월 데이터)
5. 데이터 변환 후 상태 업데이트
6. `getSpecialItems()` → `/com/api/jvWorksGetSpecialItems` 호출
7. 특별 항목 데이터 상태 업데이트

### 마감 처리

1. 사용자 "마감" 버튼 클릭
2. Dialog 확인
3. `closeExpense()` → `/com/api/jvWorksCloseExpense` (POST) 호출
4. 응답 확인 후 Toast 메시지 표시
5. 데이터 다시 로드

### 마감 재개

1. 사용자 "재개" 버튼 클릭
2. Dialog 확인
3. `reopenExpense()` → `/com/api/jvWorksCloseExpense` (PUT) 호출
4. DAO의 `reopenClosing()` 메서드 실행
5. DB 업데이트 (CLOSING_STATUS = 'REOPENED')
6. 응답 확인 후 Toast 메시지 표시
7. 데이터 다시 로드

## 🔧 환경 설정

### 필수 환경 변수

```
REACT_APP_API_BASE_URL = http://localhost:8080/f1works
```

### web.xml 설정 (예시)

```xml
<context-param>
  <param-name>driver</param-name>
  <param-value>com.microsoft.sqlserver.jdbc.SQLServerDriver</param-value>
</context-param>
<context-param>
  <param-name>url</param-name>
  <param-value>jdbc:sqlserver://localhost:1433;databaseName=f1works;encrypt=true;trustServerCertificate=true</param-value>
</context-param>
<context-param>
  <param-name>username</param-name>
  <param-value>sa</param-value>
</context-param>
<context-param>
  <param-name>password</param-name>
  <param-value>your_password</param-value>
</context-param>
```

## 📝 카테고리 매핑

| 코드     | 한글명     | 대분류     | 소분류     |
| -------- | ---------- | ---------- | ---------- |
| LUNCH    | 점심       | 식비       | 점심       |
| DINNER   | 저녁       | 식비       | 저녁       |
| PARTY    | 회식비     | 비식비     | 회식비     |
| MEETING  | 회의비     | 비식비     | 회의비     |
| UTILITY  | 공공요금   | 비식비     | 공공요금   |
| **FUEL** | **유류비** | **비식비** | **유류비** |
| ETC      | 기타       | 비식비     | 기타       |

## ✅ 테스트 체크리스트

- [ ] 연도 변경 시 마감 데이터 조회 확인
- [ ] API 응답 데이터 형식 확인
- [ ] 마감 처리 기능 테스트
- [ ] 마감 재개 기능 테스트
- [ ] 특별 항목 조회 테스트
- [ ] 에러 처리 및 토스트 메시지 확인
- [ ] 브라우저 콘솔 에러 확인

## 🚀 다음 단계

1. **실제 데이터 검증**

   - DB에 실제 마감 데이터 존재 확인
   - 데이터 포맷 일치 확인

2. **추가 기능**

   - 마감 데이터 세부 조회 (expandable rows)
   - 특별 항목 CRUD 기능 구현
   - 마감 데이터 엑셀 다운로드

3. **성능 최적화**

   - 페이지네이션 구현
   - 데이터 캐싱
   - API 응답 시간 모니터링

4. **보안**
   - 관리자 권한 검증 강화
   - CSRF 토큰 구현
   - 데이터 암호화

## 📞 지원

문제 발생 시:

1. 브라우저 개발자 도구(F12) 콘솔 확인
2. 네트워크 탭에서 API 요청/응답 확인
3. 백엔드 로그 파일 확인
