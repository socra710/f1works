import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminPage.module.css';
import '../index.css';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../common/extensionLogin';
import { useToast } from '../../common/Toast';
import { checkAdminStatus } from '../expense/expenseAPI';
import { fetchAdminList, addAdmin, removeAdmin, searchUsers } from './adminAPI';
import { menuOptions } from './constants';
import MenuAdminForm from './components/MenuAdminForm';
import GlobalAdminForm from './components/GlobalAdminForm';
import AdminList from './components/AdminList';

// menuOptions moved to ./constants

export default function AdminPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [menuAdmins, setMenuAdmins] = useState([]);
  const [globalAdmins, setGlobalAdmins] = useState([]);

  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuSearchResults, setMenuSearchResults] = useState([]);
  const [selectedMenuUsers, setSelectedMenuUsers] = useState([]);
  const [selectedMenuKey, setSelectedMenuKey] = useState(menuOptions[0].key);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [selectedGlobalUsers, setSelectedGlobalUsers] = useState([]);

  const selectedMenu = useMemo(
    () =>
      menuOptions.find((opt) => opt.key === selectedMenuKey) || menuOptions[0],
    [selectedMenuKey]
  );

  // getInitials moved to ./utils and used in child components

  const loadMenuAdmins = async (userId, menuKey) => {
    try {
      const menus = await fetchAdminList({
        userId,
        scopeType: 'MENU',
        menuKey,
      });
      setMenuAdmins((menus || []).filter((item) => item.isActive !== 'N'));
    } catch (err) {
      console.error('[AdminPage] loadAdmins error', err);
      showToast(err.message || '관리자 목록을 불러오지 못했습니다.', 'error');
    }
  };

  const loadGlobalAdmins = async (userId) => {
    try {
      const admins = await fetchAdminList({
        userId,
        scopeType: 'GLOBAL',
        menuKey: 'GLOBAL',
      });
      setGlobalAdmins((admins || []).filter((item) => item.isActive !== 'N'));
    } catch (err) {
      console.error('[AdminPage] loadGlobalAdmins error', err);
      showToast(
        err.message || '전체 관리자 목록을 불러오지 못했습니다.',
        'error'
      );
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const sessionUser = await waitForExtensionLogin({
          minWait: 300,
          maxWait: 1500,
        });
        if (!sessionUser) {
          showToast('로그인이 필요한 서비스입니다.', 'warning');
          navigate('/works');
          return;
        }
        const decoded = (decodeUserId(sessionUser) || '').trim();
        const isSuper = await checkAdminStatus(decoded);
        if (!isSuper) {
          showToast('슈퍼관리자만 접근할 수 있습니다.', 'warning');
          navigate('/works');
          return;
        }
        setCurrentUserId(decoded);
        await Promise.all([
          loadMenuAdmins(decoded, selectedMenuKey),
          loadGlobalAdmins(decoded),
        ]);
      } catch (err) {
        console.error('[AdminPage] init error', err);
        showToast('권한 확인 중 오류가 발생했습니다.', 'error');
        navigate('/works');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    loadMenuAdmins(currentUserId, selectedMenuKey);
    loadGlobalAdmins(currentUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMenuKey, currentUserId]);

  const handleMenuSearch = async () => {
    if (!menuSearchTerm.trim()) {
      showToast('검색어를 입력하세요.', 'info');
      return;
    }
    try {
      const results = await searchUsers({ query: menuSearchTerm.trim() });
      setMenuSearchResults(results);
    } catch (err) {
      console.error('[AdminPage] menu search error', err);
      showToast(err.message, 'error');
    }
  };

  const handleAddMenu = async () => {
    if (!selectedMenuUsers?.length) {
      showToast('등록할 사용자를 선택하세요.', 'warning');
      return;
    }
    try {
      for (const u of selectedMenuUsers) {
        await addAdmin({
          userId: currentUserId,
          targetUserId: u.userId,
          targetUserName: u.userName,
          scopeType: 'MENU',
          menuKey: selectedMenu.key,
          menuName: selectedMenu.label,
        });
      }
      showToast(
        `${selectedMenuUsers.length}명 메뉴 관리자로 등록되었습니다.`,
        'success'
      );
      setSelectedMenuUsers([]);
      setMenuSearchResults([]);
      setMenuSearchTerm('');
      await loadMenuAdmins(currentUserId, selectedMenu.key);
    } catch (err) {
      console.error('[AdminPage] add menu error', err);
      showToast(err.message, 'error');
    }
  };

  const handleGlobalSearch = async () => {
    if (!globalSearchTerm.trim()) {
      showToast('검색어를 입력하세요.', 'info');
      return;
    }
    try {
      const results = await searchUsers({ query: globalSearchTerm.trim() });
      setGlobalSearchResults(results);
    } catch (err) {
      console.error('[AdminPage] global search error', err);
      showToast(err.message, 'error');
    }
  };

  const handleAddGlobal = async () => {
    if (!selectedGlobalUsers?.length) {
      showToast('등록할 사용자를 선택하세요.', 'warning');
      return;
    }
    try {
      for (const u of selectedGlobalUsers) {
        await addAdmin({
          userId: currentUserId,
          targetUserId: u.userId,
          targetUserName: u.userName,
          scopeType: 'GLOBAL',
          menuKey: 'GLOBAL',
          menuName: 'GLOBAL',
        });
      }
      showToast(
        `${selectedGlobalUsers.length}명 전체 관리자로 등록되었습니다.`,
        'success'
      );
      setSelectedGlobalUsers([]);
      setGlobalSearchResults([]);
      setGlobalSearchTerm('');
      await loadGlobalAdmins(currentUserId);
    } catch (err) {
      console.error('[AdminPage] add global error', err);
      showToast(err.message, 'error');
    }
  };

  const handleRemove = async ({ userId, scopeType, menuKey }) => {
    if (!window.confirm('관리자 권한을 해지하시겠습니까?')) return;
    try {
      await removeAdmin({
        userId: currentUserId,
        targetUserId: userId,
        scopeType,
        menuKey,
      });
      showToast('권한이 해지되었습니다.', 'success');
      await Promise.all([
        loadMenuAdmins(currentUserId, selectedMenuKey),
        loadGlobalAdmins(currentUserId),
      ]);
    } catch (err) {
      console.error('[AdminPage] remove error', err);
      showToast(err.message, 'error');
    }
  };

  const toggleSelectUser = (list, setter, user) => {
    const exists = list.find((x) => x.userId === user.userId);
    if (exists) {
      setter(list.filter((x) => x.userId !== user.userId));
    } else {
      setter([...list, user]);
    }
  };

  // list rendering moved to AdminList component

  if (loading) {
    return (
      <div className={styles.adminContainer}>
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
    <div className={styles.adminContainer}>
      <div className={styles.adminContent}>
        {loading && (
          <div
            className={styles.loadingBar}
            role="status"
            aria-label="데이터 로딩 중"
          >
            <div className={styles.loadingBarIndicator} />
          </div>
        )}

        {/* Top: Single Page Header */}
        <div className={styles.adminHeader}>
          <div className={styles.adminHeaderText}>
            <h1>관리자 설정</h1>
            <p className={styles.heroSub}>
              회사 전체 및 메뉴별 관리자 권한을 검색·등록·해지합니다.
            </p>
          </div>
          <div className={styles.adminHeaderActions}>
            <button
              className={styles.btnHome}
              onClick={() => navigate('/works')}
            >
              홈으로
            </button>
          </div>
        </div>

        {/* Below: Two Columns */}
        <div className={styles.columns}>
          {/* Left: GLOBAL Admin */}
          <div className={styles.column}>
            <GlobalAdminForm
              globalSearchTerm={globalSearchTerm}
              onChangeSearchTerm={setGlobalSearchTerm}
              onSearch={handleGlobalSearch}
              onAdd={handleAddGlobal}
              selectedUsers={selectedGlobalUsers}
              onClearSelected={() => setSelectedGlobalUsers([])}
              searchResults={globalSearchResults}
              onToggleUser={(user) =>
                toggleSelectUser(
                  selectedGlobalUsers,
                  setSelectedGlobalUsers,
                  user
                )
              }
            />

            <AdminList
              admins={globalAdmins.map((a) => ({ ...a, scopeType: 'GLOBAL' }))}
              onRemove={handleRemove}
              title="등록된 전체 관리자"
            />
          </div>

          {/* Right: MENU Admin */}
          <div className={styles.column}>
            <MenuAdminForm
              menuOptions={menuOptions}
              selectedMenuKey={selectedMenuKey}
              onChangeMenuKey={setSelectedMenuKey}
              menuSearchTerm={menuSearchTerm}
              onChangeSearchTerm={setMenuSearchTerm}
              onSearch={handleMenuSearch}
              onAdd={handleAddMenu}
              selectedUsers={selectedMenuUsers}
              onClearSelected={() => setSelectedMenuUsers([])}
              searchResults={menuSearchResults}
              onToggleUser={(user) =>
                toggleSelectUser(selectedMenuUsers, setSelectedMenuUsers, user)
              }
            />

            <AdminList
              admins={menuAdmins.map((a) => ({ ...a, scopeType: 'MENU' }))}
              onRemove={handleRemove}
              title="등록된 메뉴별 관리자"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
