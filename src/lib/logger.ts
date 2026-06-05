export type LogContext = Record<string, unknown>;

export const logger = {
  info(message: string, context?: LogContext) {
    if (__DEV__) {
      console.info(message, context ?? "");
    }
  },

  warn(message: string, context?: LogContext) {
    if (__DEV__) {
      console.warn(message, context ?? "");
    }
  },

  error(message: string, error?: unknown, context?: LogContext) {
    if (__DEV__) {
      console.error(message, {
        error,
        ...context,
      });
    }
  },
};
