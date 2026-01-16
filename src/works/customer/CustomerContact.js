import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import styles from './CustomerContact.module.css';
import CustomerContactForm from './CustomerContactForm';
import CustomerContactInfo from './components/CustomerContactInfo';
import CustomerContactFilter from './components/CustomerContactFilter';
import CustomerContactTable from './components/CustomerContactTable';
import { useCustomerContactAPI } from './hooks/useCustomerContactAPI';
import { useToast, useDialog } from '../../common/Toast';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../common/extensionLogin';

const CustomerContact = () => {
  const { contactList, loading, fetchContactList, deleteContact } =
    useCustomerContactAPI();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [filter, setFilter] = useState('all'); // all, normal, warning
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
      fetchContactList();
    };

    checkAuth();
    return () => {
      mounted = false;
    };
  }, [fetchContactList, navigate, showToast]);

  const handleAdd = () => {
    setSelectedContact(null);
    setShowForm(true);
  };

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setShowForm(true);
  };

  const handleDelete = async (contactId) => {
    const handleConfirmedDelete = async () => {
      const success = await deleteContact(contactId);
      if (success) {
        fetchContactList();
      }
    };

    showDialog({
      title: '삭제 확인',
      message: '이 고객 정보를 삭제하시겠습니까?',
      okText: '네',
      cancelText: '아니오',
      onOk: handleConfirmedDelete,
      type: 'confirm',
    });
  };

  const handleFormClose = (refresh) => {
    setShowForm(false);
    setSelectedContact(null);
    if (refresh) {
      fetchContactList();
    }
  };

  const filteredList = contactList.filter((contact) => {
    const isWarning =
      contact.status === 'WARNING' || contact.daysSinceContact >= 90;
    if (filter === 'all') return true;
    if (filter === 'normal') return !isWarning;
    if (filter === 'warning') return isWarning;
    return true;
  });

  if (!authChecked) {
    return (
      <div className={styles.customerContainer}>
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
    <div className={styles.customerContainer}>
      <Helmet>
        <title>고객과의 연결고리</title>
        <meta property="og:title" content="고객과의 연결고리" />
        <meta
          property="og:description"
          content="고객사의 방문, 통화 이력을 관리하고 장기간 컨택이 없는 고객을 자동으로 알림합니다."
        />
        <meta
          property="og:url"
          content="https://codefeat.netlify.app/works/customer/contact"
        />
      </Helmet>
      <div className={styles.customerContent}>
        {loading && (
          <div
            className={styles.loadingBar}
            role="status"
            aria-label="데이터 로딩 중"
          >
            <div className={styles.loadingBarIndicator} />
          </div>
        )}
        <div className={styles.customerHeader}>
          <div className={styles.customerHeaderText}>
            <h1>고객과의 연결고리</h1>
            <p className={styles['hero-sub']}>
              고객사의 방문, 통화 이력을 관리하고 장기간 컨택이 없는 고객을
              자동으로 알림합니다.
            </p>
          </div>
          <div className={styles.customerHeaderActions}>
            <button className={styles.btnAdd} onClick={handleAdd}>
              + 추가
            </button>
          </div>
        </div>

        <CustomerContactInfo contactList={contactList} />

        <CustomerContactFilter
          filter={filter}
          setFilter={setFilter}
          contactList={contactList}
        />

        <CustomerContactTable
          contactList={filteredList}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      </div>

      {showForm && (
        <CustomerContactForm
          contact={selectedContact}
          onClose={handleFormClose}
          contactList={contactList}
        />
      )}
    </div>
  );
};

export default CustomerContact;
