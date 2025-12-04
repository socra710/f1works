/**
 * 공통 토스트 및 다이얼로그 사용 예시
 */

// 1. 토스트 사용법
import { useToast } from '../common/Toast';

function MyComponent() {
  const { showToast } = useToast();

  // 성공 메시지
  const handleSuccess = () => {
    showToast('작업이 완료되었습니다.', 'success');
  };

  // 에러 메시지
  const handleError = () => {
    showToast('작업 중 오류가 발생했습니다.', 'error');
  };

  // 경고 메시지
  const handleWarning = () => {
    showToast('주의: 작업을 다시 확인해주세요.', 'warning');
  };

  // 정보 메시지
  const handleInfo = () => {
    showToast('이것은 정보 메시지입니다.', 'info');
  };

  // 커스텀 duration (5초)
  const handleCustomDuration = () => {
    showToast('5초 동안 표시됩니다.', 'info', 5000);
  };

  // 무한 표시 (duration: 0)
  const handlePersistent = () => {
    showToast('X 버튼을 눌러 닫으세요.', 'info', 0);
  };

  return (
    <div>
      <button onClick={handleSuccess}>성공 토스트</button>
      <button onClick={handleError}>에러 토스트</button>
      <button onClick={handleWarning}>경고 토스트</button>
      <button onClick={handleInfo}>정보 토스트</button>
      <button onClick={handleCustomDuration}>커스텀 시간 토스트</button>
      <button onClick={handlePersistent}>무한 토스트</button>
    </div>
  );
}

// ========================================

// 2. 다이얼로그 사용법
import { useDialog } from '../common/Toast';

function DialogExample() {
  const { showDialog } = useDialog();

  // 기본 확인 다이얼로그
  const handleConfirm = () => {
    showDialog({
      title: '삭제 확인',
      message: '정말 삭제하시겠습니까?',
      okText: '삭제',
      cancelText: '취소',
      onOk: () => {
        console.log('삭제됨');
      },
      onCancel: () => {
        console.log('취소됨');
      },
      type: 'confirm',
    });
  };

  // Alert 다이얼로그 (취소 버튼 없음)
  const handleAlert = () => {
    showDialog({
      title: '알림',
      message: '작업이 완료되었습니다.',
      okText: '확인',
      onOk: () => {
        console.log('확인됨');
      },
      type: 'alert',
    });
  };

  // 복잡한 메시지
  const handleComplex = () => {
    showDialog({
      title: '경고',
      message: `이 작업은 되돌릴 수 없습니다.\n\n정말 계속하시겠습니까?`,
      okText: '계속',
      cancelText: '취소',
      onOk: () => {
        console.log('계속함');
      },
      type: 'confirm',
    });
  };

  return (
    <div>
      <button onClick={handleConfirm}>확인 다이얼로그</button>
      <button onClick={handleAlert}>알림 다이얼로그</button>
      <button onClick={handleComplex}>복잡한 다이얼로그</button>
    </div>
  );
}

// ========================================

// 3. Expense.js에서 사용 예시

// 기존 코드:
// if (!sessionUser) {
//   alert('로그인이 필요한 서비스입니다.');
//   navigate('/works');
// }

// 변경 코드:
import { useDialog } from '../common/Toast';

export default function Expense() {
  const { showDialog } = useDialog();

  const initializeExpense = (user) => {
    const sessionUser = window.sessionStorage.getItem('extensionLogin');
    if (!sessionUser) {
      showDialog({
        title: '로그인 필요',
        message: '로그인이 필요한 서비스입니다.',
        okText: '확인',
        onOk: () => {
          navigate('/works');
        },
        type: 'alert',
      });
      return;
    }
  };
}

// ========================================

// 4. window.confirm 대체 예시

// 기존 코드:
// const handleApprove = async () => {
//   if (!window.confirm('이 경비 청구를 승인하시겠습니까?')) return;
//   await updateExpenseStatus('APPROVED');
// };

// 변경 코드:
const handleApprove = async () => {
  showDialog({
    title: '승인 확인',
    message: '이 경비 청구를 승인하시겠습니까?',
    okText: '승인',
    cancelText: '취소',
    onOk: () => {
      updateExpenseStatus('APPROVED');
    },
    type: 'confirm',
  });
};
