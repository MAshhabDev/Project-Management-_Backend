export interface IBkashInitiatePayload {
  organizationId: string;
  amount: number;
}

export interface IBkashExecutePayload {
  paymentID: string;
  organizationId: string;
}