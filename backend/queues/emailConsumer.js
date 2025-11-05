import { connectRabbitMQ, getChannel } from "../config/rabbitMq.js";
import { sendEmail } from "../utils/emailService.js";

export const startEmailConsumer = async () => {
  await connectRabbitMQ();
  const channel = getChannel();

  channel.consume("emailQueue", async (msg) => {
    if (!msg) return;
    const emailData = JSON.parse(msg.content.toString());
    try {
      await sendEmail(emailData);
      console.log(" Email sent to", emailData.to);
      channel.ack(msg);
    } catch (err) {
      console.error(" Email send failed:", err.message);
      channel.nack(msg, false, true);
    }
  });

  console.log(" Email consumer running inside main app");
};
