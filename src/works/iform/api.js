const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const LS_KEY_TEMPLATES = 'iform.templates';
const LS_KEY_DOCS = 'iform.documents';

// HTTP helper
async function httpGet(path) {
  const res = await fetch(API_BASE_URL + path);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

async function httpPost(path, body) {
  const res = await fetch(API_BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// 사용자 조회 API
async function searchUserList(searchTerm = '') {
  try {
    const res = await fetch(API_BASE_URL + '/jvWorksGetUserList', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        factoryCode: '000001',
        query: searchTerm,
      }).toString(),
    });

    if (!res.ok) {
      console.error('API response not ok:', res.status, res.statusText);
      return [];
    }

    const response = await res.json();

    // ApiResponse 형식: { success, message, data: [...] }
    if (!response.success || !Array.isArray(response.data)) {
      console.warn(
        'API response is not successful or data is not array:',
        response,
      );
      return [];
    }

    return response.data.map((user) => ({
      id: user.userId || user.id,
      name: user.userName || user.name,
      department: user.deptName || user.department,
      position: user.positionName || user.position,
      userId: user.userId || user.id,
    }));
  } catch (error) {
    console.error('searchUserList API call failed:', error);
    return [];
  }
}

export function buildRjsfSchema(template) {
  if (!template)
    return {
      schema: { type: 'object', properties: {} },
      uiSchema: {},
      formData: {},
    };

  const fields = (template.sections || []).flatMap((s) => s.fields || []);
  const properties = {};
  const required = [];
  const uiSchema = { 'ui:order': [] };
  const formData = {};

  fields.forEach((f) => {
    uiSchema['ui:order'].push(f.id);

    // widget hints
    if (!uiSchema[f.id]) uiSchema[f.id] = {};
    if (f.type === 'date') {
      uiSchema[f.id]['ui:widget'] = 'date';
    }
    if (f.type === 'lookup') {
      uiSchema[f.id]['ui:widget'] = 'lookup';
      if (f.lookup) {
        // lookup 설정을 복사하되, dataSource가 문자열이면 실제 함수로 변환
        const lookupConfig = { ...f.lookup };
        if (lookupConfig.dataSource === 'searchUserList') {
          lookupConfig.dataSource = searchUserList;
        }
        uiSchema[f.id]['ui:options'] = { lookup: lookupConfig };
      }
    }
    if (f.type === 'textarea') {
      uiSchema[f.id]['ui:widget'] = 'textarea';
    }
    if (f.type === 'document') {
      uiSchema[f.id]['ui:widget'] = 'document';
    }
    if (f.rows) {
      if (!uiSchema[f.id]['ui:options']) uiSchema[f.id]['ui:options'] = {};
      uiSchema[f.id]['ui:options'].rows = f.rows;
    }
    if (f.readOnly) {
      uiSchema[f.id]['ui:readonly'] = true;
    }
    if (f.col) {
      if (!uiSchema[f.id]['ui:options']) uiSchema[f.id]['ui:options'] = {};
      uiSchema[f.id]['ui:options'].col = f.col;
    }
    if (f.options) {
      if (!uiSchema[f.id]['ui:options']) uiSchema[f.id]['ui:options'] = {};
      uiSchema[f.id]['ui:options'] = {
        ...uiSchema[f.id]['ui:options'],
        ...f.options,
      };
    }

    const prop = {};
    const type = f.type || 'text';
    if (type === 'number') prop.type = 'number';
    else prop.type = 'string';

    if (type === 'date') prop.format = 'date';
    if (f.validation?.min !== undefined) prop.minimum = f.validation.min;
    if (f.validation?.max !== undefined) prop.maximum = f.validation.max;

    prop.title = f.label || f.id;
    properties[f.id] = prop;

    if (f.required) required.push(f.id);
    if (f.default !== undefined) formData[f.id] = f.default;
  });

  // Agreement to checkbox field
  if (template.agreement?.checkLabel) {
    const agreeId = 'agreement_check';
    properties[agreeId] = {
      type: 'boolean',
      title: template.agreement.checkLabel,
      description: template.agreement.text,
    };
    uiSchema['ui:order'].push(agreeId);
    uiSchema[agreeId] = { 'ui:widget': 'checkbox' };
    if (template.agreement.required) required.push(agreeId);
  }

  // Signature fields (as text placeholders)
  if (Array.isArray(template.signatures)) {
    template.signatures.forEach((sig) => {
      const id = sig.id || 'signature';
      properties[id] = {
        type: 'string',
        title: sig.label || '서명',
      };
      uiSchema['ui:order'].push(id);
      uiSchema[id] = { 'ui:widget': 'signature' };
      if (sig.required) required.push(id);
    });
  }

  return {
    schema: {
      title: template.title || template.name || '폼',
      // description: template.agreement?.text,
      type: 'object',
      properties,
      required,
      errorMessage: {
        required: {
          // required 필드별 한글 메시지 (필드명: "메시지")
          receiver_sign: '수령자 서명이 필요합니다.',
          agreement_check: '위 내용을 확인하였으며 이에 동의해주세요.',
        },
      },
    },
    uiSchema,
    formData,
  };
}

