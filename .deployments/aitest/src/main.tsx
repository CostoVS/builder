
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Route, Switch } from 'wouter';

function App() { return <h1>Hello from App!</h1>; }

ReactDOM.createRoot(document.getElementById('root')).render(
  <Switch>
    <Route path="/" component={App} />
  </Switch>
);
