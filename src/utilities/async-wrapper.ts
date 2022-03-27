import type { RequestHandler, Request, Response, NextFunction } from "express";

export default (fn: (req: Request, res: Response) => any): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): any => {
    return fn(req, res).catch(next);
  };
};
