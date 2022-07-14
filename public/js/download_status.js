function clicks() {
    document.getElementById("download_button").innerHTML = "Downloading...";
    document.getElementById("download_button").disabled = true;
    window.location.href = download;
}
// listen for clicks on the button
document.getElementById("download_button").addEventListener("click", clicks);

function stopInt(intv) {
    clearInterval(intv);
}

function showStuff() {
    fetch(link)
        .then(response => {
            if (response.status !== 200) {
                // console.log("Error: " + response.status);
            }
            return response.json();
        })
        .then(json => {
            // console.log('parsed json', json)
            // console.log(json.status);
            if (`${json.status}` === 'done') {
                //document.getElementById("loading-screen").style.display = "none";
                // document.getElementById("some-button").style.display = "inline";
                document.getElementById("download_button").innerHTML = "Download Video";
                document.getElementById("download_button").disabled = false;
                document.getElementById("status").innerHTML = "Ready";
                // remove spinners
                document.getElementById("spinners").style.display = "none";
                stopInt(myInt);
            } else {
                document.getElementById("status").innerHTML = `Loading... (This may take a while)`;
            }
        })
}

const myInt = setInterval(showStuff, 1000)
