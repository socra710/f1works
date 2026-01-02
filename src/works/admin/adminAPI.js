const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ensureBaseUrl = () => {
  if (!API_BASE_URL) {
    throw new Error('REACT_APP_API_BASE_URL 환경변수가 설정되지 않았습니다.');
  }
};

const parseJsonSafe = async (response, fallbackMessage) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    const preview = text ? text.slice(0, 120) : 'no-body';
    throw new Error(
      fallbackMessage ||
        `JSON 응답이 아닙니다. status=${response.status}, body=${preview}`
    );
  }
  return response.json();
};

const assertSuccess = (response, data, fallbackMessage) => {
  if (!response.ok || data.success === false || data.success === 'false') {
    throw new Error(data?.message || fallbackMessage);
  }
};

export const fetchAdminList = async ({ userId, scopeType, menuKey } = {}) => {
  ensureBaseUrl();
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (scopeType) params.append('scopeType', scopeType);
  if (menuKey) params.append('menuKey', menuKey);

  const response = await fetch(
    `${API_BASE_URL}/jvWorksAdmin?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await parseJsonSafe(
    response,
    '관리자 목록 조회에 실패했습니다.'
  );
  assertSuccess(response, data, '관리자 목록 조회에 실패했습니다.');
  return data.list || [];
};

export const addAdmin = async ({
  userId,
  targetUserId,
  targetUserName,
  scopeType = 'GLOBAL',
  menuKey = 'GLOBAL',
  menuName,
  role = 'ADMIN',
}) => {
  ensureBaseUrl();
  const payload = {
    userId,
    targetUserId,
    targetUserName,
    scopeType,
    menuKey,
    menuName,
    role,
  };

  const response = await fetch(`${API_BASE_URL}/jvWorksAdmin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(response, '관리자 등록에 실패했습니다.');
  assertSuccess(response, data, '관리자 등록에 실패했습니다.');
  return data;
};

export const removeAdmin = async ({
  userId,
  targetUserId,
  scopeType = 'GLOBAL',
  menuKey = 'GLOBAL',
}) => {
  ensureBaseUrl();
  const payload = {
    userId,
    targetUserId,
    scopeType,
    menuKey,
  };

  const response = await fetch(`${API_BASE_URL}/jvWorksAdmin`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(response, '관리자 해지에 실패했습니다.');
  assertSuccess(response, data, '관리자 해지에 실패했습니다.');
  return data;
};

export const checkAdminRole = async ({ userId, menuKey }) => {
  ensureBaseUrl();
  const params = new URLSearchParams();
  params.append('userId', userId);
  if (menuKey) params.append('menuKey', menuKey);

  const response = await fetch(
    `${API_BASE_URL}/jvWorksCheckAdminRole?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await parseJsonSafe(
    response,
    '관리자 권한 조회에 실패했습니다.'
  );
  assertSuccess(response, data, '관리자 권한 조회에 실패했습니다.');
  return data;
};

export const searchUsers = async ({ factoryCode = '000001', query = '' }) => {
  ensureBaseUrl();
  const response = await fetch(`${API_BASE_URL}/jvWorksGetUserList`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ factoryCode, query }).toString(),
  });

  const data = await parseJsonSafe(response, '사용자 검색에 실패했습니다.');
  assertSuccess(response, data, '사용자 검색에 실패했습니다.');
  return data.data || data.list || [];
};
