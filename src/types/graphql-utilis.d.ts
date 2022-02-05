import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';

export interface ResolverMap {
    [key: string]: {
        [key: string]: (parent: any, args: any, context: { request: Request, response: Response, prisma: PrismaClient }, info: any) => any
    }
}