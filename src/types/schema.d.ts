// tslint:disable
// graphql typescript definitions

declare namespace GQL {
interface IGraphQLResponseRoot {
data?: IQuery | IMutation;
errors?: Array<IGraphQLResponseError>;
}

interface IGraphQLResponseError {
/** Required for all errors */
message: string;
locations?: Array<IGraphQLResponseErrorLocation>;
/** 7.2.2 says 'GraphQL servers may provide additional entries to error' */
[propName: string]: any;
}

interface IGraphQLResponseErrorLocation {
line: number;
column: number;
}

interface IQuery {
__typename: "Query";
hello: string;
me: IUser | null;
getUsers: Array<IUser | null>;
posts: Array<IPost>;
}

interface IHelloOnQueryArguments {
name?: string | null;
}

interface IUser {
__typename: "User";
id: string;
username: string;
email: string;
password: string;
posts: Array<IPost>;
}

interface IPost {
__typename: "Post";
id: string;
title: string;
description: string;
published: boolean;
createdAt: string;
author: IUser;
}

interface IMutation {
__typename: "Mutation";
register: IUser;
login: IUser;
logOut: string;
requestPasswordReset: string;
resetPassword: IUser;
createPost: IPost;
}

interface IRegisterOnMutationArguments {
username: string;
email: string;
password: string;
}

interface ILoginOnMutationArguments {
email: string;
password: string;
}

interface IRequestPasswordResetOnMutationArguments {
email: string;
}

interface IResetPasswordOnMutationArguments {
resetToken: string;
password: string;
confirmPassword: string;
}

interface ICreatePostOnMutationArguments {
data: ICreatePostInput;
authorId: number;
}

interface ICreatePostInput {
title: string;
description: string;
published: boolean;
}
}

// tslint:enable
