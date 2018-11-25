var http       = require('http');
var pm2        = require('pm2');
var express    = require('express');
var basicAuth  = require('express-basic-auth')
var fs         = require('fs');
var bodyParser = require('body-parser');

/**Configurable options*/
const port = 8080;
const root = '/';
const users = {
    'admin': 'pass123'	
};
/***********************/

var app = express();
app.set('view engine', 'html');
app.use(basicAuth({ users: users, challenge: true }));
app.use(bodyParser());
//app.use(express.static(__dirname + '/View'));
//app.use(express.static(__dirname + '/Script'));

pm2.connect(function(err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }
});

app.get(root, viewProcesses);
app.post('/submit', submitChanges);
app.get('/list', listProcesses);
app.get('/start/:name', startProcess);
app.get('/stop/:name', stopProcess);
app.get('/restart/:name', restartProcess);
app.get('/logs/:name', viewLogs);

var server = app.listen(port, function() {
    var host = server.address().address;
    console.log("Listening on http://%s:%s", host, port);
});

function viewProcesses(req, res) {
    console.log(req.query);
    //res.sendFile(__dirname + '/index.html');
    //res.render('index', instances, function(err, html) {});
    pm2.list(function(err, processDescriptionList) {
        if (err) {
            console.error(err);
            process.exit(2);
        }

        var instances = processDescriptionList.map(function(x) {
            return {
                name:x.name,
                pid:x.pid,
                cpu:x.monit.cpu,
                mem:x.monit.memory,
                instances:x.pm2_env.instances,
                restarts:x.pm2_env.restart_time,
                unstable_restarts:x.pm2_env.unstable_restarts,
                uptime:x.pm2_env.pm_uptime,
                watch:x.pm2_env.watch,
                autorestart:x.pm2_env.autorestart,
				out_log_path:x.pm2_env.pm_out_log_path,
				err_log_path:x.pm2_env.pm_err_log_path,
                status:x.pm2_env.status
            };
        });

        var html = `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css"></link>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js"></script>
  </head>
  <body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <a class="navbar-brand" href="#">
          <img src="https://nr-platform.s3.amazonaws.com/uploads/platform/published_extension/branding_icon/300/PKpktytKH9.png" width="30" height="30" class="d-inline-block align-top" alt="">
          PM2ui
      </a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
  
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav mr-auto">
          <li class="nav-item active">
            <a class="nav-link" href="/">Home <span class="sr-only">(current)</span></a>
          </li>
        </ul>
      </div>
    </nav>
    <div class="container-fluid">
        <p><h1 class="text-center">Process Manager 2 UI</h1></p>
        <span class="float-right"><input type="checkbox">&nbsp;Auto-refresh</input></span>`;
        if (req.query.status !== undefined) {
            html += `<div class="alert alert-` + (req.query.status === '1' ? "danger" : "success") + `" role="alert">` + req.query.msg + `</div>`;
        }
        html += `
      <div class="table-responsive-md">
        <table class="table table-striped table-bordered table-hover">
          <thead class="thead">
            <th scope="col" class="text-center">Name</th>
            <th class="text-center">PID</th>
            <th class="text-center">CPU</th>
            <th class="text-center">Memory</th>
            <th class="text-center">Instances</th>
            <th class="text-center">Restarts</th>
            <th class="text-center">Unstable Restarts</th>
            <th class="text-center">Watch</th>
            <th class="text-center">Auto-Restart</th>
            <th class="text-center">Uptime</th>
            <th class="text-center">Status</th>
            <th class="text-center">Action</th>
          </thead>
          <tbody>`;
		
        instances.forEach(function(element) {
            html += `
            <tr>
              <td scope="row" class="text-center">` + element.name + `</td>
              <td class="text-center">` + element.pid + `</td>
              <td class="text-center">` + element.cpu + `%</td>
              <td class="text-center">` + formatNumber((element.mem / 1024) / 1024) + ` MB</td>
              <td class="text-center">` + formatNumber(element.instances) + `</td>
              <td class="text-center">` + formatNumber(element.restarts) + `</td>
              <td class="text-center">` + formatNumber(element.unstable_restarts) + `</td>
              <td class="text-center">` + (element.watch ? "Yes" : "No") + `</td>
              <td class="text-center">` + (element.autorestart ? "Yes" : "No") + `</td>
              <td class="text-center">` + formatTime(element.uptime) + `</td>
              <td class="text-` + (element.status === "online" ? "success" : "danger") + ` text-center">` + element.status + `</td>
              <td>
                <div class="btn-group" role="group" aria-label="...">
                  <a class="btn btn-success btn-default" href="/start/` + element.name + `" role="button">Start</a>
                  <a class="btn btn-danger btn-default" href="/stop/` + element.name + `" role="button">Stop</a>
                  <a class="btn btn-primary btn-default" href="/restart/` + element.name + `" role="button">Restart</a>
                  <a class="btn btn-primary btn-default" href="/logs/` + element.name + `">View Logs</a>
                  <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#` + element.name + `">Logs</button>
                </div>
              </td>
            </tr>
            <div class="modal fade" id="` + element.name + `" tabindex="-1" role="dialog">
              <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">` + element.name + ` Logs</h5>
					<h2>` + element.out_log_path + `</h2>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div class="modal-body">
                    <p><textarea class="form-control" rows="10">`;
            fs.readFile(element.out_log_path, 'utf8', function(err, contents) {
                html += contents;
            });
            html += `</textarea></p>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                  </div>
                </div>
              </div>
            </div>
			`;
        });
    		
        html += `
          </tbody>
        </table>
      </div>
    </div<
  </body>
</html>`;
        res.write(html);
        res.end();
    });
}