export const sampleTemplate = {
  templateId: 'IT_ASSET_TAKEOVER',
  title: 'IT 자산 인수 확인서',
  description:
    '신입사원 또는 부서 이동 시 IT 자산 인수 현황을 기록하는 문서입니다.',
  version: '1.0',
  layout: { type: 'grid', columns: 12 },
  sections: [
    {
      id: 'header',
      title: '기본 정보',
      type: 'form',
      fields: [
        {
          id: 'user_name',
          label: '사용자',
          type: 'lookup',
          required: true,
          lookup: {
            title: '사용자 조회',
            searchPlaceholder: '사용자명 또는 부서명 검색',
            valueKey: 'name',
            columns: [
              { key: 'name', label: '이름' },
              { key: 'department', label: '부서' },
              { key: 'position', label: '직위' },
            ],
            relatedFields: {
              department: 'department',
              position: 'position',
            },
            dataSource: 'searchUserList',
            autoLoad: true,
          },
        },
        { id: 'position', label: '직위', type: 'text', col: 6, readOnly: true },
        {
          id: 'department',
          label: '부서명',
          type: 'text',
          required: true,
          col: 6,
          readOnly: true,
        },
        {
          id: 'asset_mgmt_no',
          label: '자산관리번호',
          type: 'text',
          required: true,
          col: 6,
        },
      ],
    },
    {
      id: 'asset_info',
      title: '자산 지급 정보',
      type: 'table',
      fields: [
        {
          id: 'issue_date',
          label: '지급일',
          type: 'date',
          required: true,
          col: 6,
          default: '2025-05-12',
        },
        { id: 'brand', label: '브랜드', type: 'text', col: 6, default: 'msi' },
        {
          id: 'product_type',
          label: '지급제품(종류)',
          type: 'text',
          required: true,
          col: 12,
          default: '노트북 / Cyborg 15 AI a1vek',
        },
        {
          id: 'cpu',
          label: 'CPU',
          type: 'text',
          col: 6,
          default: 'intel core ultra 7',
        },
        {
          id: 'memory',
          label: '메모리',
          type: 'text',
          col: 6,
          default: 'DDR5, 8GB',
        },
        {
          id: 'storage',
          label: '하드웨어 용량',
          type: 'text',
          col: 6,
          default: '512GB SSD',
        },
        {
          id: 'manufacture_year',
          label: '제조년도',
          type: 'number',
          col: 6,
          validation: { min: 2000, max: 2100 },
          default: 2024,
        },
      ],
    },
  ],
  agreement: {
    text: '사용자는 지급받은 물품에 대하여 퇴사 시 또는 반납 시까지 관리·운용하여야 하며, 관리 부주의로 인한 파손 또는 망실 시에는 개인이 책임지고 보상한다.',
    required: true,
    checkLabel: '위 내용을 확인하였으며 이에 동의합니다.',
  },
  signatures: [
    {
      id: 'receiver_sign',
      label: '수령자 서명',
      type: 'signature',
      required: true,
    },
  ],
  options: { useApproval: false, useAttachment: false, usePdf: true },
};

