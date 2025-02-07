let apiKey = null;

// Fetch API key when page loads
fetch('/v1/config')
    .then(response => response.json())
    .then(config => {
        apiKey = config.apiKey;
    })
    .catch(error => {
        console.error('Error fetching API configuration:', error);
        displayMessage('error', 'Error loading configuration');
    });

document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (!userInput) return;

    if (!apiKey) {
        displayMessage('error', 'API key not loaded. Please refresh the page.');
        return;
    }

    // Display user's message
    displayMessage('user', userInput);

    // Send message to the API
    fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: 'user', content: userInput }]
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Check if the response contains the expected structure
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            const message = data.choices[0].message.content;
            displayMessage('assistant', message);
        } else {
            console.error('Unexpected response format:', data);
            displayMessage('error', 'Unexpected response format from server.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayMessage('error', `Error: ${error.message}`);
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
    
    // Scroll to the bottom of the chat window
    const chatWindow = document.getElementById('chat-window');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
