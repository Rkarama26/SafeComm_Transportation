const { connectRabbitMQ, getChannel } = require("../config/rabbitMq");
const { sendEmail } = require("../utils/emailService");

const startEmailConsumer = async () => {
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

module.exports = { startEmailConsumer };
