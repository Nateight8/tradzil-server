import { mergeResolvers } from "@graphql-tools/merge";
import { userResolvers } from "./user.js";
import { accountResolvers } from "./account.js";
import { safetyNetResolvers } from "./safety.js";
import { planResolvers } from "./plan.js";
import { journalResolvers } from "./journal.js";
import { JSONResolver, DateTimeResolver } from "graphql-scalars";
import { dashboardResolvers } from "./dashboard.js";

const scalarResolvers = {
  JSON: JSONResolver,
  DateTime: DateTimeResolver,
};

const resolversArray = [
  scalarResolvers,
  userResolvers,
  accountResolvers,
  safetyNetResolvers,
  planResolvers,
  journalResolvers,
  dashboardResolvers,
].filter(Boolean);

const resolvers = mergeResolvers(resolversArray);

export default resolvers;
