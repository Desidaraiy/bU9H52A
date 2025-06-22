import nodemailer from "nodemailer";
import { logger } from "./logger";
import config from "../config";

export class DecisionNotifier {
  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.notifications.emailSender, // Ваш email (например, 'yourmail@gmail.com')
      pass: config.notifications.emailPassword, // Пароль от почты или app-пароль
    },
  });

  /**
   * Отправляет email с уведомлением о торговой возможности
   * @param message Текст уведомления
   */
  async sendAlert(message: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: config.notifications.emailSender,
        to: config.notifications.email,
        subject: "Торговая возможность",
        text: message,
      });
      logger.info("Уведомление отправлено по email");
    } catch (error) {
      logger.error("Ошибка отправки email:", error);
    }
  }
}
