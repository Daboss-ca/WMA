import './sytle/index.css';
import { renderHeader, setupHeaderEvents } from './layout/Header';
import { renderFooter } from './layout/Footer';

function initApp(): void {
  const headerContainer = document.getElementById('app-header');
  const footerContainer = document.getElementById('app-footer');

  if (headerContainer) {
    headerContainer.innerHTML = renderHeader();
    setupHeaderEvents();
  }

  if (footerContainer) {
    footerContainer.innerHTML = renderFooter();
  }
}

// Patakbuhin ang app pagka-load ng DOM
document.addEventListener('DOMContentLoaded', initApp);