function listProcesses(req, res) {
    pm2.list(function(err, processDescriptionList) {
        if (err) {
            console.error(err);
            process.exit(2);
        }

        var instances = processDescriptionList.map(function(x) {
            return {
                name:x.name,
                pid:x.pid,
                cpu:x.monit.cpu,
                mem:x.monit.memory,
                instances:x.pm2_env.instances,
                restarts:x.pm2_env.restart_time,
                unstable_restarts:x.pm2_env.unstable_restarts,
                uptime:x.pm2_env.pm_uptime,
                watch:x.pm2_env.watch,
                autorestart:x.pm2_env.autorestart,
                status:x.pm2_env.status
            };
        });

        res.write(JSON.stringify(instances));
        res.end();
    });
}

function startProcess(req, res) {
    console.log("Attempting to start", req.params.name);
    pm2.start(req.params.name, function(err) {
        var url = (root === '/' ? "" : root) + '/?status&msg=';
        if (err) {
            console.error(err);
            url += err;
        } else {
            var successMsg = req.params.name + " started successfully.";
            console.log(successMsg);
            url += successMsg;
        }
        
        res.redirect(url);
        res.end();
    });
}

function stopProcess(req, res) {
    console.log("Attempting to stop", req.params.name);
    pm2.stop(req.params.name, function(err) {
        var url = (root === '/' ? "" : root) + '/?status&msg=';
        if (err) {
            console.error(err);
            url += err;
        } else {
            var successMsg = req.params.name + " stopped successfully.";
            console.log(successMsg);
            url += successMsg;
        }
        
        res.redirect(url);
        res.end();
    });
}

function restartProcess(req, res) {
    console.log("Attempting to restart", req.params.name);
    pm2.restart(req.params.name, function(err) {
        var url = (root === '/' ? "" : root) + '/?status&msg=';
        if (err) {
            console.error(err);
            url += err;
        } else {
            var successMsg = req.params.name + " restarted successfully.";
            console.log(successMsg);
            url += successMsg;
        }
        
        res.redirect(url);
        res.end();
    });
}

function viewLogs(req, res) {
    var name = req.params.name;
    pm2.describe(name, function(err, processDescription) {
        console.log(processDescription);
        if (err) {
            console.error(err);
            process.exit(2);
        }
		
        var out_log = processDescription[0].pm2_env.pm_out_log_path;
        var err_log = processDescription[0].pm2_env.pm_err_log_path;
        fs.readFile(out_log, 'utf8', function(err, contents) {
            console.log(contents);
            res.write(contents);
            res.end();
        });
    });
}

function submitChanges(req, res) {
    var body = req.body;
    console.log(body);

    var baseUrl = req.protocol + "://" + req.hostname + ":" + port;
    var url = baseUrl;
    if (body.hasOwnProperty('start')) {
        url += "/start/" + body.instance;
    } else if (body.hasOwnProperty('stop')) {
        url += "/stop/" + body.instance;
    } else if (body.hasOwnProperty('restart')) {
        url += "/restart/" + body.instance;
    } else {
        res.write("error");
        res.end();
    }
	
    http.get(url, function(resp) {
        var data = '';
        resp.on('data', function(chunk) {
            data += chunk;
        });
		
        resp.on('end', function() {
            console.log(data);
            res.write(data);
            res.end();
        });
    }).on('error', function(err) {
        console.log("Error:", err.message);
    });
}

function formatTime(timestamp) {
    // Create a new JavaScript Date object based on the timestamp
    // multiplied by 1000 so that the argument is in milliseconds, not seconds.
    var date = new Date(timestamp*1000);
    // Hours part from the timestamp
    var hours = date.getHours();
    // Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
    // Seconds part from the timestamp
    var seconds = "0" + date.getSeconds();
    
    // Will display time in 10:30:23 format
    var formattedTime = hours + 'h:' + minutes.substr(-2) + 'm:' + seconds.substr(-2) + 's';
    return formattedTime;
}

function formatNumber(number) {
    return number.toLocaleString(undefined, {maximumFractionDigits:2});
}