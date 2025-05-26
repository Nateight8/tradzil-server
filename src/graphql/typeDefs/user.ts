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
    onboardingStep: OnboardingStep
    createdAt: String
    updatedAt: String
    # accounts: [TradingAccount!]!
  }

  type Query {
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
