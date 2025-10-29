/* eslint-disable */
import React from 'react';
import Aside from './layout/Aside.jsx';
import Main from './layout/Main.jsx';
import { DateRangeProvider } from './context/DateRangeContext.js';
import StreamingManager from './components/StreamingManager.jsx';
import './App.css';


export default function App(){
  return (
    <DateRangeProvider>
      <StreamingManager />
      <div className="app">
        <Aside />
        <Main />
      </div>
    </DateRangeProvider>
  );
}

