import { STATUS } from "../../constants";
import { FIFTEEN_DAYS_IN_MS } from "./constants";

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

const getDocumentStatus = (hasFile: boolean, expirationDate?: Date | null) => {
  if (!hasFile) return "Not uploaded";
  if (!expirationDate) return "Valid";

  const now = new Date();
  const expiresAt = new Date(expirationDate);

  if (expiresAt.getTime() < now.getTime()) return "Expired";

  if (expiresAt.getTime() - now.getTime() <= FIFTEEN_DAYS_IN_MS) {
    return "Expiring soon";
  }

  return "Valid";
};

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

export { mapUserResponse, getDocumentStatus, buildProfileDocumentDto };
