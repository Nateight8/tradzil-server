import { gql } from "graphql-tag";

export const userTypeDefs = gql`
  enum OnboardingStep {
    account_setup
    trading_style
    safety_net
    complete
  }

  type User {
    id: String!
    name: String
    email: String!
    image: String
    createdAt: String
    updatedAt: String
  }

  type Query {
    """
    Get the currently authenticated user.
    Returns null if no user is authenticated.
    """
    me: User
  }

  type Mutation {
    logout: LogoutResponse!
  }

  type LogoutResponse {
    success: Boolean!
    message: String!
  }
`;
