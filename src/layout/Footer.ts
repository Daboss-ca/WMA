export function renderFooter(): string {
  const currentYear = new Date().getFullYear();
  
  return `
    <div class="footer-content">
      <div class="footer-brand">
        <h3>WMA Wood Craft</h3>
        <p>Quality custom woodwork, furniture, cabinets, and kiosks built with passion.</p>
      </div>
      <div class="footer-links">
        <h4>Connect with Us</h4>
        <div class="social-links">
          <a href="https://facebook.com" target="_blank" rel="noopener">Facebook</a>
          <a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${currentYear} WMA Wood Craft. All Rights Reserved.</p>
    </div>
  `;
}