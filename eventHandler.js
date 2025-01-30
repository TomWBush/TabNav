function Event() {
    this.eventHandlers = [];
}

Event.prototype.addHandler = function(handler) {
    this.eventHandlers.push(handler);
};

Event.prototype.execute = function() {
    this.eventHandlers.forEach(handler => handler());
};

// For proper module usage (if you're not using modules yet, you'll need to add type="module" to the <script> tag in your HTML)
export { Event };