import { node } from '../utils/utils.js';

class Footer {

  maxMessages = 1;

  constructor(element) {
    this.messagesContainer = node`<div class="content"><div/>`;
    element.appendChild(document.createTextNode('Speleo Studio 1.0.0'));
    element.appendChild(this.messagesContainer);
    this.messages = [];
  }

  addMessage(message) {
    this.messages.push(message);
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
    this.messagesContainer.innerHTML = this.messages.join('<br>');
  }
}

export { Footer };
