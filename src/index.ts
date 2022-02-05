import * as dotenv from "dotenv";
dotenv.config();

import { GraphQLServer } from "graphql-yoga";
import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as session from "express-session"; 
// server side session, session data is stored on the server (by default in the in memory storage), server is stateful, stateful cookies
import * as passport from "passport";
import { Strategy } from "passport-twitter";

import Query from "./resolvers/Query";
import Mutation from "./resolvers/Mutation";
import Post from "./resolvers/Post";
import User from "./resolvers/User";

import { ResolverMap } from "./types/graphql-utilis";

const cookieParser = require("cookie-parser");
const prisma = new PrismaClient();

interface RequestObj extends Request {
    userId?: number;
}

const resolvers: ResolverMap = {
    Query: Query,
    Mutation: Mutation,
    Post: Post,
    User: User,
};

const server = new GraphQLServer({
    typeDefs: "./src/schema.graphql",
    resolvers: resolvers,
    context: ({
        request,
        response,
    }: {
        request: Request;
        response: Response;
    }) => {
        return {
            request: request,
            response: response,
            prisma: prisma,
        };
    },
});

server.express.use(cookieParser());
server.express.use(
    session({
        secret: "keyboard cat",
        resave: true,
        saveUninitialized: true,
    })
);

server.express.use(async (req: RequestObj, _: Response, next: NextFunction) => {
    const { token } = req.cookies;

    if (token) {
        const decoded = jwt.verify(token, "code all day");

        if (typeof decoded === "object") {
            const jwtData = decoded as { id: number; iat: number };

            // check for a user
            const currentUser = await prisma.user.findUnique({
                where: { id: jwtData.id },
            });
            if (!currentUser) {
                throw new Error("User doesn't exist");
            } 

            // check if the user is confirmed
            if (!currentUser.confirmed) {
                throw new Error(
                    "Please check your inbox to confirm your email!"
                );
            }

            // check if password was changed after the token was issued.
            if (currentUser.passwordChangedAt) {
                // converts time into milliseconds and then into seconds(after dividing by 1000)
                const changedAtTimeStamp = currentUser.passwordChangedAt / 1000;

                // if password was changed after the token was issued
                if (changedAtTimeStamp > jwtData.iat) {
                    throw new Error(
                        "Password was changed recently.Please login again!"
                    );
                }
            }

            req.userId = jwtData.id;
        }
    }

    next();
});

server.express.get(
    "/confirm/:userId/:token",
    async (req: Request, res: Response) => {
        const { userId, token } = req.params;

        const users = await prisma.user.findMany({
            where: { id: Number(userId), confirmToken: token },
        });
        const user = users[0] as any;
        console.log(user);

        if (!user) {
            throw new Error("User not found");
        }

        if (user !== null) {
            if (user.confirmTokenExpiry < Date.now() - 60 * 60 * 1000) {
                throw new Error("Link has expired!");
            }
        }

        const updateUser = await prisma.user.update({
            where: { id: Number(userId) },
            data: {
                confirmed: true,
                confirmToken: null,
                confirmTokenExpiry: null,
            },
        });

        console.log(updateUser);

        res.send("Your email has been confirmed!");
    }
);

passport.use(
    new Strategy(
        {
            consumerKey: process.env.TWITTER_CONSUMER_KEY as string,
            consumerSecret: process.env.TWITTER_CONSUMER_SECRET as string,
            callbackURL: "http://localhost:4000/auth/twitter/callback",
            includeEmail: true,
        },
        async (_, __, profile, cb) => {
            let email: any;

            const { id, emails } = profile;
            if (emails) {
                email = emails[0].value;
            }

            const [user] = await prisma.user.findMany({
                where: {
                    OR: [{ twitterId: id }, { email: email }],
                },
            });

            if (!user) {
                const createdUser = await prisma.user.create({
                    data: {
                        twitterId: id,
                        confirmed: true,
                        email: email,
                    },
                });

                return cb(null, { user: createdUser });
            } else if (!user.twitterId) {
                // user(email) exists but is not twitter signed user.
                // merge twitter login with email login
                const updatedUser = await prisma.user.update({
                    where: { id: user.id },
                    data: { twitterId: id },
                });

                return cb(null, { user: updatedUser });
            } else {
                // user exists and also twitterId is present
                return cb(null, { user: user });
            }
        }
    )
);

server.express.use(passport.initialize());
server.express.use(passport.session());

server.express.get("/auth/twitter", passport.authenticate("twitter"));

server.express.get(
    "/auth/twitter/callback",
    passport.authenticate("twitter", { session: false }),
    (req, res) => {
        const { id } = (req.user as any).user;

        const token = jwt.sign({ id: id }, "code all day");

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });

        // @todo redirect to frontend
        res.redirect(process.env.FRONTEND_URL as string);
    }
);

server.start(
    { cors: { origin: process.env.FRONTEND_URL, credentials: true } },
    () => console.log("Server is running on localhost:4000")
);
