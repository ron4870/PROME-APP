import React from 'react';
import { renderToString } from 'react-dom/server';
import LocalPurchaseOrderForm from '../src/pages/forms/LocalPurchaseOrderForm.tsx';
import { MemoryRouter } from 'react-router-dom';

try {
  const html = renderToString(
    React.createElement(MemoryRouter, null, 
      React.createElement(LocalPurchaseOrderForm)
    )
  );
  console.log("RENDER SUCCESS", html.substring(0, 100));
} catch (e) {
  console.error("RENDER FAILED", e);
}
