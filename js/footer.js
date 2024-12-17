export class Footer {
    maxMessages = 3;
    constructor(element) {
        this.element = element;
        this.messages = [];
    }

    addMessage(message) {
        this.messages.push(message);
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
        this.element.querySelector("#content").innerHTML = this.messages.join('<br>');
    }
}