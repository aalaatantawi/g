import axios from 'axios';

export async function sendRecallMessage(
  phoneNumber: string, 
  patientName: string, 
  currentGA: string, 
  clinicName: string
) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn("WhatsApp API credentials missing. Skipping message.");
    return;
  }

  // Clean phone number (remove non-digits)
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  if (!cleanPhone) return;

  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: "anomaly_scan_recall", 
      language: {
        code: "en_US"
      },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: patientName },
            { type: "text", text: currentGA },
            { type: "text", text: clinicName }
          ]
        }
      ]
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`WhatsApp message sent to ${cleanPhone}:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error("WhatsApp API error:", error.response?.data || error.message);
    // Don't throw, just log so the cron job continues
  }
}
