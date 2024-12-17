
function showCautionPanel(message, seconds, errorOrWarning) {
    let cautionPanel = document.getElementById("cautionpanel");
    if (errorOrWarning === 'error') {
        cautionPanel.classList.add("cautionpanel-error");
        cautionPanel.classList.remove("cautionpanel-warning");
    } else {
        cautionPanel.classList.add("cautionpanel-warning");
        cautionPanel.classList.remove("cautionpanel-error");
    }

    cautionPanel.style.display = "block";
    cautionPanel.querySelector("#content").innerHTML =
        '<strong style="color:#8a1a12">⚠ ' + errorOrWarning.toUpperCase() + '</strong><br>' + message;
    setTimeout(function () {
        cautionPanel.style.display = "none";
    }, seconds * 1000);
}

export function showErrorPanel(message, seconds = 6) {
    showCautionPanel(message, seconds, 'error');
}

export function showWarningPanel(message, seconds = 6) {
    showCautionPanel(message, seconds, 'warning');
}