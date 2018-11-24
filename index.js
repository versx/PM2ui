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
    //TODO: Get list of instances or use hard coded values.
    res.sendFile(__dirname + '/index.html');
    /*
    pm2.list(function(err, processDescriptionList) {
        if (err) {
            console.error(err);
            process.exit(2);
        }
         
        var instances = processDescriptionList.map(function(x) { return x.name; });
        res.render('index', instances, function(err, html) {});
    });
    */
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
		res.write("Invalid");
	}
	
	http.get(url, function(resp) {
		var data = '';
		resp.on('data', function(chunk) {
			data += chunk;
		});
		
		resp.on('end', function() {
			console.log(data);
			res.write(data);
		});
	}).on('error', function(err) {
		console.log("Error:", err.message);
	});
	
    res.end();
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
                uptime:x.pm2_env.pm_uptime,
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
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "started successfully.");
            res.write("OK");
        }
              
        res.end();
    });
});

app.get('/stop/:name', function(req, res) {
    console.log("Attempting to stop", req.params.name);
    pm2.stop(req.params.name, function(err) {
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "stopped successfully.");
            res.write("OK");
        }
        
        res.end();
    });
});

app.get('/restart/:name', function(req, res) {
    console.log("Attempting to restart", req.params.name);
    pm2.restart(req.params.name, function(err) {
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "stopped successfully.");
            res.write("OK");
        }
        
        res.end();
    });
});

var server = app.listen(port, function() {
    var host = server.address().address;
    console.log("Listening on http://%s:%s", host, port);
});

function get(url) {
	http.get(url, function(resp) {
		var data = '';
		
		resp.on('data', function(chunk) {
			data += chunk;
		});
		
		resp.on('end', function() {
			console.log(data);
			return data;
		});
	}).on('error', function(err) {
		console.log("Error:", err.message);
	});
}

function getInstances() {
    var instances;
    pm2.list(function(err, processDescriptionList) {
        if (err) {
             console.error(err);
             process.exit(2);
        }
         
        instances = processDescriptionList.map(function(x) {
            return {
                name:x.name,
                pid:x.pid,
                cpu:x.monit.cpu,
                mem:x.monit.memory,
                uptime:x.pm2_env.pm_uptime,
                status:x.pm2_env.status
            };
        });
    });
    return instances;
}
