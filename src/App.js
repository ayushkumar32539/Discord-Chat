import React from 'react';
import './App.css';
import ChatUI from './components/ChatUI';
import EnvTest from './components/EnvTest';

function App() {
  return (
    <div className="App">
      <EnvTest />
      <ChatUI />
    </div>
  );
}

export default App;
