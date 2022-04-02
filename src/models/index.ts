import Joi, { ObjectSchema } from "joi";

export const URLValidationSchema: ObjectSchema = Joi.object({
  url: Joi.string().uri().required(),
});

export const GDriveValidationSchema: ObjectSchema = Joi.object({
  url: Joi.string()
    .regex(
      /(^https:\/\/drive\.google\.com\/file\/d\/(.*?)\/.*?\?.*$|^https:\/\/drive\.google\.com\/drive\/folders\/(.*)\?.*$)/,
      "gdrive"
    )
    .required(),
});

export const MegaValidationSchema: ObjectSchema = Joi.object({
  url: Joi.string()
    .regex(
      /(^https:\/\/mega\.nz\/file\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+$|^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+$|^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+\/folder\/[a-zA-Z0-9]{0,8}$|^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+\/file\/[a-zA-Z0-9]{0,8}$)/,
      "mega"
    )
    .required(),
});

export const DefaultValidationSchema: ObjectSchema = Joi.object({
  url: Joi.string().required(),
});
