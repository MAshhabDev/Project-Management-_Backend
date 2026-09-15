export interface IBkashInitiatePayload {
  organizationId: string;
  amount: number;
}

export interface IBkashExecutePayload {
  paymentID: string;
  organizationId: string;
}

export interface IRefundPayload {
  paymentId: string; 
  amount: number;
  reason: string;
}