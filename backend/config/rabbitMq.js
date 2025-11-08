const amqp = require("amqplib");

let channel;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log(" Connected to RabbitMQ");
  } catch (error) {
    console.error(" RabbitMQ connection failed:", error.message);
    setTimeout(connectRabbitMQ, 5000); // retry after 5s
  }
};

const getChannel = () => channel;

module.exports = { connectRabbitMQ, getChannel };
