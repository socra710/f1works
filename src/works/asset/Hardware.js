import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import styles from './Hardware.module.css';
import HardwareForm from './HardwareForm';
import HardwareInfo from './components/HardwareInfo';
import HardwareFilter from './components/HardwareFilter';
import HardwareTable from './components/HardwareTable';
import { printTransactionSheets } from './components/TransactionPrint';
import { useHardwareAPI } from './hooks/useHardwareAPI';
import { useToast, useDialog } from '../../common/Toast';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../common/extensionLogin';

const Hardware = () => {
  const { hardwareList, loading, fetchHardwareList, deleteHardware } =
    useHardwareAPI();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedHardware, setSelectedHardware] = useState(null);
  const [filter, setFilter] = useState('all'); // all, new, repair
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      const rawUser = await waitForExtensionLogin({
        minWait: 500,
        maxWait: 2000,
      });
      if (!mounted) return;

      const decodedUser = decodeUserId(rawUser);
      if (!decodedUser || !decodedUser.trim()) {
        showToast('로그인이 필요한 서비스입니다.', 'warning');
        navigate('/works');
        return;
      }

      setIsAuthorized(true);
      setAuthChecked(true);
      fetchHardwareList();
    };

    checkAuth();
    return () => {
      mounted = false;
    };
  }, [fetchHardwareList, navigate, showToast]);

  const handleAdd = () => {
    setSelectedHardware(null);
    setShowForm(true);
  };

  const handleEdit = (hardware) => {
    setSelectedHardware(hardware);
    setShowForm(true);
  };

  const handleDelete = async (hwId) => {
    const handleConfirmedDelete = async () => {
      const success = await deleteHardware(hwId);
      if (success) {
        fetchHardwareList();
      }
    };

    showDialog({
      title: '삭제 확인',
      message: '이 항목을 삭제하시겠습니까?',
      okText: '네',
      cancelText: '아니오',
      onOk: handleConfirmedDelete,
      type: 'confirm',
    });
  };

  const handleFormClose = (refresh) => {
    setShowForm(false);
    setSelectedHardware(null);
    if (refresh) {
      fetchHardwareList();
    }
  };

  const onToggleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handlePrintSelected = () => {
    if (!selectedIds.size) return;
    const rows = hardwareList.filter((r) => selectedIds.has(r.hwId));
    printTransactionSheets(rows);
  };

  const filteredList = hardwareList.filter((hw) => {
    const cat = (hw.category || '').replace(/\s/g, '');
    if (filter === 'all') return true;
    if (filter === 'new') return cat === '신규납품';
    if (filter === 'repair') return cat === '고장회수';
    return true;
  });

  // if (!authChecked || !isAuthorized) return null;

  // 변경: 로딩 표시
  if (!authChecked) {
    return (
      <div className={styles.hardwareContainer}>
        <div
          className={styles.loadingBar}
          role="status"
          aria-label="인증 확인 중"
        >
          <div className={styles.loadingBarIndicator} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.hardwareContainer}>
      <Helmet>
        <title>H/W 관리대장</title>
        <meta property="og:title" content="H/W 관리대장" />
        <meta
          property="og:description"
          content="보유 중인 하드웨어 자산을 효율적으로 관리합니다. 납품, A/S, 폐기 등 모든 내역을 한곳에서 기록하고 조회할 수 있습니다."
        />
        <meta
          property="og:url"
          content="https://codefeat.netlify.app/works/asset/hardware"
        />
      </Helmet>
      <div className={styles.hardwareContent}>
        {loading && (
          <div
            className={styles.loadingBar}
            role="status"
            aria-label="데이터 로딩 중"
          >
            <div className={styles.loadingBarIndicator} />
          </div>
        )}
        <div className={styles.hardwareHeader}>
          <div className={styles.hardwareHeaderText}>
            <h1>H/W 관리대장</h1>
            <p className={styles['hero-sub']}>
              보유 중인 하드웨어 자산을 효율적으로 관리합니다. 납품, A/S, 폐기
              등 모든 내역을 한곳에서 기록하고 조회할 수 있습니다.
            </p>
          </div>
          <div className={styles.hardwareHeaderActions}>
            <button className={styles.btnAdd} onClick={handleAdd}>
              + 추가
            </button>
          </div>
        </div>

        <HardwareInfo />

        <HardwareFilter
          filter={filter}
          setFilter={setFilter}
          hardwareList={hardwareList}
          onPrintSelected={handlePrintSelected}
          selectedCount={selectedIds.size}
        />

        <HardwareTable
          filteredList={filteredList}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          filter={filter}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      </div>

      {showForm && (
        <HardwareForm
          hardware={selectedHardware}
          onClose={handleFormClose}
          hardwareList={hardwareList}
        />
      )}
    </div>
  );
};

export default Hardware;
