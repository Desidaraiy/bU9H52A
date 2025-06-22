import { logger } from "../utils/logger";

export class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private jobs: { [key: string]: () => Promise<void> } = {};
  private timers: { [key: string]: NodeJS.Timeout } = {};

  /**
   * Регистрирует периодическую задачу
   * @param name Уникальное имя задачи
   * @param interval Интервал в миллисекундах
   * @param task Функция для выполнения
   */
  registerIntervalTask(
    name: string,
    interval: number,
    task: () => Promise<void>
  ) {
    if (this.jobs[name]) {
      logger.warn(`Задача "${name}" уже зарегистрирована. Перезаписываю...`);
      this.cancelTask(name);
    }

    this.jobs[name] = task;
    this.timers[name] = setInterval(async () => {
      try {
        logger.info(`Запуск задачи: ${name}`);
        await task();
        logger.info(`Задача ${name} успешно выполнена`);
      } catch (error) {
        logger.error(`Ошибка в задаче ${name}: ${error}`);
      }
    }, interval);

    logger.info(
      `Зарегистрирована периодическая задача: ${name} (интервал: ${interval}мс)`
    );
  }

  /**
   * Регистрирует задачу на определенное время
   * @param name Уникальное имя задачи
   * @param time Время выполнения в формате "HH:MM"
   * @param task Функция для выполнения
   */
  registerTimedTask(name: string, time: string, task: () => Promise<void>) {
    if (this.jobs[name]) {
      logger.warn(`Задача "${name}" уже зарегистрирована. Перезаписываю...`);
      this.cancelTask(name);
    }

    this.jobs[name] = task;
    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    const targetTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes
    );

    // Если время уже прошло, планируем на следующий день
    if (targetTime < now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const delay = targetTime.getTime() - now.getTime();

    this.timers[name] = setTimeout(async () => {
      try {
        logger.info(`Запуск задачи по времени: ${name} в ${time}`);
        await task();
        logger.info(`Задача ${name} успешно выполнена`);
        // Планируем повтор на следующий день
        this.registerTimedTask(name, time, task);
      } catch (error) {
        logger.error(`Ошибка в задаче ${name}: ${error}`);
      }
    }, delay);

    logger.info(`Зарегистрирована задача по времени: ${name} (время: ${time})`);
  }

  /**
   * Отменяет задачу
   * @param name Имя задачи для отмены
   */
  cancelTask(name: string) {
    if (this.timers[name]) {
      if (this.timers[name].hasRef?.()) {
        clearInterval(this.timers[name]);
      } else {
        clearTimeout(this.timers[name]);
      }
      delete this.timers[name];
      delete this.jobs[name];
      logger.info(`Задача "${name}" отменена`);
    } else {
      logger.warn(`Попытка отмены несуществующей задачи: ${name}`);
    }
  }

  /**
   * Отменяет все задачи
   */
  cancelAllTasks() {
    Object.keys(this.timers).forEach((name) => {
      if (this.timers[name].hasRef?.()) {
        clearInterval(this.timers[name]);
      } else {
        clearTimeout(this.timers[name]);
      }
    });

    this.timers = {};
    this.jobs = {};
    logger.info("Все задачи отменены");
  }
}
