import React, { useState, useEffect } from 'react';
import styles from './Hardware.module.css';
import HardwareForm from './HardwareForm';
import HardwareInfo from './components/HardwareInfo';
import HardwareFilter from './components/HardwareFilter';
import HardwareTable from './components/HardwareTable';
import { useHardwareAPI } from './hooks/useHardwareAPI';

const Hardware = () => {
  const { hardwareList, loading, fetchHardwareList, deleteHardware } =
    useHardwareAPI();
  const [showForm, setShowForm] = useState(false);
  const [selectedHardware, setSelectedHardware] = useState(null);
  const [filter, setFilter] = useState('all'); // all, new, repair
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const sessionUser = window.sessionStorage.getItem('extensionLogin');

    let decodedUser = sessionUser || '';
    if (sessionUser) {
      try {
        decodedUser = atob(sessionUser);
      } catch (e) {
        decodedUser = sessionUser;
      }
    }

    if (!decodedUser || !decodedUser.trim()) {
      alert('로그인이 필요한 서비스입니다.');
      window.location.href = '/works';
      return;
    }

    setIsAuthorized(true);
    setAuthChecked(true);
    fetchHardwareList();
  }, [fetchHardwareList]);

  const handleAdd = () => {
    setSelectedHardware(null);
    setShowForm(true);
  };

  const handleEdit = (hardware) => {
    setSelectedHardware(hardware);
    setShowForm(true);
  };

  const handleDelete = async (hwId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    const success = await deleteHardware(hwId);
    if (success) {
      fetchHardwareList();
    }
  };

  const handleFormClose = (refresh) => {
    setShowForm(false);
    setSelectedHardware(null);
    if (refresh) {
      fetchHardwareList();
    }
  };

  const filteredList = hardwareList.filter((hw) => {
    if (filter === 'all') return true;
    if (filter === 'new') return hw.category === '신규납품';
    if (filter === 'repair') return hw.category === '고장회수';
    return true;
  });

  if (!authChecked || !isAuthorized) return null;

  return (
    <div className={styles.hardwareContainer}>
      <div className={styles.hardwareContent}>
        <div className={styles.hardwareHeader}>
          <div className={styles.hardwareHeaderText}>
            <h1>고객사 H/W 관리대장</h1>
            <p className={styles['hero-sub']}>
              고객사에서 사용하는 H/W 자산을 관리합니다. 납품 및 A/S 접수 내역을
              기록하고 조회할 수 있습니다.
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
        />

        <HardwareTable
          filteredList={filteredList}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
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
