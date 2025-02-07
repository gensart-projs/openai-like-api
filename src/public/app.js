document.getElementById('send-button').addEventListener('click', sendMessage);

function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (!userInput) return;

    // Display user's message
    displayMessage('user', userInput);

    // Send message to the API
    fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer your-secret-api-key-here' // Replace with actual API key
        },
        body: JSON.stringify({
            messages: [{ role: 'user', content: userInput }]
        })
    })
    .then(response => response.json())
    .then(data => {
        // Display API response
        const message = data.choices[0].message.content;
        displayMessage('assistant', message);
    })
    .catch(error => {
        console.error('Error:', error);
        displayMessage('error', 'There was an error processing your request.');
    });

    // Clear input field
    document.getElementById('user-input').value = '';
}

function displayMessage(role, message) {
    const output = document.getElementById('output');
    const messageElement = document.createElement('div');
    messageElement.className = role;
    messageElement.textContent = message;
    output.appendChild(messageElement);
    output.scrollTop = output.scrollHeight;
}
