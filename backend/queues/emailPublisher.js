const { getChannel } = require("../config/rabbitMq");

const publishEmailJob = async (emailData) => {
  try {
    const channel = getChannel();
    if (!channel) throw new Error("RabbitMQ channel not initialized");

    const queue = "emailQueue";
    await channel.assertQueue(queue, { durable: true });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(emailData)), {
      persistent: true,
    });

    console.log(` Email job queued for ${emailData.to}`);
  } catch (error) {
    console.error(" Error publishing email job:", error);
  }
};

module.exports = { publishEmailJob };
