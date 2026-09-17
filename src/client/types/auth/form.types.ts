// Pagtukoy kung aling tab/form ang kasalukuyang nakabukas sa modal
export type FormMode = 'login' | 'signup';

// Structure para sa mga mensahe ng UI feedback (Alerts)
export interface AlertMessage {
  type: 'success' | 'error';
  text: string;
}