import { PrismaClient } from ".prisma/client";

const Query = {
    hello: (_: any, { name }: GQL.IHelloOnQueryArguments) =>
        `Hello ${name || "World"}`,

    me: async (_: any, __: any, context: any) => {
        if (context.request.userId) {
            const user = await context.prisma.user.findUnique({
                where: { id: context.request.userId },
            });

            if (!user) {
                throw new Error("User not found!");
            }

            if (!user.confirmed) {
                throw new Error(
                    "Please check your inbox to confirm your email!"
                );
            }

            return user;
        }
    },

    getUsers: async (_: any, __: any, context: any) => {
        const users = await context.prisma.user.findMany();
        console.log(users);

        return users;
    },

    allPosts: async (_: any, __: any, context: { prisma: PrismaClient }) => {
        const posts = await context.prisma.post.findMany({});

        return posts;
    },

    posts: async (
        _: any,
        __: any,
        context: { prisma: PrismaClient; request: any }
    ) => {
        if (!context.request.userId) {
            throw new Error("Login to view your posts!");
        }
        const posts = await context.prisma.post.findMany({
            where: {
                authorId: context.request.userId,
            },
        });

        return posts;
    },
};

export default Query;
