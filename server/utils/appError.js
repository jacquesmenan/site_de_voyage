class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture de la stack trace, en excluant le constructeur de l'erreur
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
