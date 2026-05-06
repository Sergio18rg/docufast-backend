const mockWorker = {
  worker_id: 1,
  company_worker_code: "W001",
  first_name: "John",
  last_name_1: "Doe",
  last_name_2: null,
  email: "john.doe@test.com",
  phone: null,
  document_number: null,
  social_security_number: null,
  birth_date: null,
  address: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  contract_start_date: null,
  contract_end_date: null,
  status: "Active",
  notes: null,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
  client_id: null,
  current_vehicle_id: null,
  user_id: null,
  client: null,
  current_vehicle: null,
};

const mockClient = {
  client_id: 1,
  client_code: "CLI001",
  business_name: "Test Corp",
  contact_email: "contact@testcorp.com",
  contact_phone: null,
  badge_color: "#94a3b8",
  contract_start_date: null,
  contract_end_date: null,
  status: "Active",
  notes: null,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
  user_id: null,
};

const mockVehicle = {
  vehicle_id: 1,
  license_plate: "ABC1234",
  vehicle_type: "Truck",
  company_owner: "Rumofast",
  contract_start_date: null,
  contract_end_date: null,
  status: "Active",
  notes: null,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
};

const mockUser = {
  user_id: 1,
  email: "admin@test.com",
  full_name: "Admin User",
  status: "Active",
  must_change_password: false,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
  role_id: 1,
  role: { role_id: 1, name: "Administrator" },
};

const validWorkerPayload = {
  company_worker_code: "W002",
  first_name: "Jane",
  last_name_1: "Smith",
  email: "jane.smith@test.com",
};

const validClientPayload = {
  client_code: "CLI002",
  business_name: "New Corp",
  contact_email: "new@corp.com",
  badge_color: "#3b82f6",
};

const validVehiclePayload = {
  license_plate: "XYZ9999",
  vehicle_type: "Van",
  company_owner: "Rumofast",
};

export {
  mockWorker,
  mockClient,
  mockVehicle,
  mockUser,
  validWorkerPayload,
  validClientPayload,
  validVehiclePayload,
};
