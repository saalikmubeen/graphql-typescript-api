import { PrismaClient } from ".prisma/client";

const Post = {
    author: async (parent: any, _: any, context: { prisma: PrismaClient }) => {
        // console.log(parent);

        const user = await context.prisma.user.findUnique({
            where: { id: parent.authorId },
        });

        return user;
    },
};

export default Post;