export const vacationTemplate = {
  templateId: 'HANDOVER_CONFIRMATION',
  title: '업무 인수인계 확인서',
  description:
    '부서 이동이나 퇴직 시 업무 인수인계 내역을 기록하는 문서입니다.',
  version: '1.0',
  layout: { type: 'grid', columns: 12 },
  sections: [
    {
      id: 'handover_info',
      title: '인수인계 정보',
      type: 'form',
      fields: [
        {
          id: 'handover_date',
          label: '인수인계일',
          type: 'date',
          required: true,
          col: 6,
          default: new Date().toISOString().split('T')[0],
        },
        {
          id: 'handover_type',
          label: '인수인계 구분',
          type: 'text',
          required: true,
          col: 6,
          default: '퇴사',
        },
      ],
    },
    {
      id: 'transferor_info',
      title: '인계자 정보',
      type: 'form',
      fields: [
        {
          id: 'transferor_name',
          label: '인계자',
          type: 'lookup',
          required: true,
          col: 6,
          lookup: {
            title: '직원 조회',
            searchPlaceholder: '이름 또는 부서 검색',
            valueKey: 'name',
            columns: [
              { key: 'name', label: '이름' },
              { key: 'department', label: '부서' },
              { key: 'position', label: '직위' },
            ],
            relatedFields: {
              transferor_dept: 'department',
              transferor_position: 'position',
            },
            dataSource: 'searchUserList',
            autoLoad: true,
          },
        },
        {
          id: 'transferor_dept',
          label: '소속 부서',
          type: 'text',
          required: true,
          col: 6,
          readOnly: true,
        },
        {
          id: 'transferor_position',
          label: '직위',
          type: 'text',
          col: 6,
          readOnly: true,
        },
        {
          id: 'transferor_period',
          label: '근무 기간',
          type: 'text',
          col: 6,
        },
      ],
    },
    {
      id: 'receiver_info',
      title: '인수자 정보',
      type: 'form',
      fields: [
        {
          id: 'receiver_name',
          label: '인수자',
          type: 'lookup',
          required: true,
          col: 6,
          lookup: {
            title: '직원 조회',
            searchPlaceholder: '이름 검색',
            valueKey: 'name',
            columns: [
              { key: 'name', label: '이름' },
              { key: 'department', label: '부서' },
              { key: 'position', label: '직위' },
            ],
            relatedFields: {
              receiver_dept: 'department',
              receiver_position: 'position',
            },
            dataSource: 'searchUserList',
            autoLoad: true,
          },
        },
        {
          id: 'receiver_dept',
          label: '소속 부서',
          type: 'text',
          required: true,
          col: 6,
          readOnly: true,
        },
        {
          id: 'receiver_position',
          label: '직위',
          type: 'text',
          col: 6,
          readOnly: true,
        },
      ],
    },
    {
      id: 'handover_details',
      title: '인수인계 내용',
      type: 'form',
      fields: [
        {
          id: 'tasks_overview',
          label: '담당 업무 개요',
          type: 'textarea',
          required: true,
          col: 12,
        },
        {
          id: 'ongoing_projects',
          label: '진행 중인 프로젝트',
          type: 'textarea',
          col: 12,
        },
        {
          id: 'pending_issues',
          label: '미결 사항',
          type: 'textarea',
          col: 12,
        },
        {
          id: 'special_notes',
          label: '특이사항 및 참고사항',
          type: 'textarea',
          col: 12,
        },
      ],
    },
  ],
  agreement: {
    text: '상기 업무에 대하여 인수인계가 완료되었음을 확인하며, 인계자는 필요 시 추가 협조할 것을 동의합니다.',
    required: true,
    checkLabel: '위 내용을 확인하였으며 동의합니다.',
  },
  signatures: [
    {
      id: 'transferor_sign',
      label: '인계자 서명',
      type: 'signature',
      required: true,
    },
    {
      id: 'receiver_sign',
      label: '인수자 서명',
      type: 'signature',
      required: true,
    },
  ],
  options: { useApproval: false, useAttachment: true, usePdf: true },
};

export const businessTripTemplate = {
  templateId: 'BUSINESS_TRIP_REQUEST',
  title: '출장 신청서',
  description: '출장 계획을 사전에 신청하고 승인받는 문서입니다.',
  version: '1.0',
  layout: { type: 'grid', columns: 12 },
  sections: [
    {
      id: 'trip_info',
      title: '출장 정보',
      type: 'form',
      fields: [
        {
          id: 'requester_name',
          label: '출장자',
          type: 'lookup',
          required: true,
          col: 6,
          lookup: {
            title: '직원 조회',
            searchPlaceholder: '이름 검색',
            valueKey: 'name',
            columns: [
              { key: 'name', label: '이름' },
              { key: 'department', label: '부서' },
              { key: 'position', label: '직위' },
            ],
            relatedFields: {
              department: 'department',
              position: 'position',
            },
            dataSource: 'searchUserList',
            autoLoad: true,
          },
        },
        {
          id: 'department',
          label: '부서',
          type: 'text',
          required: true,
          col: 6,
          readOnly: true,
        },
        {
          id: 'position',
          label: '직위',
          type: 'text',
          col: 6,
          readOnly: true,
        },
        {
          id: 'trip_purpose',
          label: '출장 목적',
          type: 'text',
          required: true,
          col: 6,
        },
        {
          id: 'destination',
          label: '출장지',
          type: 'text',
          required: true,
          col: 12,
        },
        {
          id: 'start_date',
          label: '출장 시작일',
          type: 'date',
          required: true,
          col: 6,
        },
        {
          id: 'end_date',
          label: '출장 종료일',
          type: 'date',
          required: true,
          col: 6,
        },
        {
          id: 'transportation',
          label: '교통수단',
          type: 'text',
          col: 6,
        },
        {
          id: 'estimated_cost',
          label: '예상 비용 (원)',
          type: 'number',
          col: 6,
        },
      ],
    },
  ],
  agreement: {
    text: '출장 중 회사의 이익을 최우선으로 하며, 정당한 사유 없이 일정을 변경하지 않겠습니다.',
    required: true,
    checkLabel: '위 내용을 확인하였으며 동의합니다.',
  },
  signatures: [
    {
      id: 'requester_sign',
      label: '신청자 서명',
      type: 'signature',
      required: true,
    },
  ],
  options: { useApproval: true, useAttachment: true, usePdf: true },
};

