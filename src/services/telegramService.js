import config from '../config/config.js';

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.enabled = this.botToken && this.chatId;
  }

  async sendMessage(text) {
    if (!this.enabled) {
      console.log('❌ Telegram notifications disabled - missing credentials');
      console.log('Bot Token:', this.botToken ? 'Present' : 'Missing');
      console.log('Chat ID:', this.chatId ? 'Present' : 'Missing');
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      console.log('🔔 Sending Telegram notification to chat:', this.chatId);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Telegram API error:', result);
        throw new Error(`Telegram API error: ${result.description || response.statusText}`);
      }

      console.log('✅ Telegram notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error.message);
    }
  }

  async notifyNewOrder(order) {
    console.log('📧 Preparing Telegram notification for order:', order.orderId);

    const paymentMethod = order.paymentInfo?.method;
    const paymentStatus = order.paymentInfo?.status;
    const paymentId = order.paymentInfo?.paymentId;

    // Payment mode label
    const modeLabel = paymentMethod === 'online' ? '💳 Online (Razorpay)' : '💵 Cash on Delivery';

    // Payment status label
    let statusLabel;
    if (paymentMethod === 'cash') {
      statusLabel = '🕐 Pending (COD)';
    } else if (paymentStatus === 'paid') {
      statusLabel = '✅ Paid';
    } else {
      statusLabel = '⏳ Awaiting Payment';
    }

    // Payment ID line (only for online orders)
    const paymentIdLine = paymentMethod === 'online' && paymentId
      ? `\n🔑 Payment ID: <code>${paymentId}</code>`
      : '';

    const message = `
🔔 <b>NEW ORDER RECEIVED!</b>

📋 Order ID: <b>${order.orderId}</b>
👤 Customer: ${order.customerInfo.fullName || order.customerInfo.name || 'Guest'}
📱 Phone: ${order.customerInfo.phone}
📍 Location: ${order.deliveryAddress.address || order.deliveryAddress.area || 'Not specified'}

🛍️ <b>Items:</b>
${order.items.map(item => {
  const itemName = item.productName || item.name || 'Unknown Item';
  const variant = item.variant && item.variant !== 'Regular' ? ` (${item.variant})` : '';
  const price = item.totalPrice || (item.price * item.quantity);
  return `  • ${itemName}${variant} x${item.quantity} - ₹${price}`;
}).join('\n')}

💰 <b>Total: ₹${order.pricing.finalTotal}</b>
━━━━━━━━━━━━━━━━
💳 <b>Payment Mode:</b> ${modeLabel}
📊 <b>Payment Status:</b> ${statusLabel}${paymentIdLine}

⏰ ${new Date(order.createdAt).toLocaleString('en-IN')}
    `.trim();

    await this.sendMessage(message);
  }

  async notifyPaymentConfirmed(order) {
    const paymentId = order.paymentInfo?.paymentId || 'N/A';
    const message = `
✅ <b>PAYMENT CONFIRMED</b>

📋 Order ID: <b>${order.orderId}</b>
👤 Customer: ${order.customerInfo.fullName || order.customerInfo.name || 'Guest'}
📱 Phone: ${order.customerInfo.phone}
💰 Amount: ₹${order.pricing.finalTotal}
💳 Mode: Online (Razorpay)
🔑 Payment ID: <code>${paymentId}</code>

⏰ ${new Date().toLocaleString('en-IN')}
    `.trim();

    await this.sendMessage(message);
  }

  async notifyOrderStatusUpdate(order, newStatus) {
    const statusEmojis = {
      confirmed: '✅',
      preparing: '👨‍🍳',
      out_for_delivery: '🚚',
      delivered: '✅',
      cancelled: '❌'
    };

    const message = `
${statusEmojis[newStatus] || '📝'} <b>Order Status Updated</b>

📋 Order: ${order.orderId}
👤 Customer: ${order.customerInfo.name}
📊 Status: <b>${newStatus.toUpperCase().replace('_', ' ')}</b>
    `.trim();

    await this.sendMessage(message);
  }
}

export default new TelegramService();
