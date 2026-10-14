import { gql } from '@apollo/client/core';

export const GET_TOPICS = gql`
  query Topics {
    topics {
      slug
      name
      articleCount
    }
  }
`;

export const GET_ARTICLES = gql`
  query Articles($topic: String, $q: String, $page: Int, $pageSize: Int) {
    articles(topic: $topic, q: $q, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      items {
        id
        topic
        title
        url
        summary
        source
        publishedAt
        fetchedAt
      }
    }
  }
`;
