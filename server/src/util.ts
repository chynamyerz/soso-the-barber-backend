import { createTransport } from "nodemailer";

const transport = createTransport({
  auth: {
    pass: process.env.MAIL_PASS,
    user: process.env.MAIL_USER
  },
  service: process.env.MAIL_SERVICE,
});

export { transport }

