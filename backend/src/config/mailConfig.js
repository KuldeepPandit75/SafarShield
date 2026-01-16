import { createTransport } from "nodemailer";
import dotenv from "dotenv";
import { OTP_EXPIRES_MIN } from "./app.config.js";

dotenv.config();

export const sendMail = async (eMail, otp) => {
  try {
    const transport = createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.MAILER_EMAIL,
      to: eMail,
      subject: `Your SafarShield Verification Code`,
      text: `Your verification code is: ${otp}. This code will expire in ${OTP_EXPIRES_MIN} minutes.`,
      html: `
      add the verification mail for safarshield
      `
    };

    await transport.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.log(error);
    return { success: false };
  }
};