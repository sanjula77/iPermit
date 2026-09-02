export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DocumentType = 'FACE_PHOTO' | 'NIC' | 'MEDICAL_CERT' | 'BIRTH_CERT';

export interface ApplicationDocumentRead {
  id: string;
  doc_type: DocumentType;
  created_at: string;
}

export interface Application {
  id: string;
  driver_id: string;
  status: ApplicationStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
  documents: ApplicationDocumentRead[];
}
