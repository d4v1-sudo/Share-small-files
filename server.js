const fileSystem = require("fs");
const http = require("http");
const { IncomingForm } = require("formidable");
const path = require("path");
const operatingSystem = require("os");

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fileSystem.existsSync(uploadsDir)) {
  fileSystem.mkdirSync(uploadsDir, { recursive: true });
}

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  let chunks_iteration = 0,
    file_nth = 0;
  console.log(req.url);

  if (req.url === "/status") {
    res.setHeader("Content-Type", "text/html");
    res.end(`${formatBytes(chunks_iteration * 512 * 1024)} of (${file_nth})`);
    return;
  }

  if (req.url === "/") {
    res.setHeader("Content-Type", "text/html");
    res.write(readDirectory("./"));
    res.end();
    return;
  }

  if (req.url === "/send_files") {
    res.setHeader("Content-Type", "text/html");
    res.write(htmlForm());
    res.end();
    return;
  }

if (req.url === "/file_submit") {
  console.log("Receiving file submission");
  const form = new IncomingForm({
    allowEmptyFiles: true,
    minFileSize: 0,
    maxFileSize: 200 * 1024 * 1024, // 200MB max file size
    multiples: true
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error: " + err.message);
      return;
    }

    console.log("Fields:", fields);
    console.log("Files:", files);

    try {
      let filesUploaded = 0;

      ["file", "folder"].forEach((formItem) => {
        if (files[formItem]) {
          const fileArray = Array.isArray(files[formItem]) ? files[formItem] : [files[formItem]];
          fileArray.forEach((file) => {
            if (!file.originalFilename) {
              console.warn(`Skipping empty ${formItem}`);
              return;
            }

            console.log(`Processing ${formItem}:`, file.originalFilename);

            const targetPath = path.join(uploadsDir, file.originalFilename);
            console.log(`Moving file to: ${targetPath}`);

            if (!fileSystem.existsSync(path.dirname(targetPath))) {
              fileSystem.mkdirSync(path.dirname(targetPath), { recursive: true });
            }

            fileSystem.renameSync(file.filepath, targetPath);
            console.log(`File moved successfully: ${file.originalFilename}`);
            filesUploaded++;
          });
        } else {
          console.log(`No ${formItem} received`);
        }
      });

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(htmlForm() + `<p>${filesUploaded} file(s) uploaded successfully!</p>`);
    } catch (error) {
      console.error("Error processing files:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error: " + error.message);
    }
  });
  return;
}

  var decodedUrl = decodeURIComponent(req.url);

  if (fileSystem.existsSync("." + decodedUrl)) {
    if (fileSystem.lstatSync("." + decodedUrl).isFile()) {
      var readStream = fileSystem.createReadStream("." + decodedUrl);
      readStream.pipe(res);
    } else {
      res.write(readDirectory("." + decodedUrl + "/"));
      res.end();
    }
  }
});

server.listen(5000, (err) => {
  if (!err) {
    console.log(`Server running at port 5000`);
    var n_interfaces = operatingSystem.networkInterfaces();
    if (n_interfaces.wlo1)
      n_interfaces.wlo1.map((each_interface) => {
        if (each_interface.family === "IPv4") {
          console.log(
            `Open Link in Browser http://${each_interface.address}:5000`
          );
          return;
        }
      });
    else {
      console.log(
        "You are not connected to any device, connect with mobile via hotspot/wifi then you can share files between your mobile and laptop\n"
      );

      console.log(
        "Still you can try it on this system , open http://localhost:5000"
      );
    }
  } else console.log(err);
});

function HtmlParent(insertion) {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Share</title>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <script src="https://unpkg.com/htmx.org@0.0.8"></script>
        <link rel="icon" href="data:" type="image/x-icon" />
      </head>
      <body>
        <h2>Start share <span class="material-icons">description</span></h2>
        ${insertion}
        <footer style="position: absolute; left: 20px; bottom: 0">
          <p>©Copyright 2050 by nobody. All rights reversed.</p>
        </footer>
      </body>
    </html>`;
}

function readDirectory(read_path) {
  let tag = "",
    return_tag = "",
    eachfile_stat = "";
  fileSystem.readdirSync(read_path).map((fileName) => {
    eachfile_stat = fileSystem.lstatSync(read_path + fileName);
    if (eachfile_stat.isFile()) {
      tag = `<tr><td><span class="material-icons">description</span></td>
                <td><a href="${
                  read_path.replace(".", "") + fileName
                }" download title="Download" >${fileName}</a></td><td>${formatBytes(
        eachfile_stat.size
      )}</td></tr>`;
    } else {
      tag = `<tr><td><span class="material-icons">folder</span></td>
            <td><a href="${
              read_path.replace(".", "") + fileName
            }" title="Open" >${fileName}/</a></td></tr>`;
    }
    return_tag = return_tag + tag;
  });
  return_tag = ` 
  <a href="/send_files" type=button ><button>Send files</button></a>
  <main style="margin-top:40px; overflow: auto;max-height: 75vh;">
  <table>
      <thead><tr><th>Files</th></tr></thead>
        <tbody>
          ${return_tag}
         </tbody>
        </table></main>`;
  return HtmlParent(return_tag);
}

function htmlForm() {
  var return_form = `<a href="/" ><button>Get files</button></a>
  <main style="margin-top:40px">
   <form action="/file_submit" enctype="multipart/form-data" method="POST">
    <label for="file">Upload files</label>
    <input type="file" name="file" id="file" multiple />
    <h4 style="margin-left: 18px">or</h4>
    <label for="folder">Upload folder</label>
    <input type="file" name="folder" id="folder" webkitdirectory multiple /><br />
    <input
      type="submit"
      name="submit"
      onclick="replaceDiv()"
      id="submit"
      style="margin-left: 20px; margin-top: 40px"
    />
  </form>
  <div id="toReplace">
    </div>
  </main>
  <script>
  function replaceDiv() {
    document.getElementById("toReplace").innerHTML = "<div hx-get="/status" hx-trigger="every 1s"> </div>"
};
  </script>
  `;
  return HtmlParent(return_form);
}

function formatBytes(a, b = 2) {
  if (0 === a) return "0 Bytes";
  const c = 0 > b ? 0 : b,
    d = Math.floor(Math.log(a) / Math.log(1024));
  return (
    parseFloat((a / Math.pow(1024, d)).toFixed(c)) +
    " " +
    ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
  );
}
