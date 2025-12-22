import { useState, useCallback } from 'react';
import { useToast } from '../../../common/Toast';

const FACTORY_CODE = '000001';

export const useHardwareAPI = () => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { showToast } = useToast();
  const [hardwareList, setHardwareList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHardwareList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/jvWorksGetHardwareList`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          factoryCode: FACTORY_CODE,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setHardwareList(result.data || []);
      } else {
        showToast('데이터를 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      showToast('서버 오류가 발생했습니다.', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, showToast]);

  const deleteHardware = useCallback(
    async (hwId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/jvWorksDeleteHardware`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            factoryCode: FACTORY_CODE,
            hwId,
          }),
        });
        const result = await response.json();
        if (result.success) {
          showToast('삭제되었습니다.', 'success');
          return true;
        } else {
          showToast('삭제에 실패했습니다.', 'error');
          return false;
        }
      } catch (error) {
        showToast('서버 오류가 발생했습니다.', 'error');
        console.error(error);
        return false;
      }
    },
    [API_BASE_URL, showToast]
  );

  return {
    hardwareList,
    loading,
    fetchHardwareList,
    deleteHardware,
    setHardwareList,
  };
};
