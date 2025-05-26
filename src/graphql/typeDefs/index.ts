// Define the GraphQL schema
import { gql } from 'graphql-tag';
import { userAccounts } from "./account";
import { userTypeDefs } from "./user";
import { safetyNetTypeDefs } from "./safety";
import { planTypeDefs } from "./plan";
import { scalarTypeDefs } from "./scalars";

const baseTypeDefs = gql`
  # Your common types and directives here
  type Query
  type Mutation
`;

const typeDefs = [
  baseTypeDefs,
  scalarTypeDefs,
  userTypeDefs, 
  userAccounts, 
  safetyNetTypeDefs, 
  planTypeDefs
];

export default typeDefs;
