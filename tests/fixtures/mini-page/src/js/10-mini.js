// The mini page's one picture: Go changes the readout.
safe("mini", () => {
  $("#pa-go").addEventListener("click", () => { $("#pa-out").textContent = "went"; });
});
