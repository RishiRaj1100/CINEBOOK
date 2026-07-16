// ============================================================
// lib/domain/payment-provider.ts
// PaymentProvider interface — Strategy pattern
// Concrete implementation (Razorpay) lives in lib/data/providers/
// ============================================================

export interface PaymentIntent {
  orderId: string;
  amount: number;    // paise
  currency: string;  // 'INR'
  key: string;       // Razorpay key_id
}

export interface PaymentVerification {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  orderId: string;
  error?: string;
}

/** Abstract payment interface — swap Razorpay for any provider later */
export interface PaymentProvider {
  /** Create an order/intent on the payment provider */
  createOrder(amount: number, currency: string, receipt: string): Promise<PaymentIntent>;
  /** Verify payment signature server-side */
  verifyPayment(verification: PaymentVerification): boolean;
}
