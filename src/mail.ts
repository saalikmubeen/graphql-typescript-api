// import { nodemailer } from "nodemailer";
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

const emailMessage = (text: string) => {
    return `
      <div>
        <h2>Hello There</h2>
        <div>${text}</div>
      </div>
  `;
};

export { transporter, emailMessage };