function readLS(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function listTemplates(showToast) {
  try {
    const response = await httpGet('/jvWorksGetTemplateList');
    if (
      response.success &&
      Array.isArray(response.data) &&
      response.data.length
    ) {
      // DTO 형식을 프론트엔드 형식으로 변환
      return response.data.map((dto) => {
        const tpl = JSON.parse(dto.templateJson);
        return buildTemplateWithDataSource(tpl, dto.templateId, dto.version);
      });
    }
  } catch (e) {
    console.warn('API failed, using default templates', e);
    if (showToast) showToast('API 오류, 기본 템플릿을 불러왔습니다', 'warning');
  }

  const defaultTemplates = [
    sampleTemplate,
    vacationTemplate,
    businessTripTemplate,
  ].map((tpl) => buildTemplateWithDataSource(tpl, tpl.templateId, tpl.version));

  return defaultTemplates;
}

function buildTemplateWithDataSource(tpl, templateId, version) {
  // dataSource 참조를 실제 함수로 설정
  const processedTpl = JSON.parse(JSON.stringify(tpl)); // Deep copy to avoid mutation

  // 모든 lookup 필드의 dataSource를 문자열로 정규화
  // (실제 함수로의 변환은 buildRjsfSchema에서 수행)
  if (processedTpl.sections) {
    processedTpl.sections.forEach((section) => {
      if (section.fields) {
        section.fields.forEach((field) => {
          if (field.type === 'lookup' && field.lookup) {
            // dataSource가 없으면 기본값 설정
            if (!field.lookup.dataSource) {
              field.lookup.dataSource = 'searchUserList';
            }
          }
        });
      }
    });
  }

  const { schema, uiSchema, formData } = buildRjsfSchema(processedTpl);

  return {
    id: templateId,
    name: processedTpl.title,
    version: version || '1.0',
    schema,
    uiSchema,
    defaultData: formData,
    rawTemplate: processedTpl,
  };
}

export async function getTemplate(id, showToast) {
  try {
    const response = await httpGet(
      '/jvWorksGetTemplate?templateId=' + encodeURIComponent(id),
    );
    if (response.success && response.data && response.data.templateJson) {
      const data = response.data;
      const tpl = JSON.parse(data.templateJson);
      const { schema, uiSchema, formData } = buildRjsfSchema(tpl);
      return {
        id: data.templateId,
        name: tpl.title,
        description: tpl.description || '',
        version: data.version,
        schema,
        uiSchema,
        defaultData: formData,
        rawTemplate: tpl,
      };
    }
  } catch (e) {
    console.warn('API failed, using fallback template', e);
    if (showToast)
      showToast('템플릿 로드 실패, 기본값을 사용합니다', 'warning');
  }

  const defaultTemplates = [
    sampleTemplate,
    vacationTemplate,
    businessTripTemplate,
  ];
  const local = readLS(LS_KEY_TEMPLATES, []);
  const allTemplates = [...defaultTemplates, ...local];

  const tpl =
    allTemplates.find((t) => (t.id || t.templateId) === id) || sampleTemplate;
  const { schema, uiSchema, formData } = buildRjsfSchema(tpl);
  return {
    id: tpl.id || tpl.templateId || id,
    name: tpl.title || tpl.name,
    description: tpl.description || '',
    version: tpl.version,
    schema,
    uiSchema,
    defaultData: formData,
    rawTemplate: tpl,
  };
}

export async function saveTemplate(tpl, showToast) {
  try {
    const payload = {
      templateId: tpl.templateId || tpl.id,
      title: tpl.title,
      version: tpl.version || '1.0',
      templateJson: JSON.stringify(tpl),
      createdBy: 'admin', // TODO: get from session
    };
    const response = await httpPost('/jvWorksSetTemplate', payload);
    if (response.success) {
      if (showToast) showToast('템플릿이 저장되었습니다', 'success');
      return { ok: true };
    }
    if (showToast) showToast('템플릿 저장 실패', 'error');
  } catch (e) {
    console.warn('API failed, using localStorage', e);
    if (showToast) showToast('템플릿 저장 실패: ' + e.message, 'error');
  }
  const list = readLS(LS_KEY_TEMPLATES, [sampleTemplate]);
  const matchKey = tpl.id || tpl.templateId;
  const idx = list.findIndex((t) => (t.id || t.templateId) === matchKey);
  if (idx >= 0) list[idx] = tpl;
  else list.push(tpl);
  writeLS(LS_KEY_TEMPLATES, list);
  return { ok: true };
}

export async function createDocument(doc, showToast) {
  try {
    const payload = {
      docId: doc.docId,
      userId: doc.userId || '', // extensionLogin userId 추가
      templateId: doc.templateId,
      title: doc.title || 'Untitled',
      formData: JSON.stringify(doc.formData),
      status: doc.status || 'DRAFT',
      createdBy: doc.userId || 'user', // userId를 createdBy로 사용
      createdByName: doc.createdByName || '',
    };
    const response = await httpPost('/jvWorksSetDocument', payload);
    if (response.success && response.data) {
      if (showToast) showToast('문서가 저장되었습니다', 'success');
      return { docId: response.data.docId || doc.docId, ...doc };
    }
    if (showToast) showToast('문서 저장 실패', 'error');
  } catch (e) {
    console.warn('API failed, using localStorage', e);
    if (showToast) showToast('문서 저장 실패: ' + e.message, 'error');
  }
  const docs = readLS(LS_KEY_DOCS, []);
  const id = 'doc-' + Date.now();
  const saved = { id, ...doc };
  docs.push(saved);
  writeLS(LS_KEY_DOCS, docs);
  return saved;
}

export async function getDocumentList(createdBy, status, showToast) {
  try {
    let url = '/jvWorksGetDocumentList?';
    if (createdBy) url += 'createdBy=' + encodeURIComponent(createdBy) + '&';
    if (status) url += 'status=' + encodeURIComponent(status);
    const response = await httpGet(url);
    if (response.success && Array.isArray(response.data)) {
      return response.data.map((dto) => ({
        docId: dto.docId,
        templateId: dto.templateId,
        title: dto.title,
        formData: JSON.parse(dto.formData || '{}'),
        status: dto.status,
        createdBy: dto.createdBy,
        createdByName: dto.createdByName || dto.userName,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
      }));
    }
  } catch (e) {
    console.warn('API failed, using localStorage', e);
    if (showToast)
      showToast('문서 목록 로드 실패, 저장된 데이터를 사용합니다', 'warning');
  }
  return readLS(LS_KEY_DOCS, []);
}

export async function getDocument(docId, showToast) {
  try {
    const response = await httpGet(
      '/jvWorksGetDocument?docId=' + encodeURIComponent(docId),
    );
    if (response.success && response.data) {
      const data = response.data;
      return {
        docId: data.docId,
        templateId: data.templateId,
        title: data.title,
        formData: JSON.parse(data.formData || '{}'),
        status: data.status,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
      };
    }
  } catch (e) {
    console.warn('API failed, using localStorage', e);
    if (showToast) showToast('문서 로드 실패', 'warning');
  }
  const docs = readLS(LS_KEY_DOCS, []);
  return docs.find((d) => d.id === docId || d.docId === docId);
}

export async function updateDocumentStatus(docId, newStatus, showToast) {
  try {
    const payload = {
      docId,
      status: newStatus,
    };
    const response = await httpPost('/jvWorksUpdateDocumentStatus', payload);
    if (response.success) {
      if (showToast) showToast('문서 상태가 변경되었습니다', 'success');
      return true;
    }
    if (showToast) showToast('문서 상태 변경 실패', 'error');
    return false;
  } catch (e) {
    console.warn('API failed', e);
    if (showToast) showToast('문서 상태 변경 실패: ' + e.message, 'error');
    return false;
  }
}
