import {
  URLValidationSchema,
  GDriveValidationSchema,
  MegaValidationSchema,
  DefaultValidationSchema,
} from "../models";
import { ValidationError } from "../errors";
import type { NextFunction, Request, Response } from "express";
import type { Model, Validator } from "../utilities/interfaces";
import type { ObjectSchema, ValidationResult } from "joi";

const validators: Validator = {
  Main: {
    scopes: {
      url: URLValidationSchema,
      gdrive: GDriveValidationSchema,
      mega: MegaValidationSchema,
      default: DefaultValidationSchema,
    },
  },
};

const scopeExists = (validatorModel: Model, scope: string): boolean => {
  return (
    typeof Object.keys(validatorModel.scopes).find((key) => key === scope) !==
    "undefined"
  );
};

const getSchema = (model: string, scope?: string): ObjectSchema => {
  const validatorModel: Model = validators[model];
  if (!validatorModel) {
    throw new Error("Validator model does not exist");
  }

  if (validatorModel.scopes) {
    if (scope) {
      if (!scopeExists(validatorModel, scope)) {
        throw new Error(`Scope ${scope} does not exist in ${model} validator`);
      } else {
        return validatorModel.scopes[scope];
      }
    } else {
      return validatorModel.scopes.default;
    }
  } else {
    throw new Error(`${model} does not have scopes`);
  }
};

const validate = (
  model: string,
  reqBody: Request["body"],
  scope: string
): ValidationResult => {
  const schema: ObjectSchema = getSchema(model, scope);
  return schema.validate(reqBody, {
    allowUnknown: true,
  });
};

const ValidationMiddleware = (
  model: string,
  scope: string
): ((request: Request, response: Response, nextFn: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationResult: ValidationResult = validate(model, req.body, scope);
    if (validationResult.error) {
      throw new ValidationError(validationResult.error.message);
    } else {
      next();
    }
  };
};

export default ValidationMiddleware;
