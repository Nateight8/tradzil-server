import { mergeResolvers } from "@graphql-tools/merge";
import { userResolvers } from "./user.js";
import { accountResolvers } from "./account.js";
import { safetyNetResolvers } from "./safety.js";
import { planResolvers } from "./plan.js";
import { JSONResolver, DateTimeResolver } from 'graphql-scalars';

const scalarResolvers = {
  JSON: JSONResolver,
  DateTime: DateTimeResolver
};

const resolversArray = [
  scalarResolvers,
  userResolvers,
  accountResolvers,
  safetyNetResolvers,
  planResolvers
].filter(Boolean);

const resolvers = mergeResolvers(resolversArray);

export default resolvers;
