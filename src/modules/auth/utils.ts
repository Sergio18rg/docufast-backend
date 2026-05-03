import { STATUS } from "../../constants";
import { getDocumentStatus } from "../../utils";

const mapUserResponse = (user: any) => ({
  user_id: user.user_id,
  email: user.email,
  full_name: user.full_name,
  status: user.status,
  must_change_password: !!user.must_change_password,
  role: {
    role_id: user.role.role_id,
    name: user.role.name,
  },
});

const buildProfileDocumentDto = (entityDocument: any) => {
  const {
    entity_document_id,
    status: entityStatus,
    created_at,
    updated_at,
    document: {
      document_id,
      document_key,
      display_name,
      file_path,
      original_filename,
      mime_type,
      security_level,
      status: documentStatus,
      issue_date,
      expiration_date,
      notes,
      document_type: { is_additional },
    },
  } = entityDocument;

  return {
    worker_document_id: entity_document_id,
    document_id,
    document_key,
    document_name: display_name,
    is_predefined: !is_additional,
    is_active:
      entityStatus === STATUS.ACTIVE && documentStatus !== STATUS.INACTIVE,
    file_url: file_path,
    file_name: original_filename,
    mime_type,
    security_level,
    status:
      entityStatus !== STATUS.ACTIVE || documentStatus === STATUS.INACTIVE
        ? STATUS.INACTIVE
        : getDocumentStatus(!!file_path, expiration_date),
    issue_date,
    expiration_date,
    notes,
    created_at,
    updated_at,
  };
};

export { mapUserResponse, buildProfileDocumentDto };
