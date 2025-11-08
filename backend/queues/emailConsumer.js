const {
  connectRabbitMQ,
  getChannel,
  isConnected,
} = require("../config/rabbitMq");
const { sendEmail } = require("../utils/emailService");

let consumerTag = null;

const startEmailConsumer = async () => {
  try {
    await connectRabbitMQ();

    if (!isConnected()) {
      throw new Error("Failed to establish RabbitMQ connection");
    }

    const channel = getChannel();

    // Declare queue (idempotent operation)
    await channel.assertQueue("emailQueue", { durable: true });

    // Start consuming messages
    const { consumerTag: tag } = await channel.consume(
      "emailQueue",
      handleMessage,
      {
        noAck: false, // Manual acknowledgment
      }
    );

    consumerTag = tag;
    console.log(" Email consumer started successfully");
  } catch (error) {
    console.error(" Failed to start email consumer:", error.message);

    // Retry after delay
    setTimeout(() => {
      console.log(" Retrying email consumer startup...");
      startEmailConsumer();
    }, 10000); // Retry after 10 seconds
  }
};

const handleMessage = async (msg) => {
  if (!msg) return;

  try {
    const emailData = JSON.parse(msg.content.toString());

    // Validate email data
    if (!emailData.to || !emailData.subject || !emailData.text) {
      console.error(" Invalid email data:", emailData);
      getChannel().ack(msg);
      return;
    }

    await sendEmail(emailData);
    console.log(" Email sent to", emailData.to);

    // Acknowledge successful processing
    getChannel().ack(msg);
  } catch (err) {
    console.error(" Email send failed:", err.message);

    try {
      // Check if channel is still available
      if (isConnected()) {
        // Negative acknowledge and requeue for retry
        getChannel().nack(msg, false, true);
      } else {
        console.log(
          " Channel not available, message will be reprocessed when connection is restored"
        );
      }
    } catch (nackError) {
      console.error(" Failed to nack message:", nackError.message);
    }
  }
};

// Stop consumer gracefully
const stopEmailConsumer = async () => {
  try {
    if (consumerTag && isConnected()) {
      await getChannel().cancel(consumerTag);
      consumerTag = null;
      console.log(" Email consumer stopped");
    }
  } catch (error) {
    console.error(" Error stopping email consumer:", error.message);
  }
};

module.exports = { startEmailConsumer, stopEmailConsumer };
