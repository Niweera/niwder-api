import chalk from "chalk";
import {
  ValidationError,
  AuthenticationError,
  AccessDeniedError,
  NotFoundError,
} from "../errors";
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
  Application,
} from "express";

const errorLogger: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.message) {
    console.log(chalk.yellow(err.message));
  }
  if (err.stack) {
    console.log(chalk.red(err.stack));
  }
  next(err);
};

const authenticationErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (err instanceof AuthenticationError) {
    res.status(401).send({ message: err.message });
  } else {
    next(err);
  }
};

const validationErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (err instanceof ValidationError) {
    res.status(400).send({ message: err.message });
  } else {
    next(err);
  }
};

const accessDeniedErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (err instanceof AccessDeniedError) {
    res.status(403).send({ message: err.message });
  } else {
    next(err);
  }
};

const notFoundErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (err instanceof NotFoundError) {
    res.status(404).send({ message: err.message });
  } else {
    next(err);
  }
};

const genericErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (err) {
    res.status(500).send({ message: err.message });
  } else {
    next();
  }
};

const ErrorHandlingMiddleware = (app: Application): void => {
  app.use([
    errorLogger,
    authenticationErrorHandler,
    validationErrorHandler,
    accessDeniedErrorHandler,
    notFoundErrorHandler,
    genericErrorHandler,
  ]);
};

export default ErrorHandlingMiddleware;
