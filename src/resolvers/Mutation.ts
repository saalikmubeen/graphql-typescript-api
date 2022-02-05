import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { Response, Request } from "express";
import { randomBytes } from "crypto";
import { promisify } from "util";
import { transporter, emailMessage } from "../mail";
import { PrismaClient } from ".prisma/client";

const Mutation = {
    register: async (
        _: any,
        args: GQL.IRegisterOnMutationArguments,
        context: { prisma: PrismaClient; response: Response; request: Request }
    ) => {
        const password = await bcrypt.hash(args.password, 10);

        const promisedRandomBytes = promisify(randomBytes);
        const confirmToken = (await promisedRandomBytes(20)).toString("hex");
        const confirmTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

        const user = await context.prisma.user.create({
            data: {
                ...args,
                password: password,
                confirmToken,
                confirmTokenExpiry,
                passwordChangedAt: Date.now() - 2000,
            },
        });
        console.log(user);

        const token = jwt.sign({ id: user.id }, "code all day");

        context.response.cookie("token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });

        // creating confirm email link
        const url = `${context.request.protocol}://${context.request.get(
            "host"
        )}/confirm/${user.id}/${confirmToken}`;

        // send mail with defined transport object
        let info = await transporter.sendMail({
            from: '"Fred Foo 👻" <foo@example.com>', // sender address
            to: user.email, // list of receivers
            subject: "Confirm your email ✔", // Subject line
            text: "Welcome to sick-fits. Thanks for registering We hope you will enjoy our services.", // plain text body
            html: emailMessage(`Welcome to sick-fits. Thanks for registering We hope you will enjoy our services. Click the following link to confirm your email. \n\n
            <a href=${url}>Confirm Email</a>`), // html body
        });

        console.log("Message sent: %s", info.messageId);

        return user;
    },

    login: async (
        _: any,
        { email, password }: GQL.ILoginOnMutationArguments,
        context: any
    ) => {
        const user = await context.prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            throw new Error("Incorrect email or password");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new Error("Incorrect email or password");
        }

        const token = jwt.sign({ id: user.id }, "code all day");

        context.response.cookie("token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });

        return user;
    },

    logOut: async (_: any, __: any, context: { response: Response }) => {
        context.response.clearCookie("token");

        return "Signed Out successfully!";
    },

    requestPasswordReset: async (
        _: any,
        { email }: GQL.IRequestPasswordResetOnMutationArguments,
        context: any
    ) => {
        const user = await context.prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            throw new Error("User with that email doesn't exist!");
        }

        const promisedRandomBytes = promisify(randomBytes);
        const resetToken = (await promisedRandomBytes(20)).toString("hex");
        const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

        const updateUser = await context.prisma.user.update({
            where: { email: user.email },
            data: { resetToken, resetTokenExpiry },
        });

        console.log(updateUser);

        // send mail with defined transport object
        let info = await transporter.sendMail({
            from: '"Fred Foo 👻" <foo@example.com>', // sender address
            to: user.email, // list of receivers
            subject: "Reset your password ✔", // Subject line
            text: `Click the below link to reset your password.
                   ${process.env.FRONTEND_URL}/resetPassword?resetToken=${resetToken}`, // plain text body
            html: emailMessage(`Click the below link to reset your password.
                    <a href=${process.env.FRONTEND_URL}/resetPassword?resetToken=${resetToken}>Reset Password</a>`), // html body
        });

        console.log("Message sent: %s", info.messageId);

        return "Check your email to reset the password!";
    },

    resetPassword: async (
        _: any,
        args: GQL.IResetPasswordOnMutationArguments,
        context: any
    ) => {
        if (args.password !== args.confirmPassword) {
            throw new Error("Your passwords don't match");
        }

        console.log(args.resetToken);

        const [user] = await context.prisma.user.findMany({
            where: { resetToken: args.resetToken },
        });

        if (!user) {
            throw new Error("Password reset link is invalid!");
        }

        if (user.resetTokenExpiry < Date.now() - 60 * 60 * 1000) {
            // if resetToken expiry is less than one hour
            throw new Error("Password resent link has expired!");
        } // tokenTime + tokenLife < dateNow.getTime()

        const hashedPassword = await bcrypt.hash(args.password, 10);

        const updateUser = await context.prisma.user.update({
            where: { email: user.email },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
                passwordChangedAt: Date.now() - 2000,
            },
        });

        const token = jwt.sign({ id: user.id }, "code all day");

        context.response.cookie("token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });

        return updateUser;
    },

    createPost: async (
        _: any,
        args: GQL.ICreatePostOnMutationArguments,
        context: { prisma: PrismaClient; request: any }
    ) => {
        const { prisma, request } = context;

        if (!request.userId) {
            throw new Error("Login to create Post");
        }

        // const user = await prisma.user.findUnique({ where: { id: args.authorId } });

        // if (!user) {
        //     throw new Error("Register to create Post")
        // }

        const post = await prisma.post.create({
            data: { ...args.data, author: { connect: { id: request.userId } } },
        });

        console.log(post);

        return post;
    },
};

export default Mutation;
