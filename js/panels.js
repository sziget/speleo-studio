
export function showErrorPanel(message, left, top) {
    errorpanel.style.left = left + "px";
    errorpanel.style.top = top + "px";
    errorpanel.style.display = "block";
    errorpanelcontent.innerHTML = '<strong>⚠ ERROR </strong>' + message;
    setTimeout(function () {
        errorpanel.style.display = "none";
    }, 6000);
}