const fs = require('fs');
const muxer = require('ytdl-core-muxer');
const url = require("url");
const glob = require("glob");
const express = require("express")
const ytdl = require("ytdl-core");
const cp = require("child_process");
const ffmpeg = require("ffmpeg-static");
const app = express();
const axios = require('axios');
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const port = 80;
const rick = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=RickAstley';
app.set('trust proxy', true)
app.use(express.static('public'));
app.set("view engine", "ejs");

async function del() {
    glob("download/*.mkv", {}, function (er, files) {
        files.forEach(function (x) {
            console.log(x);
            fs.unlinkSync(x);
        });
    })
}

setInterval(function (){
    del()
}, 3600000)


function down(ref, res, file_path) {
    try {
        const audio = ytdl(ref, {quality: 'highestaudio'})
        const video = ytdl(ref, {quality: 'highestvideo'})
        const ffmpegProcess = cp.spawn(ffmpeg, [
            '-loglevel', '8', '-hide_banner',
            '-progress', 'pipe:3',
            '-i', 'pipe:4',
            '-i', 'pipe:5',
            '-map', '0:a',
            '-map', '1:v',
            '-c:v', 'copy',
            file_path, //output file path
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
        });
        ffmpegProcess.on('error', function(err) {
            console.log(err)
        });
        audio.pipe(ffmpegProcess.stdio[4]);
        video.pipe(ffmpegProcess.stdio[5]);
    }catch (e) {
        console.log(e);
    }
}
app.post("/login", (req, res) => {
    const { name, password } = req.body;

    if (name === "admin" && password === "admin") {
        res.render("success", {
            username: name,
        });
    } else {
        res.render("failure");
    }
});

app.get('/watch', function (req, res) {
    const queryObject = url.parse(req.url, true).query;
    let video_id = queryObject.v;
    if (video_id != null) {
        if (muxer.validateID(`${video_id}`)) {
            // if v value given and is valid
            let exists = false;
            let vid_path = `${video_id}.mkv`
            let file_path = `${__dirname}/download/${vid_path}`;
            try{
                axios.get(`https://api.unblockvideos.com/youtube_restrictions?id=${video_id}`)
                    .then(r=> {
                        let cont = true;
                        const dat = r.data[0].blocked;
                        //console.log(dat);
                        if(dat.includes("US")){
                            console.log("Not Available for download");
                            res.render("error",{
                                error:"Regional Restrictions"
                            })
                            cont = false;
                        }
                        try {
                            if (fs.existsSync(file_path)) {
                                exists = true;
                            }
                        } catch (err) {
                            exists = false;
                        }
                        //console.log(video_id);
                        if (!exists && cont) {
                            down(video_id, res, file_path);
                        }
                        else if(exists ) {
                            res.redirect(`/download?v=${queryObject.v}`);
                        }
                        else if(!cont){
                            //pass
                        }
                    })
            }
            catch (e) {
                console.log(e);
            }

        } else {
            //res.redirect(rick);
            //console.log(`Rick Rolled${req.ip}`);
            res.render("error",{
                error:"Invalid ID"
            })
        }
    } else if (queryObject.v === undefined) {
        //res.redirect(rick);
        res.render("error",{
            error:"No Query Specified"
        })
        //console.log(`Rick Rolled ${req.ip}`);
    }

})

app.get('/rick', function (req, res) {
    res.redirect(rick);
})
app.get('/', function (req, res) {
    //res.redirect(rick);
    res.render("index");
})
app.get('/download', function (req, res) {
    const queryObject = url.parse(req.url, true).query;
    if (queryObject.v != null) {
        if (muxer.validateID(queryObject.v + "")) {
            let filename = `${__dirname}/download/${queryObject.v}.mkv`;
            console.log('downloading');
            res.download(filename);
        } else {
            //res.redirect(rick);
            res.render("error",{
                error:"Invalid ID"
            })
            //console.log(`Rick Rolled ${req.ip}`);

        }
    } else {
        //res.redirect(rick);
        res.render("error",{
            error:"No Query Specified"
        })
        //console.log(`Rick Rolled ${req.ip}`);
    }


})

app.get("/repos", async (req, res) => {
    const username = req.query.username || "MatchaOnMuffins";
    try {
        const result = await axios.get(
            `https://api.github.com/users/${username}/repos`
        );
        //console.log(result);
        const repos = result.data.map((repo) => ({
            name: repo.name,
            url: repo.url,
            description: repo.description,
        }));
        res.render("repos", {
            repos
        });
    } catch (error) {
        console.log(error);
        res.status(400).send("Error while getting list of repositories");
    }
});

app.listen(port, () => {
    console.log(`Youtube downloader listening on port ${port}`)
})