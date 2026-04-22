import {Request, Response, NextFunction} from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
    id: string;
    username: string;
}   

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export function authenticateToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers["authorization"]
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

    if(!token) return res.status(401).json({message: "Missing Token"});

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = {id: decoded.id, username: decoded.username};
        next();
    }catch{
        return res.status(401).json({ message: "Invalid token" });
    }
}