// ============================================================
// lib/data/providers/razorpay-payment-provider.ts
// Razorpay implementation of PaymentProvider interface
// Server-side only (uses secret key)
// ============================================================

import type {
  PaymentProvider,
  PaymentIntent,
  PaymentVerification,
} from '@/lib/domain/payment-provider';
import crypto from 'crypto';

export class RazorpayPaymentProvider implements PaymentProvider {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId     = process.env.RAZORPAY_KEY_ID!;
    this.keySecret = process.env.RAZORPAY_KEY_SECRET!;
  }

  async createOrder(
    amount: number,
    currency: string,
    receipt: string,
  ): Promise<PaymentIntent> {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ amount, currency, receipt }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Razorpay order creation failed: ${err.error?.description}`);
    }

    const order = await response.json();

    return {
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      key:      this.keyId,
    };
  }

  verifyPayment(verification: PaymentVerification): boolean {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = verification;
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  }
}
