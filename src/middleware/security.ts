import { ArcjetNodeRequest, ArcjetRequest, slidingWindow } from "@arcjet/node";
import aj from "../config/arcjet";
import { asyncHandler } from "../utils/async-handler.utils";
import { Request, Response, NextFunction } from "express";


const securityMiddleware = asyncHandler( async(req: Request, res: Response, next:NextFunction)=>{

    if (req.method === "OPTIONS") return next();

    if(process.env.NODE_ENV === 'test') return;

    const role: RateLimitRole = req.user?.role ?? 'guest';

    let limit: number;
    let message: string;
        
    switch(role){
            case "admin":
                limit = 20;
                message = "Admin request limit exceeded (20 per minute). Slow down!";
                break;
            case "teacher":
            case "student":
                limit = 10;
                message = "User request limit exceeded (10 per minute). Please wait.";
                break;
            default:
                limit = 5;
                message =  "Guest request limit exceeded (5 per minute). Please sign up for higher limits.";
                break;
        }

    const client = aj.withRule(
        slidingWindow({
                mode: "LIVE",
                interval: "1m",
                max: limit
        })
    );

    const arcjetRequest : ArcjetNodeRequest = {
        headers: req.headers,
        method: req.method,
        url: req.originalUrl ?? req.originalUrl,
        socket:{
            remoteAddress: req.socket.remoteAddress ?? req.ip ?? "0.0.0.0",
        },
        };

    const decision = await client.protect(arcjetRequest);

    if (decision.isDenied() && decision.reason.isBot()) {
        res.status(403).json({
            error: "Forbidden",
             message: "Automated requests are not allowed",
        });
        return;
        }

    if (decision.isDenied() && decision.reason.isShield()) {
        res.status(403).json({
            error: "Forbidden",
            message: "Request is blocked by security policy",
        });
        return
        }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
        res.status(429).json({
            error: "Too Many Requests",
            message,
        });
        return
        }

    next();
});

export default securityMiddleware;