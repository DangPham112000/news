export const typeDefs = `#graphql
  type Topic {
    slug: ID!
    name: String!
    articleCount: Int!
  }

  type Article {
    id: ID!
    "Slug of the topic."
    topic: String!
    title: String!
    url: String!
    summary: String!
    source: String!
    publishedAt: String
    fetchedAt: String!
  }

  type ArticlePage {
    items: [Article!]!
    page: Int!
    pageSize: Int!
    total: Int!
  }

  input ArticleInput {
    title: String!
    url: String!
    summary: String
    source: String
    "ISO 8601 date-time."
    publishedAt: String
  }

  type InvalidArticle {
    "Position of the item in the submitted list."
    index: Int!
    errors: [String!]!
  }

  type UpsertResult {
    topic: String!
    created: Int!
    updated: Int!
    duplicates: Int!
    invalid: [InvalidArticle!]!
  }

  "The person signed in with the shared Clerk app."
  type Viewer {
    clerkId: ID!
  }

  type Query {
    "The signed-in person, or null. Reading news needs no sign-in."
    me: Viewer
    topics: [Topic!]!
    "Newest first. pageSize is capped at 100."
    articles(topic: String, q: String, page: Int, pageSize: Int): ArticlePage!
  }

  type Mutation {
    "Idempotent batch upsert (max 100) into a topic, created on demand."
    upsertArticles(topic: String!, articles: [ArticleInput!]!): UpsertResult!
  }
`;
