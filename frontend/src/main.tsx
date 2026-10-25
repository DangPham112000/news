import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client/react';
import { store } from './store';
import { apolloClient } from './lib/apolloClient';
import { AuthProvider } from './components/auth/AuthProvider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ApolloProvider client={apolloClient}>
        <Provider store={store}>
          <App />
        </Provider>
      </ApolloProvider>
    </AuthProvider>
  </StrictMode>,
);
