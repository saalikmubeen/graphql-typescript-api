import { PrismaClient } from ".prisma/client";

const User = {

    posts: async (parent: any, _: any, context: { prisma: PrismaClient }) => {
        
        const posts = await context.prisma.post.findMany({ where: { authorId: parent.id } });
        
        return posts;
    }
}


export default User;