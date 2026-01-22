import React from 'react';
import { getInitials } from '../utils';
import { menuOptions } from '../constants';
import styles from '../AdminPage.module.css';

export default function AdminList({
  admins,
  onRemove,
  onToggleNotification,
  title = '등록된 관리자',
}) {
  const getMenuLabel = (menuKey) => {
    const menu = menuOptions.find((m) => m.key === menuKey);
    return menu ? menu.label : menuKey;
  };
  return (
    <div className={styles.list}>
      <div className={styles.listHead}>{title}</div>
      {!admins || admins.length === 0 ? (
        <div className={styles.emptyState}>메뉴별 관리자가 아직 없어요 📁</div>
      ) : (
        admins.map((admin) => (
          <div
            key={`${admin.userId}-${admin.menuKey || 'GLOBAL'}`}
            className={styles.row}
          >
            <div className={styles.rowLeft}>
              <span className={styles.avatar}>
                {getInitials(admin.userName || admin.userId)}
              </span>
              <div className={styles.rowText}>
                <div className={styles.rowTitle}>
                  {admin.userName || admin.userId}
                </div>
                <div className={styles.rowSub}>
                  {admin.scopeType === 'MENU' ? (
                    <>
                      <span className={`${styles.badge} ${styles.neutral}`}>
                        {getMenuLabel(admin.menuKey)}
                      </span>
                      <span className={styles.badge}>MENU</span>
                    </>
                  ) : (
                    <span className={`${styles.badge} ${styles.neutral}`}>
                      GLOBAL
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.rowActions}>
              {onToggleNotification && (
                <button
                  className={styles.toggleButton}
                  onClick={() =>
                    onToggleNotification({
                      userId: admin.userId,
                      scopeType:
                        admin.scopeType || (admin.menuKey ? 'MENU' : 'GLOBAL'),
                      menuKey: admin.menuKey || 'GLOBAL',
                      currentNotificationEnabled: admin.notificationEnabled,
                    })
                  }
                  title={
                    admin.notificationEnabled === 'Y'
                      ? '알림 비활성화'
                      : '알림 활성화'
                  }
                >
                  {admin.notificationEnabled === 'Y' ? '🔔' : '🔕'}
                </button>
              )}
              <button
                className={styles.dangerButton}
                onClick={() =>
                  onRemove({
                    userId: admin.userId,
                    scopeType:
                      admin.scopeType || (admin.menuKey ? 'MENU' : 'GLOBAL'),
                    menuKey: admin.menuKey || 'GLOBAL',
                  })
                }
              >
                해지
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
