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
const https = require("https");
const port = 443;
const rick = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=RickAstley';
app.use(bodyParser.urlencoded({extended: false}));
app.set('trust proxy', true)
app.use(express.static('public'));
app.set("view engine", "ejs");

const local_http = express();

function del() {
    glob("download/*.mkv", {}, function (er, files) {
        files.forEach(function (x) {
            console.log(x);
            let id = x.substring(x.length - 15, x.length - 4);
            let status = `status/${id}.status`;
            axios.get(`http://localhost/status?v=${id}&redirect=false`)
                .then(response => {
                    if (response.data.status === 'done') {
                        fs.unlinkSync(x);
                        fs.unlinkSync(status);
                    }
                });
        });
    });
}

setInterval(function () {
    del()
}, 3600000)


function down(ref, res, file_path) {
    fs.writeFile(`${__dirname}/status/${ref}.status`, "", function () {
    })
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
            //res.redirect(`/download?v=${ref}`)
            fs.writeFile(`${__dirname}/status/${ref}.status`, "done", err => {
                if (err) {
                    console.error(err);
                }
                // file written successfully
            });
        });
        ffmpegProcess.on('error', function (err) {
            console.log(err)
        });
        audio.pipe(ffmpegProcess.stdio[4]);
        video.pipe(ffmpegProcess.stdio[5]);
    } catch (e) {
        console.log(e);
    }
}

app.post("/login", (req, res) => {
    const {name, password} = req.body;

    if (password === "bingus") {
        res.render("success", {
            username: name,
        });
    } else {
        res.render("failure");
    }
});



app.get('/watch', function (req, res) {
    console.log(`request received from ${req.ip}`);
    const queryObject = url.parse(req.url, true).query;
    let video_id = queryObject.v;
    if (video_id != null) {
        if (muxer.validateID(`${video_id}`)) {
            // if v value given and is valid
            let exists = false;
            let vid_path = `${video_id}.mkv`;
            let file_path = `${__dirname}/download/${vid_path}`;
            try { //nominal entry
                axios.get(`https://api.unblockvideos.com/youtube_restrictions?id=${video_id}`)
                    .then(r => {
                        let cont = true;
                        const dat = r.data[0].blocked;

                        if (dat.includes("US")) {
                            console.log("Not Available for download");
                            res.render("error", {
                                error: "Regional Restrictions"
                            });
                            cont = false;
                        }

                        try {
                            if (fs.existsSync(file_path)) {
                                exists = true;
                            }
                        } catch (err) {
                            exists = false;
                        }
                        if (!exists && cont) {
                            res.render(`watch`, {
                                link: video_id
                            })
                            down(video_id, res, file_path);
                        } else if (exists) {
                            //res.redirect(`/download?v=${queryObject.v}`);
                            res.render(`watch`, {
                                link: video_id
                            })
                        } else if (!cont) {
                            res.render("error", {
                                error: "Other Error"
                            })
                        }
                    })
            } catch (e) {
                console.log(e);
            }

        } else {
            res.render("error", {
                error: "Invalid ID"
            })
        }
    } else if (queryObject.v === undefined) {
        res.render("error", {
            error: "No Query Specified"
        })
    }

})

app.get('/rick', function (req, res) {
    res.redirect(rick);
})

app.get('/', function (req, res) {
    //res.redirect(rick);
    res.render("index");
})

app.get('/status-secure', function (req, res) {
    const queryObject = url.parse(req.url, true).query;
    let video_id = queryObject.v;
    if (video_id != null) {
        if (muxer.validateID(`${video_id}`)) {
            fs.readFile(`${__dirname}/status/${video_id}.status`, 'utf8', (err, data) => {
                if (err) {
                    //console.error(err);
                    res.status(500)
                    return;
                }
                let re = {
                    "status": data
                };
                res.status(200).json(re);
            });

        } else {
            res.status(403)
        }
    }
})



local_http.get('/status', function (req, res) {
    const queryObject = url.parse(req.url, true).query;
    let video_id = queryObject.v;
    if (video_id != null) {
        if (muxer.validateID(`${video_id}`)) {
            fs.readFile(`${__dirname}/status/${video_id}.status`, 'utf8', (err, data) => {
                if (err) {
                    //console.error(err);
                    res.status(500)
                    return;
                }
                let re = {
                    "status": data
                };
                res.status(200).json(re);
            });

        } else {
            res.status(403)
        }
    }
})


local_http.get('*',function (req, res) {
    const queryObj = url.parse(req.url, true).query;
    let redirect = queryObj.redirect
    if(redirect !== 'false'){
        res.redirect('https://' + req.headers.host + req.url);
    }

})


app.get('/download', function (req, res) {
    const queryObject = url.parse(req.url, true).query;
    if (queryObject.v != null) {
        if (muxer.validateID(queryObject.v + "")) {
            let filename = `${__dirname}/download/${queryObject.v}.mkv`;
            try {
                if (fs.existsSync(filename)) {
                    console.log('Sending File'+filename);
                    res.download(filename);
                }
            } catch (err) {
                res.status(404).render('404');
            }
            // if cache already cleared
        } else {
            //res.redirect(rick);
            res.render("error", {
                error: "Invalid ID"
            })

        }
    } else {
        //res.redirect(rick);
        res.render("error", {
            error: "No Query Specified"
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
            url: repo.html_url,
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

const options = {
    key: fs.readFileSync('auth/key.pem'),
    cert: fs.readFileSync('auth/cert.pem')
};

app.use((req, res, next) => {
    res.status(404).render('404');
})

local_http.use((req, res, next) => {
    res.status(404).render('404');
})


const server = https.createServer(options, app);

server.listen(port, () => {
    console.log(`Youtube downloader listening on port ${port}`)
})

local_http.listen(80,()=>{
    console.log('LoopBack Server listing on port 80');
})

