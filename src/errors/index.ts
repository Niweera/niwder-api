export const AccessDeniedError = class AccessDeniedError {
  public message: string;
  constructor(message: string) {
    this.message = message;
  }
};

export const AuthenticationError = class AuthenticationError {
  public message: string;
  constructor(message: string) {
    this.message = message;
  }
};

export const NotFoundError = class NotFoundError {
  public message: string;
  constructor(message: string) {
    this.message = message;
  }
};

export const ValidationError = class ValidationError {
  public message: string;
  constructor(message: string) {
    this.message = message;
  }
};
