export function renderHeader(): string {
  return `
    <nav class="nav-container">
      <div class="logo">
        <h2>WMA <span>Wood Craft</span></h2>
      </div>
      <ul class="nav-links">
        <li><a href="#home">Home</a></li>
        <li><a href="#catalog">Catalog</a></li>
        <li><a href="#custom-order">Custom Order</a></li>
        <li><a href="#about">About Us</a></li>
      </ul>
      <button id="open-chat-btn" class="btn-primary">Chat with Us</button>
    </nav>
  `;
}

export function setupHeaderEvents(): void {
  const chatBtn = document.getElementById('open-chat-btn');
  chatBtn?.addEventListener('click', () => {
    // I-trigger natin ang chat window bukas kapag ginawa na ang Chat component
    console.log('Open chat clicked');
  });
}