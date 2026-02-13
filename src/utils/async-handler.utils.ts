import { Request, Response, NextFunction } from 'express';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      const error = err as any;
      console.log("server error: ", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  };

  export {asyncHandler};