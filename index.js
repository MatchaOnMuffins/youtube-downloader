const fs = require('fs');
const muxer = require('ytdl-core-muxer');
const url = require("url");
const express = require("express")
const ytdl = require("ytdl-core");
const cp = require("child_process");
const readline = require("readline");
const ffmpeg = require("ffmpeg-static");
const app = express();
const port = 80;
const rick = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=RickAstley';

function down(ref,res,file_path) {
    const tracker = {
        start: Date.now(),
        audio: {downloaded: 0, total: Infinity},
        video: {downloaded: 0, total: Infinity},
        merged: {frame: 0, speed: '0x', fps: 0},
    };

// Get audio and video streams
    const audio = ytdl(ref, {quality: 'highestaudio'})
        .on('progress', (_, downloaded, total) => {
            tracker.audio = {downloaded, total};
        });
    const video = ytdl(ref, {quality: 'highestvideo'})
        .on('progress', (_, downloaded, total) => {
            tracker.video = {downloaded, total};
        });

    let progressbarHandle = null;
    const progressbarInterval = 1000;
    const showProgress = () => {
        readline.cursorTo(process.stdout, 0);
        const toMB = i => (i / 1024 / 1024).toFixed(2);

        process.stdout.write(`Audio  | ${(tracker.audio.downloaded / tracker.audio.total * 100).toFixed(2)}% processed `);
        process.stdout.write(`(${toMB(tracker.audio.downloaded)}MB of ${toMB(tracker.audio.total)}MB).${' '.repeat(10)}\n`);

        process.stdout.write(`Video  | ${(tracker.video.downloaded / tracker.video.total * 100).toFixed(2)}% processed `);
        process.stdout.write(`(${toMB(tracker.video.downloaded)}MB of ${toMB(tracker.video.total)}MB).${' '.repeat(10)}\n`);

        process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
        process.stdout.write(`(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${' '.repeat(10)}\n`);

        process.stdout.write(`running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(2)} Minutes.`);
        readline.moveCursor(process.stdout, 0, -3);
    };

// Start the ffmpeg child process
    const ffmpegProcess = cp.spawn(ffmpeg, [
        // Remove ffmpeg's console spamming
        '-loglevel', '8', '-hide_banner',
        // Redirect/Enable progress messages
        '-progress', 'pipe:3',
        // Set inputs
        '-i', 'pipe:4',
        '-i', 'pipe:5',
        // Map audio & video from streams
        '-map', '0:a',
        '-map', '1:v',
        // Keep encoding
        '-c:v', 'copy',
        // Define output file
        file_path,
    ], {
        windowsHide: true,
        stdio: [
            /* Standard: stdin, stdout, stderr */
            'inherit', 'inherit', 'inherit',
            /* Custom: pipe:3, pipe:4, pipe:5 */
            'pipe', 'pipe', 'pipe',
        ],
    });
    ffmpegProcess.on('close', () => {
        res.redirect(`/download?v=${ref}`)
        process.stdout.write('\n\n\n\n');
        clearInterval(progressbarHandle);
    });
    ffmpegProcess.stdio[3].on('data', chunk => {
        // Start the progress bar
        if (!progressbarHandle) progressbarHandle = setInterval(showProgress, progressbarInterval);
        // Parse the param=value list returned by ffmpeg
        const lines = chunk.toString().trim().split('\n');
        const args = {};
        for (const l of lines) {
            const [key, value] = l.split('=');
            args[key.trim()] = value.trim();
        }
        tracker.merged = args;
    });
    audio.pipe(ffmpegProcess.stdio[4]);
    video.pipe(ffmpegProcess.stdio[5]);

}

app.get('/watch', function (req, res) {
    const queryObject = url.parse(req.url, true).query;
    let video_id = queryObject.v;
    if (video_id != null) {
        if (muxer.validateID(`${video_id}`)) {
            // if v value given and is valid
            let exists = false;
            let vid_path = `${video_id}.mkv`
            let file_path = `${__dirname}/download/${vid_path}`;
            try {
                if (fs.existsSync(file_path)) {
                    exists = true;
                }
            } catch(err) {
                exists = false;
            }
            console.log(video_id);
            if(!exists){
                down(video_id,res,file_path);
            }
            else {
                res.redirect(`/download?v=${queryObject.v}`);
            }
        } else {
            res.redirect(rick);
        }
    }
    else if (queryObject.v === undefined) {
        res.redirect(rick);
    }

})

app.get('/yum',function (req, res) {
    res.redirect(rick);
})
app.get('/download',function (req, res) {
    const queryObject = url.parse(req.url, true).query;
    if (queryObject.v != null){
        if(muxer.validateID(queryObject.v+"")){
            let filename = `${__dirname}/download/${queryObject.v}.mkv`;
            console.log('downloading');
            res.download(filename);
        }
        else{
            res.redirect(rick);
        }
    }
    else{
        res.redirect(rick);
    }


})

app.listen(port, () => {
    console.log(`Youtube downloader listening on port ${port}`)
})