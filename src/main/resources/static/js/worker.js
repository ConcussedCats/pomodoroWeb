let timerInterval = null;

self.onmessage = function(e) {
    const command = e.data;

    if (command === "start") {
        //if there's already an interval running, clear it before starting a new one
        if (timerInterval) clearInterval(timerInterval);
        
        // Start a new interval that sends a 'tick' message every second
        timerInterval = setInterval(() => {
            self.postMessage("tick");
        }, 1000);
    } else if (command === "stop") {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    }
};