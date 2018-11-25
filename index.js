var http = require('http');
var pm2 = require('pm2');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.set('view engine', 'html');
app.use(bodyParser());
//app.use(express.static(__dirname + '/View'));
//app.use(express.static(__dirname + '/Script'));

var port = 8080;

pm2.connect(function(err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }
});

app.get('/test', function(req, res) {
    console.log(req.query);
    //res.sendFile(__dirname + '/index.html');
    //res.render('index', instances, function(err, html) {});
    var html = `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js"></script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
  </head>
  <body>
    <div class="container-fluid">`;
    if (req.query.status !== undefined) {
		html += `<div class="alert alert-` + (req.query.status === '1' ? "danger" : "success") + `" role="alert">` + req.query.msg + `</div>`;
    }
	html += `
      <div class="table-responsive-md">
        <table class="table table-striped table-bordered table-hover">
          <thead class="thead-dark">
            <th scope="col">Name</th>
              <th scope="col">PID</th>
              <th scope="col">CPU</th>
              <th scope="col">Memory</th>
			  <th scope="col">Instances</th>
			  <th scope="col">Restarts</th>
			  <th scope="col">Unstable Restarts</th>
			  <th scope="col">Watch</th>
			  <th scope="col">Auto-Restart</th>
              <th scope="col">Uptime</th>
              <th scope="col">Status</th>
			  <th scope="col">Action</th>
            </thead>
          <tbody>`;
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
    		
		instances.forEach(function(element) {
			html += `
			<tr>
			  <td scope="row">` + element.name + `</td>
			  <td>` + element.pid + `</td>
			  <td>` + element.cpu + `%</td>
			  <td>` + formatNumber((element.mem / 1024) / 1024) + ` MB</td>
			  <td>` + formatNumber(element.instances) + `</td>
			  <td>` + formatNumber(element.restarts) + `</td>
			  <td>` + formatNumber(element.unstable_restarts) + `</td>
			  <td>` + (element.watch ? "Yes" : "No") + `</td>
			  <td>` + (element.autorestart ? "Yes" : "No") + `</td>
			  <td>` + formatTime(element.uptime) + `</td>
			  <td class="text-` + (element.status === "online" ? "success" : "danger") + `">` + element.status + `</td>
			  <td>
				<div class="btn-group" role="group" aria-label="...">
				  <a class="btn btn-success btn-default" href="/start/` + element.name + `" role="button">Start</a>
				  <a class="btn btn-danger btn-default" href="/stop/` + element.name + `" role="button">Stop</a>
				  <a class="btn btn-primary btn-default" href="/restart/` + element.name + `" role="button">Restart</a>
				</div>
			  </td>
			</tr>`;
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
});

app.post('/submit', function(req, res) {
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
});

app.get('/list', function(req, res) {
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
});

app.get('/start/:name', function(req, res) {
    console.log("Attempting to start", req.params.name);
    pm2.start(req.params.name, function(err) {
        var url = '/test/?status&msg=';
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
});

app.get('/stop/:name', function(req, res) {
    console.log("Attempting to stop", req.params.name);
    pm2.stop(req.params.name, function(err) {
        var url = '/test/?status&msg=';
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
});

app.get('/restart/:name', function(req, res) {
    console.log("Attempting to restart", req.params.name);
    pm2.restart(req.params.name, function(err) {
        var url = '/test/?status&msg=';
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
});

var server = app.listen(port, function() {
    var host = server.address().address;
    console.log("Listening on http://%s:%s", host, port);
});

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