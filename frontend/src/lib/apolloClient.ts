import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client/core';

// Dev talks to the local backend; the production build uses same-origin
// "/graphql", which the frontend nginx proxies to the backend container.
const httpLink = new HttpLink({
  uri:
    import.meta.env.VITE_GRAPHQL_URL ||
    (import.meta.env.DEV ? 'http://localhost:4000/graphql' : '/graphql'),
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          articles: {
            // One list per topic + search text; "load more" pages are appended.
            keyArgs: ['topic', 'q'],
            merge(existing, incoming, { args }) {
              if (!existing || (args?.page ?? 1) <= 1) return incoming;
              return { ...incoming, items: [...existing.items, ...incoming.items] };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
